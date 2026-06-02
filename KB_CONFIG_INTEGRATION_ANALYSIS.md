# KB CONFIG INTEGRATION ANALYSIS - DETAILED BUG REPORT

## CRITICAL FINDING: Knowledge Base Embeddings NOT Using KB Config

### Issue Summary
The Dashboard → Knowledge Base module's document upload and embedding creation are **NOT properly integrated** with the Settings → KB config that users configure. Multiple critical bugs prevent Azure OpenAI credentials from being used during embedding creation.

---

## BUG #1: Incorrect OpenAIEmbeddings Initialization for Azure

**Location**: `backend/src/services/VectorStoreService.ts`, lines 87-90

**Current Code**:
```typescript
this.embeddings = new OpenAIEmbeddings({
  apiKey: apiKey,
  model: deploymentName,
} as any);
```

**Problem**:
- OpenAIEmbeddings is initialized with only `apiKey` and `model`
- For Azure OpenAI, it requires ADDITIONAL parameters:
  - `azureOpenAIApiKey` (not just `apiKey`)
  - `azureOpenAIApiInstanceName` (extracted from endpoint)
  - `azureOpenAIApiDeploymentName` (the deployment)
  - `azureOpenAIApiVersion` (the version)
- Current initialization defaults to standard OpenAI API, not Azure

**Expected Behavior**:
Should detect Azure provider and initialize with Azure-specific config:
```typescript
if (usingAzure) {
  this.embeddings = new AzureOpenAIEmbeddings({
    azureOpenAIApiKey: apiKey,
    azureOpenAIApiInstanceName: extractInstanceName(endpoint),
    azureOpenAIApiDeploymentName: deploymentName,
    azureOpenAIApiVersion: apiVersion,
  });
}
```

**Impact**: ❌ **CRITICAL** - Embeddings fail or use wrong endpoint

---

## BUG #2: KB Config Field Names Correct But Need to Verify Decryption

**Location**: `backend/src/services/VectorStoreService.ts`, lines 58-69

**Current Code** (CORRECT field names):
```typescript
if (kbConfig.embedding_api_key) {
  apiKey = cryptoUtil.decrypt(kbConfig.embedding_api_key);
}
```

**Status**: ✅ CORRECT - Field names match schema and decryption is applied

**Remaining Issue**: Depends on BUG #1 fix to actually use these credentials in embeddings

---

## BUG #3: Missing Azure Endpoint Parameter Parsing

**Location**: `backend/src/services/VectorStoreService.ts`, lines 61-68

**Problem**:
- Endpoint like `https://my-resource.openai.azure.com` is stored but not parsed
- Azure needs `azureOpenAIApiInstanceName` extracted from endpoint (e.g., `my-resource`)
- Currently just passes raw endpoint to incorrectly initialized embeddings

**Example**:
- Input endpoint: `https://my-resource.openai.azure.com`
- Should extract: `my-resource`
- Used in: `azureOpenAIApiInstanceName: "my-resource"`

**Impact**: ❌ **CRITICAL** - Azure embeddings API calls fail with malformed instance name

---

## BUG #4: No Fallback or Error When KB Config Missing

**Location**: `backend/src/services/VectorStoreService.ts`, lines 83-85

**Current Code**:
```typescript
if (!apiKey || !endpoint) {
  throw new Error('Azure OpenAI credentials not configured...');
}
```

**Problem**:
- Error message is good but doesn't distinguish between:
  - KB config not set (user hasn't configured Settings → KB)
  - Environment variables not set
  - KB config set but credentials missing

**Impact**: ⚠️ **MODERATE** - Confusing error messages for users

---

## Integration Data Flow (Current vs Expected)

### Current (BROKEN):
```
1. User uploads document in Dashboard → KB
2. KnowledgeBaseUpload calls POST /api/knowledge-base/upload
3. Backend calls getVectorStore(appId)
4. VectorStoreService.initialize():
   ✅ Retrieves KB config from MongoDB
   ✅ Decrypts Azure credentials
   ❌ FAILS: Creates OpenAIEmbeddings (not AzureOpenAIEmbeddings)
   ❌ FAILS: Doesn't pass Azure parameters correctly
5. Embeddings fail or use wrong API
```

### Expected (CORRECT):
```
1. User uploads document in Dashboard → KB
2. KnowledgeBaseUpload calls POST /api/knowledge-base/upload
3. Backend calls getVectorStore(appId)
4. VectorStoreService.initialize():
   ✅ Retrieves KB config from MongoDB
   ✅ Decrypts Azure credentials
   ✅ Detects Azure provider
   ✅ Parses endpoint to instance name
   ✅ Creates AzureOpenAIEmbeddings with all Azure parameters
   ✅ Embeddings created successfully with user's Azure account
5. Documents indexed with embeddings in Chroma
```

---

## Settings → KB Config Status

**Status**: ✅ **COMPLETE & WORKING**
- Saves Azure credentials correctly
- Encrypts sensitive fields
- Retrieves config per application
- Field names match schema exactly
- No functional bugs in configuration itself

**Issue**: KB config is saved correctly but **not being used properly** by VectorStoreService

---

## Files That Need Fixes

### 1. `backend/src/services/VectorStoreService.ts` - CRITICAL
- Fix OpenAIEmbeddings initialization (BUG #1, #3)
- Add AzureOpenAIEmbeddings import
- Parse endpoint to instance name
- Better error messages (BUG #4)

### 2. `backend/src/api/knowledgeBaseRoutes.ts` - DEPENDS ON FIX
- Once VectorStoreService fixed, embeddings should work
- No changes needed here if BUG #1 fixed

### 3. `src/components/dashboard/knowledge-base-upload.tsx` - OK
- Currently working - passes applicationId to backend
- No changes needed

---

## Summary

| Component | Status | Issue |
|-----------|--------|-------|
| **Settings → KB Config** | ✅ WORKING | Saves/loads Azure credentials correctly |
| **KB Upload Component** | ✅ WORKING | Passes applicationId correctly |
| **VectorStoreService Initialize** | ❌ BROKEN | Wrong embeddings initialization |
| **Azure Endpoint Parsing** | ❌ BROKEN | Endpoint not parsed to instance name |
| **Document Embedding** | ❌ BROKEN | Fails due to VectorStoreService bugs |
| **End-to-End Integration** | ❌ BROKEN | Knowledge Base embeddings don't use KB config |

---

## Recommended Fixes (In Order)

1. **CRITICAL**: Import AzureOpenAIEmbeddings in VectorStoreService
2. **CRITICAL**: Add Azure endpoint → instance name parser
3. **CRITICAL**: Conditionally initialize AzureOpenAIEmbeddings when Azure provider detected
4. **MODERATE**: Improve error messages to guide users to Settings → KB
