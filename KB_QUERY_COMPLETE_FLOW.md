# Knowledge Base Query Complete Flow - End-to-End Architecture

## Overview
This document traces the complete flow of a KB Chat query from user input through to the displayed response, verifying that embeddings are created, searched against Chroma DB, and results are passed to the LLM.

---

## Complete Query Flow

### STEP 1: User Sends Query (Frontend)
**Location**: Dashboard → Knowledge Base → Chat tab
**File**: `src/components/dashboard/knowledge-base-chat.tsx`

```
User Types: "What is the risk level?"
User Clicks: Send Button
```

### STEP 2: Frontend Calls Backend via Centralized Client
**Location**: `src/api/kb-services-client.ts` - `queryKnowledgeBase()` function
**Process**:
1. Fetches KB config (Temperature, MaxTokens, etc.)
2. Sends POST request to `/api/knowledge-base/query`
3. Payload includes:
   - `applicationId` - Filter results to this app only
   - `query` - User's question text
   - `threadId` - Optional conversation thread
   - `temperature` - From KB Settings
   - `maxTokens` - From KB Settings

```
POST /api/knowledge-base/query
{
  "applicationId": "app_1781185720214_c2m6vhq5e",
  "query": "What is the risk level?",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

### STEP 3: Backend Receives Query and Starts RAG Pipeline
**Location**: `backend/src/api/knowledgeBaseRoutes.ts` - POST `/query` handler
**File**: `/api/knowledge-base/query`

Routes to: `RAGQueryService.query()` in `backend/src/services/RAGQueryService.ts`

### STEP 4: Get Chat Completion LLM Provider (From KB Settings)
**Location**: `RAGQueryService.ts` Line 54
**Process**:
```typescript
const chatCompletionProvider = await llmProviderService.getKBChatCompletionProvider(applicationId);
```

**Uses Finalized Pattern**:
- Calls same mapper as Settings→KB Test Connection
- Fetches from MongoDB (KnowledgeBaseConfig collection)
- Extracts fields:
  - `kbLlmProvider` - e.g., "azure-openai"
  - `kbllm_api_key` - Decrypted automatically
  - `kbllm_azure_endpoint` - Decrypted automatically
  - `kbllm_deployment` - e.g., "gpt-4"
  - `temperature` - Override parameter
  - `maxTokens` - Override parameter

### STEP 5: Initialize Vector Store with Embeddings Provider
**Location**: `RAGQueryService.ts` Line 70-71
**Process**:
```typescript
const vectorStore = await getVectorStore('knowledge-base', applicationId);
```

**VectorStoreService.initialize()** does:
1. Calls `llmProviderService.getKBEmbeddingsProvider(applicationId)`
2. Uses same mapper as Settings→KB Test Connection
3. Fetches from MongoDB:
   - `embeddingProvider` - e.g., "azure-openai"
   - `embedding_api_key` - Decrypted automatically
   - `embedding_azure_endpoint` - Decrypted automatically
   - `embedding_deployment` - e.g., "text-embedding-3-large"
   - `embedding_api_version` - e.g., "2024-02-15-preview"

---

## STEP 6: CRITICAL - Embed User Query

**Location**: `VectorStoreService.ts` - `search()` method Line 270
**File**: `backend/src/services/VectorStoreService.ts`

```typescript
// ⭐ THIS IS WHERE QUERY EMBEDDINGS ARE CREATED ⭐
const results: Document[] = await this.vectorStore!.similaritySearch(query, options.k);
```

**What Happens Inside LangChain's similaritySearch()**:
1. LangChain calls: `this.embeddings!.embedQuery(text)` (Line 405)
2. This sends the query to Azure OpenAI Embeddings API
3. Returns vector embedding in same space as document embeddings
4. Embeddings model used: Same model stored in KB settings
   - e.g., `text-embedding-3-large`
   - Same model used for document embedding during upload

**Result**: User's query now in vector form, comparable to stored embeddings

---

## STEP 7: Hybrid Search in Chroma DB

**Location**: `RAGQueryService.ts` Line 71-74
**Process**:
```typescript
const searchResults: DocumentChunk[] = await vectorStore.hybridSearch(query, { 
  applicationId,      // ← Filter by application ID
  namespace: 'default' // ← Filter by namespace
}, { k: 5 });         // ← Return top-5 most similar
```

**Flow Inside hybridSearch()**:
1. Calls `search(query)` which invokes LangChain's `similaritySearch()`
2. LangChain performs cosine similarity search:
   - Query embedding vs. all document embeddings in Chroma
   - Returns top-K documents ranked by relevance score
3. Applies metadata filters:
   - Only returns docs where `metadata.applicationId === applicationId`
   - Only returns docs where `metadata.namespace === 'default'`
4. Sorts results by relevance score (highest first)

**Result**: 
- Top 5 most relevant document chunks for this query
- From this specific application only
- With relevance scores (0.0 to 1.0)

**Example Output**:
```
[Document 1] - Relevance: 0.89
Content: "The risk level is determined by multiple factors including..."

[Document 2] - Relevance: 0.76
Content: "Risk assessment follows these guidelines..."

[Document 3] - Relevance: 0.72
Content: "Different risk levels require different..."
```

---

## STEP 8: Format Context for LLM

**Location**: `RAGQueryService.ts` Lines 95-111
**Process**:
```typescript
// Combine all retrieved documents into a single context string
const contextString = searchResults
  .map((doc: DocumentChunk, idx: number) => `[Document ${idx + 1}]\n${doc.content}`)
  .join('\n\n---\n\n');

// Create system prompt (tells LLM how to behave)
const systemPrompt = `You are a helpful assistant answering questions based on provided knowledge base documents. 
Always base your answers on the provided context...`;

// Create user prompt (actual question with context)
const userPrompt = `Context from knowledge base:

${contextString}

---

Question: ${query}

Please answer the question based on the provided context...`;
```

**What's Passed to LLM**:
- **System**: Instructions for behavior
- **Context**: The actual text from Chroma DB (retrieved documents)
- **User Query**: The original question
- All KB settings applied: Temperature, MaxTokens

---

## STEP 9: Call Chat Completion Model

**Location**: `RAGQueryService.ts` Lines 129-131
**Process**:
```typescript
if (llmConfig.provider === 'azure-openai') {
  llmResponse = await this.callAzureOpenAI(
    kbConfig,          // KB Config from MongoDB
    systemPrompt,      // System instructions
    userPrompt,        // Context + Question
    finalTemperature,  // From KB settings
    finalMaxTokens     // From KB settings
  );
}
```

**Azure OpenAI API Call**:
```http
POST https://{azure-endpoint}/openai/deployments/{deployment}/chat/completions?api-version={api-version}

Headers:
  Content-Type: application/json
  api-key: {kbllm_api_key}

Body:
{
  "messages": [
    { "role": "system", "content": "You are a helpful assistant..." },
    { "role": "user", "content": "Context: [Document 1]...\n\nQuestion: What is the risk level?" }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "deployment": "gpt-4"
}
```

**LLM Processing**:
1. Azure OpenAI receives system prompt + context + question
2. Model generates response based on provided context only
3. Returns well-formatted NLP response

**Example Response**:
```
"Based on the documents provided, the risk level is determined by several key factors..."
```

---

## STEP 10: Format Response with Source Citations

**Location**: `RAGQueryService.ts` Lines 139-154
**Process**:
```typescript
const response: RAGQueryResponse = {
  assistantMessage: llmResponse,              // LLM's answer
  contextUsed: searchResults.map((doc) => ({
    source: doc.metadata.source,              // Document name
    content: doc.content.substring(0, 300),   // First 300 chars
    relevanceScore: doc.metadata.relevanceScore // 0.0-1.0 score
  })),
  tokensUsed: tokensUsed,
  searchResults: searchResults.length,
};
```

**Response Structure**:
```json
{
  "assistantMessage": "Based on the knowledge base documents...",
  "contextUsed": [
    {
      "source": "Context Chunk.pdf",
      "content": "The risk level is determined by multiple factors...",
      "relevanceScore": 0.89
    },
    {
      "source": "Risk Guidelines.pdf",
      "content": "Risk assessment follows these guidelines...",
      "relevanceScore": 0.76
    }
  ],
  "tokensUsed": 245,
  "searchResults": 2
}
```

---

## STEP 11: Frontend Receives and Displays Response

**Location**: `src/components/dashboard/knowledge-base-chat.tsx`
**Process**:
1. Frontend receives response from backend
2. Displays LLM response in chat window
3. Shows source documents with relevance scores
4. Updates conversation history

**User Sees**:
- LLM's well-constructed answer
- Which documents were used (with relevance scores)
- Clickable source citations

---

## Complete Data Flow Summary

```
User Query (Plain Text)
    ↓
[STEP 2] Frontend sends query to backend
    ↓
[STEP 3] Backend receives query request
    ↓
[STEP 4] Load Chat Completion LLM config from MongoDB
    ↓
[STEP 5] Initialize Vector Store with Embeddings provider
    ↓
[STEP 6] ⭐ EMBED USER QUERY ⭐
    Query text → Azure Embeddings API → Query Vector
    ↓
[STEP 7] SEARCH CHROMA DB with Query Vector
    Query Vector + applicationId + namespace filters → Similar Documents
    Chroma returns top-5 most relevant chunks (with relevance scores)
    ↓
[STEP 8] Format Retrieved Document Text as Context
    Documents text content → Formatted context string
    ↓
[STEP 9] Call Chat Completion LLM
    System Prompt + Context (actual text) + Question → Azure OpenAI API
    ↓
[STEP 10] LLM generates well-formatted response
    Response + Source citations + Relevance scores
    ↓
[STEP 11] Frontend displays response to user
    LLM answer + source documents + scores visible in chat
```

---

## Key Architectural Points

### YES - Embeddings ARE Created for Query
✓ `VectorStoreService.search()` → `similaritySearch()` → `embedQuery()` calls Azure Embeddings API
✓ User query converted to vector in SAME SPACE as document embeddings
✓ Uses SAME embeddings model (e.g., text-embedding-3-large)

### YES - Search IS Filtered by applicationId
✓ `hybridSearch()` receives filters: `{ applicationId, namespace: 'default' }`
✓ Only returns documents belonging to this application
✓ Prevents cross-contamination between apps

### YES - Retrieved Text IS Passed to LLM
✓ Document chunks (actual text) formatted into `contextString`
✓ `contextString` included in `userPrompt`
✓ Entire prompt (system + context + question) sent to Azure OpenAI
✓ LLM generates response based on context

### YES - KB Settings Control Both Embeddings and Chat
✓ Embeddings model from KB settings (e.g., text-embedding-3-large)
✓ Chat model from KB settings (e.g., gpt-4)
✓ Temperature and MaxTokens from KB settings
✓ Both use same mapper as Settings→KB Test Connection

### YES - Chroma DB Stores Embeddings by applicationId
✓ Documents stored with metadata: `{ applicationId, namespace, source, ... }`
✓ Search filters by applicationId to find correct embeddings
✓ Hybrid search combines vector similarity + metadata filters
✓ Multi-tenant safe - apps don't see each other's data

---

## Performance Characteristics

| Step | Operation | Time Est. |
|------|-----------|-----------|
| 2 | HTTP request to backend | ~10-50ms |
| 4 | Fetch KB config from MongoDB | ~5-20ms |
| 5 | Initialize vector store | ~5-10ms |
| 6 | Embed user query (Azure API) | 100-500ms |
| 7 | Search Chroma DB | ~50-200ms |
| 8 | Format context | ~1-5ms |
| 9 | Call Azure OpenAI (gpt-4) | 1-10 seconds |
| 10 | Format response | ~1-5ms |
| 11 | Render in frontend | ~10-50ms |
| **Total** | **Full KB Chat Query** | **~1-15 seconds** |

---

## Testing Verification

To verify this flow is working:

1. **Upload a document** → Successfully stored in Chroma
   - Check backend logs: "Successfully added X documents to collection"
   - Check Upload & Manage tab: Document shows "Complete" status

2. **Send a query related to uploaded content**
   - Should find relevant documents (non-zero search results)
   - Should return LLM answer based on context
   - Should display source documents with relevance scores

3. **Send a query with no matching documents**
   - Should show message: "No relevant documents found"
   - Check backend logs: "No relevant documents found for query"
   - Verify this comes from applicationId/namespace filters

4. **Check KB Settings match what's being used**
   - Settings → LLM → Knowledge Base tab
   - Query should use those exact settings
   - Embeddings model should match
   - Chat model should match

---

## Troubleshooting

| Issue | Likely Cause | Check |
|-------|-------------|-------|
| "Query failed: Not Found" | Empty results from Chroma | 1. Documents uploaded? 2. Namespace mismatch? 3. applicationId filter? |
| Wrong LLM used | KB config not loaded | Check Settings→LLM for KB tab |
| Wrong embeddings model | KB config not loaded | Check Settings→LLM for KB tab |
| High latency | Azure API slow | Check Azure OpenAI metrics |
| "No relevant documents" | Query doesn't match content | Try different search terms |
| Processing stuck | Embedding API timeout | Check Azure API health |

---

## Conclusion

The complete flow is:
1. ✓ Query received
2. ✓ Query embedded using KB settings embeddings model
3. ✓ Embeddings searched in Chroma DB filtered by applicationId
4. ✓ Retrieved text passed to LLM with context
5. ✓ LLM generates well-formatted response
6. ✓ Response displayed with source citations

All steps use KB settings as the single source of truth for LLM configurations, embeddings models, and parameters.
