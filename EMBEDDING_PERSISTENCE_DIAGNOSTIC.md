# Embedding Persistence and Caching Diagnostics Guide

## Problem Statement

Documents uploaded to KB Upload & Manage tab were being stored in MongoDB (filename recorded), but embeddings were NOT being persisted to Chroma DB. This meant:
- Uploading same document 6 times only created 6 MongoDB records
- NO embeddings in Chroma DB for any of the uploads
- KB Chat queries had no documents to search against
- Complete data loss of embedding vectors

## Solution Architecture

### 1. Upload Pipeline: Document → Chunks → Chroma DB

```
User uploads document
  ↓
File parsed & cleaned
  ↓
Document smart-chunked (size: 1000, overlap: 200)
  ↓
Chunks enriched with metadata (applicationId, namespace, keyTerms)
  ↓
Vector store initialized for app-{applicationId} collection
  ↓
✓ addDocuments() called → Chunks sent to Chroma DB
  ↓
Document record saved to MongoDB (for UI)
  ↓
File cleaned up from /uploads directory
```

### 2. Vector Store Singleton Cache Pattern

```
First Upload:
  - getVectorStore("app-{appId}") called
  - Instance NOT in memory cache
  - NEW VectorStoreService instance created
  - Chroma connection established
  - Instance cached in Map: vectorStoreInstances[appId]
  - addDocuments() persists to Chroma
  ✓ SUCCESS: Embeddings stored

Second Upload:
  - getVectorStore("app-{appId}") called
  - Instance FOUND in memory cache
  - Return cached instance (fast)
  - addDocuments() appends to existing collection
  ✓ SUCCESS: More embeddings added
```

### 3. Query Pipeline: Check Cache → Load Embeddings → Search

```
User sends KB Chat query
  ↓
getVectorStore("app-{appId}") called
  ↓
IF instance in memory cache:
  ✓ Use cached instance (fast)
ELSE:
  → Initialize new instance
  → Lazy load from Chroma DB (if collection exists)
  ↓
vectorStore.hybridSearch() executed
  ↓
Search against Chroma collection with filters:
  - applicationId: matches request app
  - namespace: 'default'
  ↓
Metadata filtering removes non-matching docs
  ↓
Results sorted by relevanceScore
  ↓
Results returned for LLM context window
  ✓ SUCCESS: Found matching embeddings
```

## Log Analysis Guide

### Upload Success Indicators

```
[KnowledgeBase] Starting upload for app app_1781185720214_c2m6vhq5e, 1 files
[KnowledgeBase] Processing upload: Context-Chunk.pdf
[KnowledgeBase] Adding 1 chunks to vector store for Context-Chunk.pdf...
[KnowledgeBase] Collection name: app-app_1781185720214_c2m6vhq5e, Namespace: default
[VectorStoreService] Vector store NOT in cache for app: app_1781185720214_c2m6vhq5e, initializing...
[VectorStoreService] Creating new VectorStoreService instance for collection: app-app_1781185720214_c2m6vhq5e
[VectorStoreService] Initializing vector store connection to Chroma...
[VectorStoreService] ✓ Vector store cached in memory for app: app_1781185720214_c2m6vhq5e
[VectorStoreService] ✓ Successfully added 1 documents to collection in 523ms
[KnowledgeBase] ✓ Successfully vectorized Context-Chunk.pdf: 1 chunks added to Chroma in 523ms
[KnowledgeBase] Document chunks stored in collection: app-app_1781185720214_c2m6vhq5e
[KnowledgeBase] Saved document record for Context-Chunk.pdf with ID doc-1718513500000-abc123
```

**Key Success Signals:**
- ✓ Successfully added X documents to collection in Yms
- ✓ Successfully vectorized FILE: X chunks added to Chroma in Yms
- Document chunks stored in collection: app-{appId}

### Second Upload to Same App

```
[KnowledgeBase] Starting upload for app app_1781185720214_c2m6vhq5e, 1 files
[KnowledgeBase] Processing upload: Another-Document.pdf
[KnowledgeBase] Adding 2 chunks to vector store for Another-Document.pdf...
[KnowledgeBase] Collection name: app-app_1781185720214_c2m6vhq5e, Namespace: default
[VectorStoreService] ✓ Vector store FOUND in memory cache for app: app_1781185720214_c2m6vhq5e
[VectorStoreService] Adding documents to existing collection...
[VectorStoreService] ✓ Successfully added 2 documents to collection in 412ms
[KnowledgeBase] ✓ Successfully vectorized Another-Document.pdf: 2 chunks added to Chroma in 412ms
[KnowledgeBase] Document chunks stored in collection: app-app_1781185720214_c2m6vhq5e
```

**Key Success Signals:**
- ✓ Vector store FOUND in memory cache (not creating new instance)
- ✓ Adding documents to existing collection (not overwriting)
- ✓ Successfully added X documents to collection

### Query Success Indicators

```
[RAGQueryService] Starting RAG query for app: app_1781185720214_c2m6vhq5e
[RAGQueryService] 1. Getting chat completion provider for app: app_1781185720214_c2m6vhq5e
[RAGQueryService] 2. Chat completion provider created successfully
[RAGQueryService] 3. KB config retrieved: provider=azure-openai
[RAGQueryService] 4. Retrieving documents from vector store for app: app_1781185720214_c2m6vhq5e
[RAGQueryService] Attempting to load vector store from cache/memory for collection: app-app_1781185720214_c2m6vhq5e
[VectorStoreService] ✓ Vector store FOUND in memory cache for app: app_1781185720214_c2m6vhq5e
[RAGQueryService] ✓ Vector store loaded successfully (from cache or initialized)
[RAGQueryService] Executing hybrid search in collection: app-app_1781185720214_c2m6vhq5e
[VectorStoreService] Starting similarity search in collection: app-app_1781185720214_c2m6vhq5e
[VectorStoreService] similaritySearch returned 3 raw results
[VectorStoreService] hybridSearch: got 3 results from search()
[VectorStoreService] Applying filters: {"applicationId":"app_1781185720214_c2m6vhq5e","namespace":"default"}
[VectorStoreService] After filtering: 3 → 3 results
[RAGQueryService] Search returned 3 documents from Chroma DB
[RAGQueryService] 5. Found 3 relevant documents with relevance scores: 0.92, 0.85, 0.78
[RAGQueryService] 6. Context formatted successfully
[RAGQueryService] 7. Calling chat completion model...
[RAGQueryService] 8. Chat completion response received
[RAGQueryService] 9. LLM response generated successfully
```

**Key Success Signals:**
- ✓ Vector store FOUND in memory cache
- ✓ Vector store loaded successfully
- similaritySearch returned X raw results
- After filtering: N → N results (same count = filter matches)
- Found X relevant documents with relevance scores

## Troubleshooting

### Problem: "No relevant documents found"

**Check 1: Were embeddings stored to Chroma?**
```
Look for in upload logs:
✓ Successfully added X documents to collection
✓ Successfully vectorized FILE: X chunks added to Chroma
```

If missing:
- Chroma service not running
- Azure embedding API credentials invalid
- Network connectivity to Chroma

**Check 2: Is vector store in memory cache?**
```
Look for in query logs:
✓ Vector store FOUND in memory cache for app: {appId}
OR
Vector store NOT in cache for app: {appId}, initializing...
```

If initializing each time:
- Vector store not being reused
- Application restarted between uploads and queries

**Check 3: Are filters too strict?**
```
Look for in query logs:
After filtering: 10 → 0 results
```

If results dropped to 0 after filtering:
- applicationId mismatch
- namespace mismatch
- Metadata doesn't match query filters

### Problem: Same document uploaded 6 times but no results

**Diagnosis:**
1. Check upload logs for all 6 uploads
2. Verify ✓ Successfully added X documents for each
3. Check if collection is being recreated (should say "FOUND in cache")
4. If each upload creates new collection:
   - Chroma not persisting across requests
   - Vector store not properly cached

**Fix:**
- Ensure Chroma container is running and persistent
- Check VectorStoreService singleton caching
- Verify applicationId is consistent across uploads

### Problem: Embeddings lost after application restart

**Expected Behavior:**
- First query after restart: "Vector store NOT in cache... initializing..."
- Chroma DB loads collection from persistent storage
- Query succeeds (lazy loading)

**If query fails after restart:**
- Chroma data directory not persistent
- Collection not saved to Chroma storage
- Network issues preventing Chroma connection

## Data Integrity Verification

### 1. Check MongoDB Document Records
```javascript
// In MongoDB:
db.knowledgebasedocuments.find({ applicationId: "app_1781185720214_c2m6vhq5e" })

Expected: Multiple documents with same appId
{
  "_id": ObjectId(...),
  "applicationId": "app_1781185720214_c2m6vhq5e",
  "documentId": "doc-1718513500000-abc123",
  "fileName": "Context-Chunk.pdf",
  "totalChunks": 1,
  "status": "success",
  "embeddingStatus": "success"
}
```

### 2. Check Chroma Collection
```
Collection Name: app-{applicationId}
Expected: N documents (where N = total chunks uploaded)
- Multiple documents if multiple files uploaded
- Metadata includes: applicationId, namespace, keyTerms, originalFilename
- Each document has embedding vector
```

### 3. Query Logs
```
Upload 1: 1 chunk added to Chroma
Upload 2: 1 more chunk added (total: 2)
Upload 3: 1 more chunk added (total: 3)
Query: Search returns 3 results (all uploads accessible)
```

## Performance Optimization

### Cache Hit vs Cache Miss
```
Upload 1 (Cache Miss): ~500-800ms
- Initialize Chroma connection
- Generate embeddings
- Store vectors

Upload 2 (Cache Hit): ~400-600ms
- Use cached instance
- Generate embeddings
- Append vectors

Query 1 (Cache Hit): ~100-200ms
- Load from cache
- Search existing vectors

Query after Restart (Cache Miss): ~200-400ms
- Initialize from Chroma storage
- Search vectors
```

### Memory Usage
- Vector store instances cached per app
- One Chroma connection per app
- Memory grows with number of unique apps
- Consider cleanup for inactive apps

## Summary

**Embedding Persistence Flow:**
1. ✓ Upload: Chunks sent to Chroma DB (collection: app-{appId})
2. ✓ Cache: Vector store instance cached in memory
3. ✓ Reuse: Subsequent uploads use cached instance
4. ✓ Query: Hybrid search searches Chroma collection
5. ✓ Lazy Load: If not cached, load from Chroma on first query
6. ✓ Results: All documents accessible across uploads

**Key Files:**
- Backend: `/backend/src/services/VectorStoreService.ts`
- Backend: `/backend/src/api/knowledgeBaseRoutes.ts`
- Backend: `/backend/src/services/RAGQueryService.ts`
- MongoDB: `knowledgebasedocuments` collection
- Chroma: `app-{applicationId}` collections
