# KB Chat Flow - Complete Architecture Documentation

## Verified Chat Query Pipeline

### Overview
The KB chat flow implements a complete RAG (Retrieval Augmented Generation) pipeline:
1. User sends prompt → embeddings created
2. Semantic search in vector DB
3. Context retrieved
4. LLM generates response
5. Response displayed with sources

---

## Complete Step-by-Step Flow

### Step 1: Frontend sends chat message
**File**: `src/components/dashboard/knowledge-base-chat.tsx`

User clicks "Send" button with prompt text
```
User Input: "What is professional services risk management?"
```

### Step 2: Frontend calls unified client function
**File**: `src/api/kb-services-client.ts`

```typescript
await queryKnowledgeBase(applicationId, userInput, activeThreadId)
```

**What this does**:
- Calls backend `/api/knowledge-base/chat` endpoint
- Passes: applicationId, query, threadId
- NO config fetching here - backend handles it

### Step 3: Backend receives request
**File**: `backend/src/api/knowledgeBaseRoutes.ts`

```typescript
POST /api/knowledge-base/chat
Body: { applicationId, threadId, userMessage }
```

Calls: `ragQueryService.query(request)`

### Step 4: Backend fetches KB Settings using FINALIZED PATTERN
**File**: `backend/src/services/RAGQueryService.ts` (Lines 51-115)

**Step 4a**: Get Chat Completion Provider
```typescript
// Line 54: Uses LLMProviderService mapper (SAME as Test Connection)
const chatCompletionProvider = await llmProviderService.getKBChatCompletionProvider(applicationId);
```

**What this does**:
- Fetches KB config from MongoDB for applicationId
- Decrypts sensitive fields (with backward compatibility for old plain-text data)
- Maps snake_case and camelCase field names to standardized LLMConfig
- Returns configured chat completion provider
- **EXACT SAME implementation as Settings→KB Test Connection**

**Step 4b**: Extract LLM parameters
```typescript
// Line 58: Get full config
const kbConfig = await configManager.getApplicationKBConfigWithFallback(applicationId);

// Line 109: Map config to standardized format (SAME as Test Connection)
const llmConfig = llmProviderService.mapKBConfigToChatCompletion(kbConfig);

// Lines 111-112: Extract temperature and maxTokens
const finalTemperature = temperature ?? (llmConfig.temperature ?? 0.3);
const finalMaxTokens = maxTokens ?? (llmConfig.maxTokens || 1000);
```

**Settings used from KB config**:
- `kbllm_provider` (or `kbLlmProvider`) - Azure OpenAI, Claude, etc.
- `kbllm_api_key` (or `kbLlmAzureApiKey`) - Decrypted API key
- `kbllm_azure_endpoint` (or `kbLlmAzureEndpoint`) - Azure endpoint
- `kbllm_deployment` (or `azureDeploymentName`) - Deployment name (e.g., gpt-4)
- `temperature` - Model temperature from KB settings
- `maxTokens` - Max output tokens from KB settings

### Step 5: Retrieve relevant documents using semantic search
**File**: `backend/src/services/RAGQueryService.ts` (Line 70)

```typescript
const vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);
const searchResults = await vectorStore.hybridSearch(query, undefined, { k: topK });
```

### Step 6: VectorStore initializes with KB Settings for Embeddings
**File**: `backend/src/services/VectorStoreService.ts` (Lines 38-128)

**Step 6a**: Get Embeddings Provider using FINALIZED PATTERN
```typescript
// Line 57: Uses LLMProviderService mapper (SAME as Test Connection)
const embeddingsProvider = await llmProviderService.getKBEmbeddingsProvider(applicationId);

// Line 61-62: Get full config and map
const kbConfig = await configManager.getApplicationKBConfig(applicationId);
const llmConfig = llmProviderService.mapKBConfigToEmbeddings(kbConfig);
```

**What this does**:
- Fetches KB config from MongoDB for applicationId
- Decrypts sensitive fields (with backward compatibility)
- Maps field names to standardized embeddings LLMConfig
- **EXACT SAME implementation as Settings→KB Test Connection**

**Settings used from KB config**:
- `embeddingProvider` - OpenAI, Azure OpenAI, etc.
- `embedding_api_key` (or `embeddingOpenaiApiKey`) - Decrypted API key
- `embedding_azure_endpoint` (or `embeddingAzureEndpoint`) - Azure endpoint
- `embedding_api_version` - API version
- `embedding_deployment` (or `embeddingModel`) - Model name (e.g., text-embedding-3-large)

**Step 6b**: Initialize embeddings model
```typescript
// Lines 99-108: Creates embeddings instance (Azure or OpenAI)
this.embeddings = new AzureOpenAIEmbeddings({
  azureOpenAIApiKey: apiKey,
  azureOpenAIApiInstanceName: instanceName,
  azureOpenAIApiDeploymentName: deploymentName,
  azureOpenAIApiVersion: apiVersion,
});
```

### Step 7: CRITICAL - Embed the user's query
**File**: `backend/src/services/VectorStoreService.ts` (Line 270)

```typescript
const results: Document[] = await this.vectorStore!.similaritySearch(query, options.k);
```

**What LangChain does internally**:
1. Calls `this.embeddings!.embedQuery(query)` (Line 405)
2. **Re-uses the SAME embeddings model from KB settings**
3. Converts user's prompt text to vector embeddings
4. **Crucial**: Query embedding must use EXACT SAME model as document embeddings for semantic similarity to work

### Step 8: Perform semantic search in Chroma
**File**: `backend/src/services/VectorStoreService.ts` (Lines 372-389 hybridSearch)

```typescript
let results = await this.search(query, options);  // Calls similaritySearch

// Sort by relevance score
const sortedResults = results.sort((a, b) => b.relevanceScore - a.relevanceScore);
```

**What happens**:
- Query embedding compared against stored document embeddings in Chroma
- Cosine similarity calculated
- Top-K (default 5) most similar documents returned
- Results sorted by relevance score

**Example output**:
```
Document 1: relevanceScore 0.89 - "Professional services risk management..."
Document 2: relevanceScore 0.76 - "Risk assessment frameworks..."
Document 3: relevanceScore 0.72 - "Services delivery risk..."
```

### Step 9: Format context for LLM
**File**: `backend/src/services/RAGQueryService.ts` (Lines 88-104)

```typescript
const contextString = searchResults
  .map((doc, idx) => `[Document ${idx + 1}]\n${doc.content}`)
  .join('\n\n---\n\n');

const systemPrompt = "You are a helpful assistant answering questions based on provided KB documents...";

const userPrompt = `Context from knowledge base:

${contextString}

---

Question: ${query}

Please answer based on the provided context.`;
```

### Step 10: Call Chat Completion Model with KB Settings
**File**: `backend/src/services/RAGQueryService.ts` (Lines 122-127)

```typescript
if (llmConfig.provider === 'azure-openai') {
  llmResponse = await this.callAzureOpenAI(
    kbConfig, 
    systemPrompt, 
    userPrompt, 
    finalTemperature,  // From KB settings
    finalMaxTokens     // From KB settings
  );
}
```

**What Azure OpenAI receives**:
- **API Key**: From KB settings (decrypted)
- **Endpoint**: From KB settings (decrypted)
- **Deployment**: From KB settings (e.g., "gpt-4")
- **Temperature**: From KB settings (controls creativity)
- **Max Tokens**: From KB settings (output limit)
- **System Prompt**: Instructions for KB-aware answering
- **Context**: Retrieved documents from Chroma
- **User Query**: Original user prompt

### Step 11: LLM generates response
**File**: `backend/src/services/RAGQueryService.ts` (Lines 157-210 callAzureOpenAI)

Azure OpenAI processes:
- System + User prompts
- Retrieved context documents
- Settings (temperature, maxTokens)

**Returns**: Generated text response

**Example**:
```
"Based on the provided documents, Professional Services Risk Management is...
[Document 1 discusses...][Document 2 mentions...]"
```

### Step 12: Format response with sources
**File**: `backend/src/services/RAGQueryService.ts` (Lines 131-141)

```typescript
const response: RAGQueryResponse = {
  assistantMessage: llmResponse,
  contextUsed: searchResults.map((doc) => ({
    source: doc.metadata.source,
    content: doc.content.substring(0, 300) + '...',
    relevanceScore: doc.metadata.relevanceScore,
  })),
  tokensUsed: 0,
  searchResults: searchResults.length,
};
```

### Step 13: Frontend displays response
**File**: `src/components/dashboard/knowledge-base-chat.tsx`

```typescript
const result = await queryKnowledgeBase(applicationId, userInput, activeThreadId);

const assistantMessage = {
  content: result.message,
  contextUsed: result.contextSources,  // Shows sources
};

setMessages(prev => [...prev, assistantMessage]);
```

---

## Key Architectural Points

### 1. YES - We DO embed the user's query
✅ **CONFIRMED**: The embeddings model is called for the user's query in VectorStoreService.search()
- Line 405: `await this.embeddings!.embedQuery(text)`
- Uses the SAME embeddings model as document embeddings
- Enables semantic similarity search

### 2. YES - We use KB Settings consistently everywhere
✅ **CONFIRMED**: All three flows use identical patterns:

| Flow | Config Fetch | Chat Provider | Embeddings Provider |
|------|--------------|----------------|--------------------|
| Settings→KB Test Connection | `getKBChatCompletionProvider()` | `mapKBConfigToChatCompletion()` | `mapKBConfigToEmbeddings()` |
| Dashboard→KB Upload | `getKBEmbeddingsProvider()` via client | N/A | Same config used |
| Dashboard→KB Chat | `getKBChatCompletionProvider()` | `mapKBConfigToChatCompletion()` | `getKBEmbeddingsProvider()` |

### 3. NO duplicate code
✅ **CONFIRMED**: All use centralized:
- `LLMProviderService.mapKBConfigToChatCompletion()` - Single source for chat config
- `LLMProviderService.mapKBConfigToEmbeddings()` - Single source for embeddings config
- `ConfigManager.getApplicationKBConfig()` - Single source for KB settings
- `KnowledgeBaseConfigService.getConfig()` - Single source for decryption

### 4. Backward compatibility maintained
✅ **CONFIRMED**: Both ConfigManager and LLMProviderService:
- Check if credentials are encrypted (contain ':' separator)
- If encrypted: decrypt using cryptoUtil
- If plain text: return as-is (old data format)
- If decryption fails: fallback to plain text with warning

---

## Complete Data Flow Diagram

```
User Types Prompt
      ↓
Frontend: queryKnowledgeBase()
      ↓
Backend: POST /api/knowledge-base/chat
      ↓
RAGQueryService.query()
      ├─ Fetch Chat Config (getKBChatCompletionProvider)
      │  ├─ Get KB config from MongoDB
      │  ├─ Decrypt settings
      │  └─ Map to standardized LLMConfig
      │
      ├─ VectorStore.hybridSearch(query)
      │  ├─ Fetch Embeddings Config (getKBEmbeddingsProvider)
      │  │  ├─ Get KB config from MongoDB
      │  │  ├─ Decrypt settings
      │  │  └─ Map to standardized embeddings config
      │  │
      │  ├─ Initialize embeddings model
      │  │
      │  ├─ EMBED USER QUERY (embedQuery)
      │  │  └─ Creates query vector using same model as documents
      │  │
      │  ├─ Semantic search in Chroma
      │  │  └─ Compare query vector against document vectors
      │  │
      │  └─ Return top-K similar documents sorted by score
      │
      ├─ Format context from retrieved docs
      │
      ├─ Call Chat Completion Model (callAzureOpenAI)
      │  ├─ Use API key, endpoint, deployment from KB settings
      │  ├─ Use temperature, maxTokens from KB settings
      │  ├─ Send system prompt + context + user query
      │  └─ Receive LLM response
      │
      └─ Format response with source citations
            ↓
Frontend: Display response with sources
```

---

## Implementation Status

| Component | Status | Details |
|-----------|--------|---------|
| KB Settings Fetch | ✅ Complete | Uses mappers in LLMProviderService |
| Chat Config | ✅ Complete | Decrypted, field-mapped, standardized |
| Embeddings Config | ✅ Complete | Decrypted, field-mapped, standardized |
| Query Embedding | ✅ Complete | Uses embeddings model from KB settings |
| Semantic Search | ✅ Complete | Chroma with LangChain similarity search |
| Context Formatting | ✅ Complete | Documents sorted by relevance score |
| Chat Completion | ✅ Complete | Uses all KB settings for LLM call |
| Source Citations | ✅ Complete | Shows relevance scores and document content |
| Backward Compatibility | ✅ Complete | Handles old plain-text and new encrypted configs |

---

## Configuration Example

**Settings→KB Saved Configuration**:
```json
{
  "applicationId": "app-123",
  "embeddingProvider": "azure-openai",
  "embedding_api_key": "IV:encryptedKey",
  "embedding_azure_endpoint": "IV:https://encrypted...",
  "embedding_deployment": "text-embedding-3-large",
  "embedding_api_version": "2024-02-15-preview",
  "kbLlmProvider": "azure-openai",
  "kbllm_api_key": "IV:encryptedKey",
  "kbllm_azure_endpoint": "IV:https://encrypted...",
  "kbllm_deployment": "gpt-4",
  "kbllm_api_version": "2024-02-15-preview",
  "temperature": 0.7,
  "maxTokens": 2048,
  "chunkSize": 1024,
  "overlapSize": 100
}
```

**Chat Flow Usage**:
1. **VectorStore** uses: `embeddingProvider`, `embedding_api_key`, `embedding_azure_endpoint`, `embedding_deployment`
2. **RAGQueryService** uses: `kbLlmProvider`, `kbllm_api_key`, `kbllm_azure_endpoint`, `kbllm_deployment`, `temperature`, `maxTokens`
3. **Both** transparently decrypt all fields using same ConfigManager logic
