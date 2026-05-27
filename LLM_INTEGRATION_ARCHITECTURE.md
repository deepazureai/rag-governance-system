# LLM Integration Architecture Analysis

## Overview
The RAG Evaluation Platform has two distinct services with different LLM integration approaches:

1. **Backend Evaluation Service** (Node.js/TypeScript) - For recommendations & hallucination detection
2. **Knowledge Base Service** (Node.js/TypeScript) - For embeddings & semantic search

Both are currently hardcoded to specific LLM providers but need to be made configurable.

---

## Service 1: Backend Evaluation Service (Recommendations)

### Current Architecture

**Location:** `/vercel/share/v0-project/backend/src/`

**Entry Point:** Raw Data Detail Modal → Get LLM Recommendations button
- Frontend: `src/components/dashboard/raw-data-detail-modal.tsx`
- API Call: `POST /api/evaluation/end-to-end`

**Backend Chain:**
```
raw-data-detail-modal.tsx (line 62)
    ↓
POST /api/evaluation/end-to-end (hallucinationDetectionRoutes.ts, line 143)
    ↓
HallucinationDetectionService.ts
    ↓
AzureOpenAIConfig.ts (hardcoded)
```

### Current LLM Configuration

**Provider:** Azure OpenAI (hardcoded)
**Config Source:** Environment Variables only
```
AZURE_OPENAI_API_KEY         → API key
AZURE_OPENAI_ENDPOINT        → API endpoint (e.g., https://{resource}.openai.azure.com)
AZURE_OPENAI_API_VERSION     → Default: 2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_ID   → Default: gpt-4
```

**File:** `/vercel/share/v0-project/backend/src/services/AzureOpenAIConfig.ts`
- Lines 13-31: Client initialization
- Line 34: Deployment ID retrieval
- **Problem:** No dynamic LLM provider selection - hardcoded to Azure OpenAI only

**Usage in Service:**
```typescript
// HallucinationDetectionService.ts
const client = getAzureOpenAIClient();  // Line 33
const deploymentId = getDeploymentId(); // Line 34
const response = await client.chat.completions.create({
  model: deploymentId,
  messages: [...],
  temperature: 0.2,
  max_tokens: 2000,
});
```

### Current Recommendation Flow

**Route:** `POST /api/evaluation/end-to-end` (hallucinationDetectionRoutes.ts, line 143)

**Request Payload:**
```json
{
  "sourceDocuments": ["string"],
  "userPrompt": "string",
  "llmResponse": "string",
  "targetGroundedness": 80,
  "recordId": "string"
}
```

**Processing:**
1. `detectHallucinations()` - Uses Azure OpenAI as LLM Judge
2. `analyzePromptQuality()` - Uses Azure OpenAI
3. `generateImprovedPrompt()` - Uses Azure OpenAI
4. Returns: Hallucination scores, suggestions, reasoning

**Response Structure:**
```typescript
{
  reasoning: string,
  suggestions: [{
    issue: string,
    suggestion: string,
    expectedImprovement: string,
  }]
}
```

### What's Missing

❌ **No LLM Provider Selection**
- Cannot use OpenAI, Claude, DeepInfra, or Grok
- Only Azure OpenAI works
- Need: Dynamic provider selection at evaluation time

❌ **No Configuration per Application**
- All apps use same LLM deployment
- No per-app LLM settings
- Need: Retrieve LLM config from database for each app

❌ **No Temperature/Token Settings**
- Hardcoded: `temperature: 0.2`, `max_tokens: 2000`
- No flexibility for different use cases

---

## Service 2: Knowledge Base Service (Embeddings)

### Current Architecture

**Location:** `/vercel/share/v0-project/services/knowledge-base/src/`

**Services:**
- `EmbeddingService.ts` - Generates embeddings
- `ChunkingService.ts` - Splits documents
- `IndexingService.ts` - Manages vector store

### Current LLM Configuration

**Embedding Provider:** OpenAI (hardcoded)
**Config Source:** Hard-coded in EmbeddingService constructor

**File:** `/vercel/share/v0-project/services/knowledge-base/src/services/EmbeddingService.ts`
```typescript
// Lines 20-28
if (config.model === 'openai') {
  this.embedder = new OpenAIEmbeddings({
    modelName: 'text-embedding-3-small',
    batchSize: config.batchSize,
  });
} else {
  throw new Error(`Unsupported embedding model: ${config.model}`);
}
```

**Problem:** Only supports OpenAI embeddings
- No support for other embedding models (Cohere, local, etc.)
- Model is hardcoded to `text-embedding-3-small`
- API key comes from `OPENAI_API_KEY` env var only

**Embedding Configuration Type:**
```typescript
interface EmbeddingConfig {
  model: 'sentence-transformers' | 'openai' | 'custom';
  dimension: number;        // 256-3072
  batchSize: number;        // 1-100
  temperature?: number;
}
```

### Current Flow

**Vector Store Management:**
- Type: Chroma, Pinecone, or Weaviate (configurable)
- Embeddings: Always OpenAI `text-embedding-3-small`
- Dimensions: 1536 (fixed for OpenAI)

**Multi-Session RAG (New):**
Stores per-session in MongoDB:
```typescript
interface RAGSession {
  applicationId: string;
  sessionId: string;
  embeddingProvider: 'openai' | 'cohere' | 'local';  // Not used yet
  embeddingModel: string;                            // Not used yet
  llmProvider: 'openai' | 'azure-openai' | 'claude' | 'deepinfra' | 'grok';
  llmModel: string;
}
```

**Problem:** Session config is stored but never used
- Always defaults to OpenAI embeddings regardless of session config

---

## Database Configuration Storage

### LLM Configuration Tables (Backend)

**MongoDB Collections:**

**1. `llmconfigs`** - LLM provider for recommendations
```json
{
  "_id": ObjectId,
  "applicationId": "app_123",
  "provider": "openai|azure-openai|claude|deepinfra|grok",
  "model": "gpt-4|gpt-35-turbo|claude-3-opus|...",
  "apiKey": "encrypted",
  "apiUrl": "optional (for Azure/custom)",
  "temperature": 0.2,
  "maxTokens": 2000,
  "isDefault": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**2. `knowledgebaseconfigs`** - LLM for KB embeddings
```json
{
  "_id": ObjectId,
  "applicationId": "app_123",
  "embeddingProvider": "openai|cohere|local",
  "embeddingModel": "text-embedding-3-small",
  "embeddingApiKey": "encrypted",
  "llmProvider": "openai|azure-openai|...",
  "llmModel": "gpt-4",
  "llmApiKey": "encrypted",
  "chunkSize": 1000,
  "overlapSize": 100,
  "vectorStoreType": "chroma|pinecone|weaviate",
  "temperature": 0.7,
  "maxTokens": 2000,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**3. `ragsessions`** - Per-session configuration (new)
```json
{
  "_id": ObjectId,
  "applicationId": "app_123",
  "sessionId": "sess_abc123",
  "embeddingProvider": "openai",
  "embeddingModel": "text-embedding-3-small",
  "llmProvider": "openai",
  "llmModel": "gpt-4",
  "vectorStoreId": "chroma_store_123",
  "chatHistory": [
    { role: "user|assistant", message: "...", timestamp: "..." }
  ],
  "uploadedFiles": ["file1.pdf", "file2.docx"],
  "totalChunks": 150,
  "totalQueries": 25,
  "tokensUsed": 5000,
  "isActive": true,
  "lastAccessedAt": "2024-01-01T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### API Endpoints for Configuration

**Setting LLM Config:**
```
POST /api/llm-config/app/:applicationId
Request: { provider, model, apiKey, temperature, maxTokens }
Response: { success, data: LLMConfig }
```

**Getting LLM Config:**
```
GET /api/llm-config/app/:applicationId
Response: { success, data: LLMConfig }
```

**Setting KB Config:**
```
POST /api/llm-config/knowledge-base/:applicationId
Request: { embeddingProvider, embeddingModel, llmProvider, llmModel, ... }
Response: { success, data: KnowledgeBaseConfig }
```

---

## Current Issues & Missing Pieces

### Issue 1: Recommendations Always Use Azure OpenAI

**Current Code Flow:**
```
raw-data-detail-modal.tsx
  → POST /api/evaluation/end-to-end
    → HallucinationDetectionService.detectHallucinations()
      → getAzureOpenAIClient() (HARDCODED)
```

**Where to Add LLM Selection:**
1. Recommendations endpoint should query `llmconfigs` table for app's LLM
2. Route at `/api/evaluation/end-to-end` should:
   - Get `applicationId` from request
   - Query `db.collection('llmconfigs').findOne({ applicationId })`
   - Build LLM client based on provider (OpenAI, Claude, DeepInfra, etc.)
   - Pass client to `HallucinationDetectionService`

**Files to Modify:**
- `backend/src/api/hallucinationDetectionRoutes.ts` (line 143)
- `backend/src/services/HallucinationDetectionService.ts` (line 29)
- `backend/src/services/AzureOpenAIConfig.ts` (create generic LLM factory)

---

### Issue 2: Knowledge Base Always Uses OpenAI Embeddings

**Current Code Flow:**
```
EmbeddingService constructor
  → config.model === 'openai' (ALWAYS)
    → new OpenAIEmbeddings() (HARDCODED)
```

**Where to Add LLM Selection:**
1. KB Service should query `knowledgebaseconfigs` on startup per app
2. EmbeddingService constructor should:
   - Get `embeddingProvider` from KB config
   - Build embedder for that provider (OpenAI, Cohere, etc.)
   - Store both embedding and LLM clients

**Files to Modify:**
- `services/knowledge-base/src/services/EmbeddingService.ts` (line 20)
- Create `services/knowledge-base/src/services/LLMClientFactory.ts`

---

### Issue 3: No Multi-Session LLM Context

**Current Gap:**
Multi-session RAG stores config in database but never uses it
```
RAGSession.embeddingProvider   → never read
RAGSession.llmProvider         → never read
RAGSession.llmModel           → never read
```

**Where to Add:**
1. When session is loaded for chat, retrieve LLM config
2. Use session's LLM provider for that session's responses
3. Different sessions can use different LLMs

---

## Configuration Flow (Desired Future State)

### For Recommendations (Raw Data Detail Modal)

```
1. User clicks "Get LLM Recommendations"
   ↓
2. raw-data-detail-modal.tsx
   POST /api/evaluation/end-to-end
   Body: { applicationId, sourceDocuments, userPrompt, llmResponse }
   ↓
3. hallucinationDetectionRoutes.ts
   Query: db.llmconfigs.findOne({ applicationId })
   ↓
4. Build LLM client based on config.provider:
   - If 'openai' → new OpenAI(apiKey)
   - If 'azure-openai' → new OpenAI(azureConfig)
   - If 'claude' → new Anthropic(apiKey)
   - If 'deepinfra' → new DeepInfra(apiKey)
   - If 'grok' → new Grok(apiKey)
   ↓
5. HallucinationDetectionService.detectHallucinations(llmClient, ...)
   ↓
6. Return recommendations using selected LLM
```

### For Knowledge Base (Embeddings)

```
1. RAG Session is created
   ↓
2. Query: db.knowledgebaseconfigs.findOne({ applicationId })
   ↓
3. Initialize EmbeddingService with config:
   - Build embedder for embeddingProvider (OpenAI, Cohere, etc.)
   - Store LLM client for embeddingProvider
   ↓
4. Upload documents → Chunk → Embed using selected embedder
   ↓
5. Store embeddings in vector store (Chroma, Pinecone, etc.)
   ↓
6. Session can use different LLM for chat (separate config)
```

---

## Settings UI Integration

### Where LLM Selection is Currently Set

**Frontend:**
- Settings → LLM Configuration Tab (NEW)
  - File: `src/components/settings/llm-config-tab.tsx`
  - Allows: Provider selection, model, API key, temperature, max tokens
  
- Settings → Knowledge Base Configuration Tab (NEW)
  - File: `src/components/settings/knowledge-base-config-tab.tsx`
  - Allows: Embedding provider, LLM provider, vector store type

### Settings Flow

```
1. User goes to Settings → LLM Configuration
2. Selects provider (OpenAI, Azure OpenAI, Claude, DeepInfra, Grok)
3. Enters API key and model name
4. Clicks "Save LLM Configuration"
   ↓
5. POST /api/llm-config/app/{appId}
   Body: { provider, model, apiKey, temperature, maxTokens }
   ↓
6. Backend stores in db.llmconfigs
   ↓
7. Recommendations endpoint now reads from this config
```

---

## Summary: What's Implemented vs What's Missing

| Feature | Recommendation Flow | KB Flow | Status |
|---------|-------------------|---------|--------|
| Settings UI for LLM selection | ✅ llm-config-tab.tsx | ✅ knowledge-base-config-tab.tsx | IMPLEMENTED |
| Database schema for config | ✅ LLMConfig, KnowledgeBaseConfig | ✅ KnowledgeBaseConfig | IMPLEMENTED |
| API endpoints to save config | ✅ POST /api/llm-config/app | ✅ POST /api/llm-config/knowledge-base | IMPLEMENTED |
| API endpoints to read config | ✅ GET /api/llm-config/app | ✅ GET /api/llm-config/knowledge-base | IMPLEMENTED |
| **Dynamic LLM client selection** | ❌ HARDCODED to Azure OpenAI | ❌ HARDCODED to OpenAI | **NEEDS IMPLEMENTATION** |
| **Pass config to services** | ❌ Not passed to HallucinationDetectionService | ❌ Not passed to EmbeddingService | **NEEDS IMPLEMENTATION** |
| **Support multiple providers** | ❌ Only Azure OpenAI works | ❌ Only OpenAI works | **NEEDS IMPLEMENTATION** |
| Multi-session LLM context | ✅ Stored in RAGSession | ✅ Stored in RAGSession | IMPLEMENTED (but not used) |

---

## Next Steps to Complete Integration

### Backend (Recommendations)
1. Create `LLMClientFactory.ts` to build LLM clients by provider
2. Modify `hallucinationDetectionRoutes.ts` to query LLM config and use factory
3. Update `HallucinationDetectionService` to accept LLM client as parameter
4. Add error handling for missing/invalid API keys

### Knowledge Base Service
1. Modify `EmbeddingService.ts` to support multiple embedding providers
2. Create `EmbeddingClientFactory.ts` for provider abstraction
3. Query `knowledgebaseconfigs` on session creation
4. Use selected embedding provider for document processing

### Database Initialization
1. Ensure `llmconfigs` collection has indexes on `applicationId`
2. Ensure `knowledgebaseconfigs` collection has indexes on `applicationId`
3. Create default configs for new applications

### Error Handling
1. Handle missing LLM configuration (fallback to defaults)
2. Handle invalid API keys (validate on save)
3. Handle provider-specific errors (rate limits, model not found, etc.)
4. Log all LLM API calls for debugging
