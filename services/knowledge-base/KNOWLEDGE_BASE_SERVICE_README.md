# Knowledge Base Service - Microservice Documentation

## Overview

The Knowledge Base Service is a standalone TypeScript microservice that handles:
- **Document ingestion** from multiple sources (uploaded files, PostgreSQL, external APIs)
- **Smart chunking** with recursive character splitting, token-based, and semantic strategies
- **Embedding generation** using LangChain with OpenAI embeddings
- **Vector indexing** with ChromaDB using HNSW algorithm
- **Hybrid search** combining semantic (vector) and text-based (BM25) search
- **Result re-ranking** using cross-encoder models for improved relevance

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          Knowledge Base Service (TypeScript)        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Express API Routes                          │  │
│  │  - POST /api/ingest (upload documents)       │  │
│  │  - POST /api/search (hybrid search)          │  │
│  │  - GET /api/stats                            │  │
│  └──────────────────────────────────────────────┘  │
│                      ↓                              │
│  ┌──────────────────────────────────────────────┐  │
│  │  Orchestration Layer                         │  │
│  │  (KnowledgeBaseService)                      │  │
│  └──────────────────────────────────────────────┘  │
│          ↙            ↓            ↘               │
│  ┌───────────────┐ ┌───────────┐ ┌──────────────┐ │
│  │ Chunking      │ │ Embedding │ │ Indexing &   │ │
│  │ Service       │ │ Service   │ │ Search       │ │
│  │               │ │           │ │ Service      │ │
│  │ • Recursive   │ │ • Batch   │ │ • ChromaDB   │ │
│  │   splitting   │ │   embed   │ │ • HNSW       │ │
│  │ • Token-based │ │ • Caching │ │ • Hybrid     │ │
│  │ • Semantic    │ │ • LangChn │ │   search     │ │
│  │ • Overlaps    │ │           │ │ • Re-ranking │ │
│  └───────────────┘ └───────────┘ └──────────────┘ │
│          ↓            ↓            ↓               │
│  ┌──────────────────────────────────────────────┐  │
│  │  Data Persistence Layer                      │  │
│  │  - MongoDB (chunks, embeddings metadata)     │  │
│  │  - ChromaDB (vector index)                   │  │
│  │  - PostgreSQL (full-text search index)       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Core Services

### 1. ChunkingService
**File**: `src/services/ChunkingService.ts`

Splits documents into optimized chunks following best practices:

#### Chunking Strategies

**Recursive Character Splitting** (Recommended):
- Splits at natural semantic boundaries
- Priority: Paragraphs (\n\n) → Lines (\n) → Sentences → Words → Characters
- Preserves context with configurable overlap (0-50%)
- Best for: Mixed content with variable structure

**Token-Based Splitting**:
- Measures chunk size by token count (not characters)
- Respects model token limits exactly
- Overlap based on token count
- Best for: Precise token control, models with strict limits

**Semantic Splitting**:
- Detects topic/boundary changes between sentences
- Uses embedding distance to identify splits
- Maintains topical coherence
- Best for: Domain-specific documents with clear sections

```typescript
const chunking = new ChunkingService({
  method: 'recursive-character',
  chunkSize: 1024,           // chars or tokens
  chunkOverlap: 20,          // 20% overlap
  separators: ['\n\n', '\n', '. ', ' ', '']
});

const chunks = chunking.chunkDocument(docId, appId, content);
```

**Output**: DocumentChunk[] with metadata, position tracking, and token counts

### 2. EmbeddingService
**File**: `src/services/EmbeddingService.ts`

Generates vector embeddings using LangChain:

#### Features
- **LangChain Integration**: Uses `@langchain/openai` for embeddings
- **Batch Processing**: Configurable batch size for efficiency
- **Caching**: In-memory cache with simple hash-based lookup
- **Dimension Normalization**: Handles embedding dimension conversion

```typescript
const embedder = new EmbeddingService({
  model: 'openai',           // text-embedding-3-small
  dimension: 1536,           // or 256 for reduced
  batchSize: 32,             // Process 32 at a time
  temperature: 0.7
});

// Batch embed chunks
const embedded = await embedder.embedChunks(chunks);

// Embed query for search
const queryEmbed = await embedder.embedQuery('user search text');
```

**Output**: EmbeddedChunk[] with vectors, content, and metadata

### 3. IndexingService
**File**: `src/services/IndexingService.ts`

Manages vector indexing and hybrid search with ChromaDB:

#### Indexing Algorithm
- **HNSW** (Hierarchical Navigable Small World)
  - Graph-based index for fast approximate nearest neighbor search
  - O(log N) query complexity
  - Tunable recall vs. speed tradeoff

#### Distance Metrics
- **Cosine Similarity** (Recommended): Directional alignment between vectors
  - Formula: similarity = 1 - distance
  - Range: [-1, 1] → normalized to [0, 1]

- **L2 (Euclidean)**: Euclidean distance in vector space
  - Formula: similarity = 1 / (1 + distance)
  - Good for dense vectors

- **Inner Product**: Dot product of normalized vectors
  - Fast computation for normalized embeddings
  - Range: [0, 1]

#### Hybrid Search Architecture

```
User Query
    ↓
┌─────────────────────────────────────┐
│  Semantic Search (70% weight)       │
│  - Generate query embedding         │
│  - ChromaDB vector search (HNSW)    │
│  - K-nearest neighbors (cosine)     │
│  - Results with similarity scores   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Text-Based Search (30% weight)     │
│  - BM25 or PostgreSQL FTS           │
│  - Keyword matching                 │
│  - Results with relevance scores    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Combine Results                    │
│  - Weighted score merge             │
│  - Deduplicate                      │
│  - Sort by combined score           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Re-ranking (Optional)              │
│  - Cross-encoder model              │
│  - Re-score top K results           │
│  - Final ranking                    │
└─────────────────────────────────────┘
    ↓
Final Ranked Results
```

**Usage**:
```typescript
const indexing = new IndexingService(
  'app-123-index',
  'app-123',
  'cosine',                    // metric
  { enabled: true, topK: 10 }  // re-ranking config
);

// Index embedded chunks
await indexing.indexChunks(embeddedChunks);

// Hybrid search
const results = await indexing.hybridSearch({
  appId: 'app-123',
  query: 'how to improve groundedness',
  queryEmbedding: queryVector,
  limit: 10,
  hybridWeight: { semantic: 0.7, textual: 0.3 },
  rerankTopK: 5
});
```

## Document Ingestion Flow

```
1. User uploads document / connects PostgreSQL / adds external source
   ↓
2. Fetch raw content from source
   ↓
3. ChunkingService.chunkDocument()
   - Splits into DocumentChunk[] (1024 chars, 20% overlap)
   ↓
4. Store chunks in MongoDB
   - collection: "document_chunks"
   ↓
5. EmbeddingService.embedChunks()
   - Batch process 32 chunks at a time
   - Generate OpenAI embeddings (1536 dimensions)
   ↓
6. Store embeddings in MongoDB
   - collection: "embedded_chunks"
   ↓
7. IndexingService.indexChunks()
   - Add to ChromaDB with HNSW indexing
   ↓
8. Mark DataSource as "active"
```

## API Endpoints

```
POST /api/ingest
├─ Body: { appId, sourceType, content, metadata }
└─ Returns: { jobId, documentsProcessed, chunksCreated }

POST /api/search
├─ Body: HybridSearchRequest
├─ Query embedding generated by service
└─ Returns: HybridSearchResponse

GET /api/stats/:appId
└─ Returns: KnowledgeBaseStats

POST /api/reindex/:appId
└─ Rebuild all indexes for app

DELETE /api/source/:sourceId
└─ Remove a data source and its indexed data
```

## Configuration

**Environment Variables**:
```
# LangChain / Embeddings
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
EMBEDDING_BATCH_SIZE=32

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# MongoDB
MONGODB_URI=mongodb://...

# Chunking
CHUNK_SIZE=1024
CHUNK_OVERLAP=20
CHUNKING_METHOD=recursive-character

# Indexing
INDEX_METRIC=cosine
ENABLE_RERANKING=true
RERANK_TOP_K=10
```

## Performance Characteristics

| Operation | Complexity | Time (1K chunks) |
|-----------|-----------|------------------|
| Document Chunking | O(n) | ~500ms |
| Embedding Generation | O(n) | ~2-5s (batched) |
| Index Build (HNSW) | O(n log n) | ~1-2s |
| Search Query | O(log n) | ~100-200ms |
| Re-ranking | O(k log k) | ~50-100ms |

## Best Practices

1. **Chunk Size**: 1024 characters (optimal for most use cases)
2. **Overlap**: 20% (balance between context and redundancy)
3. **Metric**: Cosine similarity (best for embeddings)
4. **Re-ranking**: Enable for top-10 results (improves accuracy)
5. **Caching**: Use embedding cache to avoid recomputing
6. **Batch Size**: 32 embeddings per batch (API efficiency)

## Testing

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Type check
npm run type-check

# Start service
npm run dev
```

## Future Enhancements

- [ ] Support for more embedding models (LLaMA, Cohere)
- [ ] Semantic chunking with actual embeddings
- [ ] Cross-encoder re-ranking models
- [ ] PostgreSQL FTS integration
- [ ] Incremental indexing
- [ ] Vector compression/quantization
- [ ] Multi-language support
