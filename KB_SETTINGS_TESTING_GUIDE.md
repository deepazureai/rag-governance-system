# KB Settings Testing & Debugging Guide

## Complete Data Flow

### 1. **SAVE Flow** ✅ (Working)
```
Frontend Form Input
  ↓
handleSave() in KBLLMSettings.tsx
  ↓
POST /api/llm-config/kb/app/:appId (with payload: kbProvider, kbllm_*, embeddingProvider, embedding_*, temperature, maxTokens)
  ↓
Backend llmConfigRoutes.ts POST /kb/app/:appId handler
  ↓
kbConfigService.upsertConfig() 
  ↓
MongoDB KnowledgeBaseConfig collection
  ↓
Cache invalidated for this app
  ↓
Response 200 {success: true, data: savedConfig}
  ↓
Frontend displays: "KB configuration saved successfully!"
```

**What's being stored in MongoDB:**
- `applicationId`: Application being configured
- `kbLlmProvider`: 'azure-openai' | 'openai' | 'claude' | 'aws-bedrock'
- `kbllm_azure_endpoint`: Azure resource URL
- `kbllm_api_key`: API credential (84 chars for Azure)
- `kbllm_deployment`: Azure deployment name  
- `kbllm_api_version`: API version format (2025-01-01-preview)
- `embeddingProvider`: 'azure-openai' | 'openai'
- `embedding_azure_endpoint`, `embedding_api_key`, `embedding_deployment`, `embedding_api_version`: Embeddings config
- `temperature`: 0.7 (default)
- `maxTokens`: 2048 (default)
- `isDefault`: true

---

### 2. **LOAD Flow** ✅ (NOW FIXED)
```
User changes application in dropdown
  ↓
selectedApplicationId changes
  ↓
useEffect([selectedApplicationId]) triggers
  ↓
GET /api/llm-config/kb/app/:appId
  ↓
Backend retrieves config from MongoDB
  ↓
kbConfigService.getConfig(appId)
  ↓
Response {success: true, data: {...config...}}
  ↓
Frontend populates form fields:
  - setKbProvider(config.kbLlmProvider)
  - setKbFormData({kbllm_api_key, kbllm_azure_endpoint, ...})
  - setEmbeddingProvider(config.embeddingProvider)
  - setEmbeddingFormData({embedding_deployment, ...})
```

---

### 3. **VALIDATE Flow** ✅ (NOW IMPLEMENTED)
```
User clicks "Test Connection" button
  ↓
handleTestConnection() validates:
  - !selectedApplicationId → error
  - !kbProvider || !embeddingProvider → error
  ↓
POST /api/llm-config/validate/:appId (with current form values)
  ↓
Backend normalizeKBConfigFieldNames():
  Maps legacy names → standardized names
  ↓
Test KB Chat LLM Provider:
  llmProviderService.mapToChatCompletion(config)
    ↓ If Azure: Creates AzureOpenAI client with azureEndpoint, apiKey, deploymentId, apiVersion
    ↓ If OpenAI: Creates OpenAI client with apiKey
    ↓ If Claude: Creates Anthropic client with apiKey
    ↓ If AWS: Creates Bedrock client with awsRegion, accessKey, secretKey
  ✓ If successful → proceeds to embeddings test
  ✗ If fails → returns 400 {valid: false, error: "KB Chat LLM Error..."}
  ↓
Test Embeddings Provider:
  llmProviderService.mapToEmbeddings(config)
    ↓ If Azure: Creates Azure embedding client
    ↓ If OpenAI: Creates OpenAI embedding client
  ✓ If successful → returns 200 {valid: true}
  ✗ If fails → returns 400 {valid: false, error: "Embeddings Error..."}
  ↓
Frontend displays success/error message
```

---

## Parameter Mapping to Azure/OpenAI SDK

### Azure OpenAI SDK expects these parameters:

**Chat Completion Client:**
```javascript
new AzureOpenAI({
  apiKey: kbllm_api_key,        // Azure credential
  endpoint: kbllm_azure_endpoint, // https://resource.openai.azure.com
  apiVersion: kbllm_api_version,  // 2025-01-01-preview
  deploymentId: kbllm_deployment  // name of your model deployment
})
```

**Embeddings Client:**
```javascript
new AzureOpenAI({
  apiKey: embedding_api_key,
  endpoint: embedding_azure_endpoint,
  apiVersion: embedding_api_version,
  deploymentId: embedding_deployment  // e.g., text-embedding-3-small
})
```

The `mapToChatCompletion()` and `mapToEmbeddings()` functions in LLMProviderService.ts handle this mapping:
- Pulls values from form payload
- Creates appropriate SDK client
- If client creation fails → connection test fails with error message

---

## Testing Strategy

### **Test 1: Check Frontend Payload** (Browser DevTools)
```javascript
// In KBLLMSettings.tsx handleSave():
// Already logs:
console.log('[v0] Payload being sent to backend:', {
  applicationId,
  kbProvider,
  kbFormDataKeys: Object.keys(kbFormData),
  kbFormData,
  embeddingProvider,
  embeddingFormDataKeys: Object.keys(embeddingFormData),
  embeddingFormData,
});

// Steps:
// 1. Open DevTools (F12)
// 2. Fill KB Settings form
// 3. Click Save
// 4. Check Console tab for [v0] log
// 5. Verify all required fields are present
```

### **Test 2: Check MongoDB Storage** (MongoDB Compass or CLI)
```javascript
// Connect to your MongoDB
// Database: your_db
// Collection: knowledgebaseconfigs

// Query by app:
{applicationId: ObjectId("6a2abcb8c11b5e961f826449")}

// Expected fields to see:
{
  _id: ObjectId(...),
  applicationId: ObjectId(...),
  kbLlmProvider: "azure-openai",
  kbllm_api_key: "***", // encrypted in real scenario
  kbllm_azure_endpoint: "https://...",
  kbllm_deployment: "gpt-4-turbo",
  kbllm_api_version: "2025-01-01-preview",
  embeddingProvider: "azure-openai",
  embedding_azure_endpoint: "https://...",
  embedding_deployment: "text-embedding-3-small",
  embedding_api_version: "2023-05-15",
  temperature: 0.7,
  maxTokens: 2048,
  isDefault: true,
  createdAt: ISODate(...),
  updatedAt: ISODate(...)
}
```

### **Test 3: Check Backend Logs** (Docker container)
```bash
# Watch backend logs in real-time:
docker compose logs -f backend

# Look for these log sequences:

# On Save:
# [v0] KB upsertConfig starting with input: {...}
# [v0] KB normalized config keys: [...]
# [v0] KB upserting config for applicationId: ...
# [v0] KB upsert result: {acknowledged: true, ...}
# [v0] KB retrieved saved config
# [ConfigManager] Invalidated KB config cache for app: ...

# On Load (GET):
# [v0] GET /kb/app/:appId called
# [v0] Retrieved config for app: ... (19 keys)

# On Validate:
# [v0] Validation request for app, body keys: [...]
# [v0] Normalized config keys: [...]
# [v0] Testing KB provider: azure-openai
# [v0] Chat client created successfully for azure-openai
# [v0] Testing embedding provider: azure-openai
# [v0] Embedding client created successfully for azure-openai
# OR
# [v0] Chat client creation failed for azure-openai: Invalid API key
```

### **Test 4: Endpoint Verification** (cURL or Postman)

**Save Configuration:**
```bash
curl -X POST http://localhost:5001/api/llm-config/kb/app/6a2abcb8c11b5e961f826449 \
  -H "Content-Type: application/json" \
  -d '{
    "kbLlmProvider": "azure-openai",
    "kbllm_azure_endpoint": "https://resource.openai.azure.com",
    "kbllm_api_key": "sk-...",
    "kbllm_deployment": "gpt-4-turbo",
    "kbllm_api_version": "2025-01-01-preview",
    "embeddingProvider": "azure-openai",
    "embedding_azure_endpoint": "https://resource.openai.azure.com",
    "embedding_api_key": "sk-...",
    "embedding_deployment": "text-embedding-3-small",
    "embedding_api_version": "2023-05-15",
    "temperature": 0.7,
    "maxTokens": 2048
  }'
# Expected: 200 {success: true, data: {...}}
```

**Load Configuration:**
```bash
curl -X GET http://localhost:5001/api/llm-config/kb/app/6a2abcb8c11b5e961f826449
# Expected: 200 {success: true, data: {...all fields from MongoDB...}}
```

**Test Connection:**
```bash
curl -X POST http://localhost:5001/api/llm-config/validate/6a2abcb8c11b5e961f826449 \
  -H "Content-Type: application/json" \
  -d '{
    "kbProvider": "azure-openai",
    "kbllm_azure_endpoint": "https://resource.openai.azure.com",
    "kbllm_api_key": "sk-...",
    "kbllm_deployment": "gpt-4-turbo",
    "kbllm_api_version": "2025-01-01-preview",
    "embeddingProvider": "azure-openai",
    "embedding_azure_endpoint": "https://resource.openai.azure.com",
    "embedding_api_key": "sk-...",
    "embedding_deployment": "text-embedding-3-small",
    "embedding_api_version": "2023-05-15"
  }'
# Expected: 200 {valid: true, message: "...validated successfully"}
# Or: 400 {valid: false, error: "KB Chat LLM Error (azure-openai): Invalid API key"}
```

---

## Debugging Checklist

- [ ] **400 - Application ID required**: Check that `appId` param is in URL
- [ ] **404 - GET /kb/app/:appId**: Route exists now (was the bug), rebuild if still occurs
- [ ] **500 - Save fails**: Check MongoDB connection, logs for kbConfigService errors
- [ ] **Empty response on Test**: Check that `mapToChatCompletion()` and `mapToEmbeddings()` are being called
- [ ] **400 - Validation fails**: Check that API keys/endpoints are correct for the provider
- [ ] **Frontend shows "undefined"**: Check browser console for the actual error response
- [ ] **Form not loading after save**: Check that GET endpoint returns correct data structure

---

## Success Indicators

✅ **Save Works:**
- Browser shows "KB configuration saved successfully!"
- Backend logs show upsert result with `upsertedCount: 1`
- MongoDB has new document with your values

✅ **Load Works:**
- Form fields populate with saved values
- Backend logs show "Retrieved config for app" with key count

✅ **Validate Works:**
- Either "Connection test successful!" appears
- Or specific error like "KB Chat LLM Error (azure-openai): Invalid API key"
- Backend logs show both providers being tested

---

## What Test Connection Actually Tests

1. **Creates SDK clients** - Not just checking credentials format, but actually instantiating the provider SDK
2. **Validates all provider requirements** - Each provider has different required fields
3. **Returns provider-specific errors** - If Azure deployment doesn't exist, you'll see that error
4. **Doesn't make actual API calls** - Just validates that client can be created with your credentials

This is the best place to test because:
- ✓ Validates credentials before saving
- ✓ Tests both KB chat AND embeddings in one operation  
- ✓ Gives detailed error messages per provider
- ✓ Doesn't save invalid config
- ✓ Fast feedback loop - users know immediately if config is wrong
