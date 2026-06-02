# RAG PIPELINE ANALYSIS - CRITICAL BUGS FOUND

## Executive Summary

The Knowledge Base Chat functionality is **COMPLETELY NON-FUNCTIONAL**. The frontend calls `/api/knowledge-base/chat` expecting a full RAG pipeline response, but this endpoint **does not exist** in the backend.

## Critical Issues

### Issue 1: MISSING ENDPOINT - `/api/knowledge-base/chat`

**Frontend Call** (line 118 of `knowledge-base-chat.tsx`):
```typescript
const response = await fetch(`${apiUrl}/api/knowledge-base/chat`, {
  method: 'POST',
  body: JSON.stringify({
    applicationId,
    threadId: activeThreadId,
    userMessage: userInput,
  }),
});
```

**Expected Response**:
```json
{
  "assistantMessage": "string",
  "contextUsed": [
    { "source": "document", "content": "..." }
  ]
}
```

**Actual Result**: 404 Not Found

**Why It's Missing**: No backend implementation of the complete RAG pipeline

### Issue 2: INCOMPLETE SEARCH IMPLEMENTATION

The `/api/knowledge-base/search` endpoint (line 182) calls `vectorStore.hybridSearch()` but:
- Vector store might not be properly initialized with KB config (see KB_CONFIG_INTEGRATION_ANALYSIS.md)
- No proper semantic search vs keyword search differentiation
- No hybrid search weights configured

### Issue 3: NO LLM INTEGRATION FOR CHAT RESPONSES

The missing chat endpoint needs to:
1. Retrieve KB config with LLM settings
2. Perform semantic search on documents
3. Format context for LLM prompt
4. Call Azure OpenAI LLM with context
5. Return formatted response with source citations

Currently there is NO code doing any of this.

### Issue 4: MISSING KB CONFIG USAGE IN CHAT

The chat endpoint should use:
- LLM config from Settings -> KB tab (llmProvider, llmModel, kbllm_api_key, kbllm_azure_endpoint, etc.)
- Temperature and maxTokens settings
- Custom system prompts (if configured)

None of this is being used because the endpoint doesn't exist.

## Data Flow (What Should Happen)

```
Frontend: User sends question
    ↓
Backend: POST /api/knowledge-base/chat
    ↓
1. Fetch KB Config (LLM + Embedding settings)
    ↓
2. Initialize Embeddings (AzureOpenAIEmbeddings)
    ↓
3. Perform Semantic Search (question → embeddings)
    ↓
4. Hybrid Search (semantic + keyword matching)
    ↓
5. Rank and Select Top K Documents
    ↓
6. Format Context with Source Citations
    ↓
7. Build LLM Prompt with KB Config settings
    ↓
8. Call Azure OpenAI API with LLM Config
    ↓
9. Parse LLM Response
    ↓
10. Add to RAG Session Chat History
    ↓
Frontend: Display response with sources
```

## Required Fixes

### 1. Create `/api/knowledge-base/chat` Endpoint

Location: `backend/src/api/knowledgeBaseRoutes.ts`

Must implement:
- Request validation (applicationId, threadId, userMessage)
- KB config retrieval
- Semantic search with proper embedding initialization
- Hybrid search (BM25 + semantic)
- Context formatting
- LLM prompt generation
- Azure OpenAI API call using KB LLM config
- Response formatting with sources
- Chat history storage

### 2. Fix VectorStore Search Methods

Current issue: `vectorStore.hybridSearch()` may not exist or work correctly

Must support:
- Semantic search (embedding-based)
- Keyword search (BM25)
- Hybrid search (combined scoring)
- Proper result ranking and filtering

### 3. Implement Proper LLM Integration

Must use:
- KB config LLM provider (azure-openai preferred)
- API key from KB config (encrypted)
- Azure endpoint from KB config
- LLM model from KB config
- Temperature and maxTokens from KB config

### 4. Add RAG Session Logging

Must track:
- Documents retrieved
- Search relevance scores
- LLM tokens used
- Response latency
- Quality metrics

## Files Affected

- `backend/src/api/knowledgeBaseRoutes.ts` - Create chat endpoint
- `backend/src/services/VectorStoreService.ts` - Ensure search methods work
- `backend/src/services/RAGServiceLayer.ts` - New service for RAG pipeline
- `src/components/dashboard/knowledge-base-chat.tsx` - Frontend (already correct)

## Status

✅ Settings -> KB Config: Works correctly (credentials stored)
✅ Dashboard -> KB Upload: Embeddings created (fixed)
❌ Dashboard -> KB Chat: BROKEN - Missing endpoint
❌ Semantic Search: Partially implemented, not integrated
❌ Hybrid Search: Not properly configured
❌ LLM Integration: Missing completely
❌ Response Generation: Not implemented
