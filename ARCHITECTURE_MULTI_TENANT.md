# Multi-Tenant Architecture: Application-Specific LLM & KB Configuration

## Overview

This document explains how the RAG Evaluation Platform implements true multi-tenant isolation for LLM and Knowledge Base (KB) configurations, ensuring each application's credentials are completely isolated and cost tracking is accurate per application.

---

## Problem Solved

**Before:** When a user selected Application A in the dashboard and clicked "Evaluate Now":
1. Frontend passed `applicationId` to backend ✅
2. Backend received `applicationId` ✅
3. Backend fetched app-specific LLM config from MongoDB ✅
4. **BUT:** Backend never used the fetched config ❌
5. All evaluations used environment variables (global Azure subscription) ❌
6. Result: Wrong credentials, broken cost tracking, no true multi-tenancy

**After:** Application-specific credentials are now used for all operations.

---

## Architecture Components

### 1. Settings Pages - Application Selector

**Location:** `src/components/settings/llm-config-tab.tsx`, `src/components/settings/knowledge-base-config-tab.tsx`

**Implementation:**
- Application dropdown selector at the top of each settings tab
- Users can switch between applications independently
- Each application's configuration loads automatically when selected
- Credentials are saved per application in MongoDB

**Flow:**
```
User selects "App A" in dropdown
    ↓
Frontend calls fetch(`/api/llm-config/app/app-456`)
    ↓
Backend returns App A's saved LLM credentials
    ↓
Form pre-populates with App A's settings
    ↓
User saves changes → Updates only App A's config
```

### 2. LLM Configuration Storage

**MongoDB Collections:**
- `llmconfigs` - LLM configs per application
- `knowledgebaseconfigs` - KB configs per application

**LLMConfig Fields (Exact Parameter Names):**
```typescript
{
  applicationId: "app-456",
  provider: "azure-openai",
  
  // Exact parameter names (NEW - primary)
  api_key: "[encrypted]",                 // Azure OpenAI API Key
  azure_endpoint: "https://resource.openai.azure.com/",  // Azure endpoint URL
  api_version: "2024-02-15-preview",      // Azure API version
  deployment: "gpt-4-turbo",              // Deployment name
  skipSslVerification: false,             // Optional SSL bypass
  
  // Legacy names (for backward compatibility)
  azureApiKey: "[encrypted]",
  azureEndpoint: "https://resource.openai.azure.com/",
  azureDeploymentName: "gpt-4-turbo",
  azureApiVersion: "2024-02-15-preview",
  
  temperature: 0.7,
  maxTokens: 2048,
  isDefault: true
}
```

**KnowledgeBaseConfig Fields:**
```typescript
{
  applicationId: "app-456",
  
  // Embedding credentials (can be same or different Azure subscription)
  embeddingProvider: "azure-openai",
  embedding_api_key: "[encrypted]",       // For embeddings
  embedding_azure_endpoint: "https://...",
  embedding_api_version: "2024-02-15-preview",
  embedding_deployment: "text-embedding-3-large",
  
  // KB LLM credentials (can be same or different Azure subscription)
  kbLlmProvider: "azure-openai",
  kbllm_api_key: "[encrypted]",           // For KB responses
  kbllm_azure_endpoint: "https://...",
  kbllm_api_version: "2024-02-15-preview",
  kbllm_deployment: "gpt-4-deployment",
  
  vectorStoreType: "chroma",
  chunkSize: 512,
  temperature: 0.3
}
```

---

## Evaluation Flow - Application-Specific Config

### Complete Flow: Dashboard → Evaluation → LLM Response

**Step 1: User Selects Application & Initiates Evaluation**
```
Dashboard: User selects "App A" (applicationId: "app-456")
Dashboard: User clicks "Evaluate Now" on a raw data record
Frontend: POST /api/evaluation/end-to-end {
  applicationId: "app-456",
  sourceDocuments: [...],
  userPrompt: "...",
  llmResponse: "..."
}
```

**Step 2: Backend Fetches App-Specific Credentials**
```typescript
// In hallucinationDetectionRoutes.ts
const { applicationId, sourceDocuments, userPrompt, llmResponse } = req.body;

// CRITICAL: Fetch this app's LLM config
let appConfig = await llmConfigService.getDefaultConfig(applicationId);
// Returns: { api_key, azure_endpoint, api_version, deployment, ... }
```

**Step 3: Evaluation Operations Use App-Specific Config**
```typescript
// All three functions receive appConfig
const hallucination = await detectHallucinations(
  sourceDocuments,
  userPrompt,
  llmResponse,
  applicationId  // Passed through
);

const quality = await analyzePromptQuality(
  userPrompt,
  appConfig  // Config object passed
);

const improved = await generateImprovedPrompt(
  userPrompt,
  issues,
  targetGroundedness,
  appConfig  // Config object passed
);
```

**Step 4: Azure Client Created from App Config**
```typescript
// In HallucinationDetectionService.ts
async function callAzureOpenAI(systemPrompt, userPrompt, llmConfig?) {
  if (llmConfig && llmConfig.provider === 'azure-openai') {
    // Use app-specific credentials
    const client = createAzureOpenAIClientFromConfig(llmConfig);
    
    // Extract deployment from app config
    const deploymentId = getDeploymentNameFromConfig(llmConfig);
    
  } else {
    // Fallback to env variables (only if no config found)
    const client = getAzureOpenAIClient();
    const deploymentId = getDeploymentId();
  }
  
  // Make Azure call with app-specific credentials
  return await client.chat.completions.create({
    model: deploymentId,  // App A's deployment (gpt-4-turbo)
    messages: [...]
  });
}
```

**Result:**
- Azure OpenAI call uses `app-456`'s subscription and credentials
- Cost attributed to `app-456`'s cost center
- If different app selected: Different Azure subscription used automatically

---

## KB Context Retrieval Flow

### Vector Store Initialization - Application-Specific Config

**Location:** `backend/src/services/VectorStoreService.ts`

**Flow:**
```typescript
// When KB context is needed for application
const vectorStore = new VectorStoreService({
  collectionName: "kb_" + applicationId,
  persistDir: "/chroma_data",
  applicationId: "app-456"  // CRITICAL: Specify app
});

await vectorStore.initialize();
```

**Inside initialize():**
```typescript
// 1. Get KB config for this specific application
const kbConfig = await kbConfigService.getConfig(applicationId);

// 2. Extract embedding credentials from config
if (kbConfig.embeddingProvider === 'azure-openai') {
  // Use exact parameter names (new)
  apiKey = cryptoUtil.decrypt(kbConfig.embedding_api_key);
  endpoint = kbConfig.embedding_azure_endpoint;
  apiVersion = kbConfig.embedding_api_version;
  deploymentName = kbConfig.embedding_deployment;
}

// 3. Create embeddings client
this.embeddings = new OpenAIEmbeddings({
  apiKey: decryptedApiKey,
  baseURL: `${endpoint}/openai/deployments`,
  defaultQuery: { 'api-version': apiVersion }
});

// 4. Initialize Chroma with app-specific embeddings
this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
  collectionName: "kb_app-456"  // App-specific collection
});
```

---

## Cost Tracking & Isolation

### Per-Application Cost Attribution

| Operation | Azure Subscription Used | Cost Center |
|-----------|------------------------|------------|
| App A Evaluation | `api_key` from AppA's config | PROJ-A-EVAL |
| App A KB Embedding | `embedding_api_key` from AppA's config | PROJ-A-KB |
| App A KB Response | `kbllm_api_key` from AppA's config | PROJ-A-KB |
| App B Evaluation | `api_key` from AppB's config | PROJ-B-EVAL |
| App B KB Embedding | `embedding_api_key` from AppB's config | PROJ-B-KB |
| **Subtotal** | **Completely isolated** | **Separate** |

**Benefits:**
- Each application owner can assign costs to their own Azure subscription
- Cost tracking is accurate per application per operation type
- No cross-app cost contamination
- Billing/chargeback is precise

---

## Credential Encryption & Decryption

All sensitive credentials are encrypted when stored in MongoDB and decrypted when used.

**Storage (Encrypted):**
```javascript
api_key: "encrypted:xxxxx..."  // Encrypted in MongoDB
```

**Retrieval:**
```typescript
const config = await llmConfigService.getDefaultConfig(appId);
// Returns encrypted credentials from MongoDB

const decryptedKey = cryptoUtil.decrypt(config.api_key);
// Decrypts for use in Azure client creation

const client = new OpenAI({
  apiKey: decryptedKey,  // Decrypted key used here only
  ...
});
```

---

## Backward Compatibility

**Fallback Logic:**

1. If `applicationId` provided:
   - Fetch from MongoDB: ✅ Use saved config
   - If not found: Fall back to env variables
   
2. If no `applicationId` provided:
   - Use env variables: ✅ Works for single-app deployments

**Supported Field Names:**
```typescript
// Both work - code accepts either
app.api_key          // Exact parameter name (NEW)
app.azureApiKey      // Legacy name (OLD)

// Code checks exact names first, falls back to legacy
const key = config.api_key || config.azureApiKey;
```

---

## Configuration Checklist

When setting up a new application:

- [ ] Go to Settings → LLM tab
- [ ] Select Application from dropdown
- [ ] Enter Azure OpenAI credentials:
  - API Key
  - Endpoint URL
  - API Version (e.g., 2024-02-15-preview)
  - Deployment name (e.g., gpt-4-turbo)
- [ ] Save configuration

Then for KB:

- [ ] Go to Settings → KB tab
- [ ] Select same Application from dropdown
- [ ] Can use **same or different** Azure subscription
- [ ] Enter embedding credentials and KB LLM credentials
- [ ] Configure vector store (Chroma, etc.)
- [ ] Save configuration

---

## Testing the Multi-Tenant Setup

### Test 1: Application-Specific Evaluation
```bash
# App A evaluation
curl -X POST http://localhost:5001/api/evaluation/end-to-end \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-456",
    "sourceDocuments": ["..."],
    "userPrompt": "...",
    "llmResponse": "..."
  }'

# Should use app-456's Azure subscription
# Check logs: "[EndToEndEvaluation API] Using saved LLM config for app: app-456"
```

### Test 2: Application-Specific KB Context
```bash
# When retrieving KB context
vectorStore = new VectorStoreService({
  applicationId: "app-789",
  collectionName: "kb_app-789"
});

# Should use app-789's embedding credentials
# Embeddings use: app-789's embedding_api_key, embedding_deployment, etc.
```

### Test 3: Cost Attribution
- Run evaluation for App A → Logs show App A's config used
- Run evaluation for App B → Logs show App B's config used
- Azure bills to App A's subscription and App B's subscription separately

---

## Monitoring & Debugging

**Enable Debug Logging:**
```typescript
// In HallucinationDetectionService
console.log(`[v0] Using app-specific Azure config for app ${llmConfig.applicationId}`);

// In hallucinationDetectionRoutes
logger.info('[EndToEndEvaluation API] Using saved LLM config for app:', applicationId);

// In VectorStoreService
logger.info(`[VectorStoreService] Using saved KB embedding config for app ${this.applicationId}`);
```

**Check MongoDB:**
```bash
db.llmconfigs.find({ applicationId: "app-456" })
db.knowledgebaseconfigs.find({ applicationId: "app-456" })
```

**Check Logs:**
- Look for: "Using saved config for app"
- Look for: "Using app-specific Azure config"
- If NOT present: Falling back to env variables

---

## Migration Guide

**From Single-Tenant (Env Variables) to Multi-Tenant:**

1. Keep environment variables for backward compatibility
2. Users gradually add their apps via Settings UI
3. Each app's config is saved to MongoDB
4. Code automatically uses saved config if found
5. Fallback to env variables if not found
6. No downtime, seamless migration

---

## Security Considerations

- Credentials encrypted in MongoDB
- Each application's config isolated
- Decryption only happens at point of use
- Credentials never logged
- Application isolation enforced at database layer

