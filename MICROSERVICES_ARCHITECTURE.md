# Complete Microservices Architecture

## System Overview

Three independent microservices working together with the Next.js frontend:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js Dashboard)                    │
│  ┌──────────────┬────────────────┬──────────────┬──────────────────┐│
│  │   Metrics    │   Raw Data     │  BA Review   │  Knowledge Base  ││
│  │   Display    │   Monitoring   │   Queue      │  Search & Upload ││
│  └──────────────┴────────────────┴──────────────┴──────────────────┘│
│         ↓              ↓                ↓                 ↓           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               Settings Page (Configuration)                 │   │
│  │  ┌─────────────┬─────────────┬──────────┬────────────┐      │   │
│  │  │ PostgreSQL  │ Document    │ Data     │ LLM        │      │   │
│  │  │ Connection  │ Upload Mgmt │ Sources  │ Provider   │      │   │
│  │  └─────────────┴─────────────┴──────────┴────────────┘      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
          ↓                  ↓                    ↓
    ┌─────────────────┬──────────────────┬──────────────────┐
    │                 │                  │                  │
    ↓                 ↓                  ↓                  ↓
┌─────────────┐ ┌──────────────┐ ┌─────────────┐ ┌──────────────┐
│   Frontend  │ │  Prompt      │ │ Knowledge   │ │  Settings &  │
│   Server    │ │  Debugger    │ │  Base       │ │  Config API  │
│             │ │  Service     │ │  Service    │ │              │
│ - Config    │ │              │ │             │ │ - Store LLM  │
│ - Auth      │ │ - Root cause │ │ - Chunking  │ │   config     │
│ - Routing   │ │   analysis   │ │ - Embedding │ │ - PG conn    │
└─────────────┘ │ - Recommend  │ │ - Indexing  │ │ - Data       │
                │   ations     │ │ - Search    │ │   sources    │
        ↓       │ - LLM config │ │ - Re-rank   │ └──────────────┘
    ┌──────────┐│   (per app)  │ └─────────────┘        ↓
    │ MongoDB  ││              │         ↓              ┌─────────────┐
    │ - Users  │└──────────────┘   ┌──────────────┐     │  MongoDB    │
    │ - Apps   │        ↓          │  ChromaDB    │     │ - Settings  │
    │ - Tokens │   ┌──────────────┐│- Vector index│     │ - Configs   │
    └──────────┘   │  MongoDB     ││- HNSW       │     └─────────────┘
                   │ - Debug jobs │└──────────────┘
                   │ - Analyses   │        ↓
                   │ - Recs       │   ┌──────────────┐
                   └──────────────┘   │ PostgreSQL   │
                                      │ - Full-text  │
                                      │   search     │
                                      │ - BM25       │
                                      └──────────────┘
```

## Three Microservices

### Service 1: Prompt Debugger Service
**Location**: `/services/prompt-debugger`
**Tech Stack**: Express, TypeScript, MongoDB, LangChain (configurable LLM)

**Responsibilities**:
- Root cause analysis for low-scoring prompts
- Generate improvement recommendations
- Store analysis results in MongoDB
- Configurable LLM provider (Claude, OpenAI, DeepSeek, custom)

**API Endpoints**:
```
POST /api/debug/analyze
  ├─ Input: { appId, promptId, promptText, scores }
  └─ Output: { rootCauses, recommendations, analysis }

GET /api/debug/health
  └─ Service health check
```

**Environment**:
```
LLM_PROVIDER=claude|openai|deepseek|custom
LLM_MODEL=model-name
LLM_API_KEY=api-key
LLM_BASE_URL=optional-for-custom
MONGODB_URI=mongodb://...
```

---

### Service 2: Knowledge Base Service (NEW)
**Location**: `/services/knowledge-base`
**Tech Stack**: Express, TypeScript, LangChain, ChromaDB, MongoDB, PostgreSQL

**Responsibilities**:
- Document ingestion (uploads, PostgreSQL, external sources)
- Smart document chunking (recursive, token-based, semantic)
- Vector embedding generation (LangChain + OpenAI)
- Vector indexing with ChromaDB (HNSW algorithm)
- Hybrid search (semantic + text-based with BM25)
- Result re-ranking with cross-encoders

**Core Services**:
1. **ChunkingService** (`src/services/ChunkingService.ts`)
   - Recursive character splitting with overlap
   - Token-based splitting for model limits
   - Semantic chunking for topic coherence

2. **EmbeddingService** (`src/services/EmbeddingService.ts`)
   - LangChain embeddings (OpenAI text-embedding-3-small)
   - Batch processing with caching
   - Dimension normalization

3. **IndexingService** (`src/services/IndexingService.ts`)
   - ChromaDB HNSW indexing
   - Hybrid search (semantic 70% + textual 30%)
   - Cross-encoder re-ranking

**API Endpoints**:
```
POST /api/ingest
  ├─ Input: { appId, sourceType, content, metadata }
  └─ Output: { jobId, chunksCreated, embeddingsGenerated }

POST /api/search (Hybrid Search)
  ├─ Input: { appId, query, limit, hybridWeight, rerankTopK }
  └─ Output: { results[], executionTimeMs, totalResults }

GET /api/stats/:appId
  └─ Output: { totalDocuments, totalChunks, dataSources[] }

POST /api/reindex/:appId
  └─ Rebuild all indexes
```

**Environment**:
```
# Embeddings
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536
EMBEDDING_BATCH_SIZE=32

# ChromaDB
CHROMADB_HOST=localhost
CHROMADB_PORT=8000

# Chunking
CHUNK_SIZE=1024
CHUNK_OVERLAP=20
CHUNKING_METHOD=recursive-character

# Indexing
INDEX_METRIC=cosine
ENABLE_RERANKING=true
RERANK_TOP_K=10

# Storage
MONGODB_URI=mongodb://...
```

---

### Service 3: Settings & Configuration Service
**Location**: Part of Frontend API Routes
**Tech Stack**: Next.js API Routes, MongoDB, TypeScript

**Responsibilities**:
- Store and retrieve app configurations
- Manage LLM provider settings (per app)
- Store PostgreSQL connections
- Data source management
- User preferences

**Configuration Stored in MongoDB**:
```typescript
{
  appId: "app-123",
  llmConfig: {
    provider: "claude" | "openai" | "deepseek" | "custom",
    model: "model-name",
    apiKey: "encrypted-key",
    baseUrl: "optional-for-custom"
  },
  postgresqlConnection: {
    host: "...",
    port: 5432,
    database: "...",
    // credentials encrypted
  },
  dataSources: [
    { id, type, name, status, lastSync }
  ],
  chunkingConfig: {
    method: "recursive-character",
    chunkSize: 1024,
    chunkOverlap: 20
  },
  embeddingConfig: {
    model: "openai",
    dimension: 1536,
    batchSize: 32
  },
  searchConfig: {
    metric: "cosine",
    enableReranking: true,
    rerankTopK: 10,
    hybridWeight: { semantic: 0.7, textual: 0.3 }
  }
}
```

---

## Data Flow

### 1. Document Ingestion Flow
```
User uploads document in Settings
        ↓
[POST /api/settings/sources - Frontend API]
        ↓
Store DataSource in MongoDB
        ↓
[POST /api/ingest - Knowledge Base Service]
        ├─ Get raw content from source
        ├─ ChunkingService.chunkDocument()
        ├─ EmbeddingService.embedChunks() (LangChain)
        ├─ IndexingService.indexChunks() (ChromaDB)
        └─ Update DataSource.status = "active"
        ↓
Knowledge Base ready for search
```

### 2. Configuration Flow
```
User selects LLM provider in Settings → LLM Tab
        ↓
[POST /api/settings/llm-config - Frontend API]
        ↓
Store LLMConfig in MongoDB (encrypted)
        ↓
Prompt Debugger Service reads on startup
or via [GET /api/settings/llm-config/:appId]
        ↓
Uses configured LLM for all analyses
```

### 3. Search & Validation Flow
```
User searches in Dashboard → Knowledge Base Tab
        ↓
[POST /api/search - Frontend API]
        ↓
[POST /api/knowledge-base/search - Knowledge Base Service]
        ├─ EmbeddingService.embedQuery() (LangChain)
        ├─ IndexingService.hybridSearch()
        │  ├─ Semantic search (ChromaDB HNSW)
        │  ├─ Text search (PostgreSQL FTS)
        │  ├─ Combine results (weighted)
        │  └─ Re-rank if enabled
        └─ Return ranked results with scores
        ↓
Display in Dashboard with comparison to monitoring scores
```

### 4. Root Cause Analysis Flow
```
User clicks "Analyze" on low-scoring prompt
        ↓
[POST /api/debug/analyze - Frontend API]
        ↓
[POST /api/debug/analyze - Prompt Debugger Service]
        ├─ Read LLMConfig from MongoDB
        ├─ Create LLMService with configured provider
        ├─ Generate root causes using LLM
        ├─ Generate recommendations
        └─ Store in MongoDB
        ↓
Display analysis + recommendations on dashboard
```

---

## Deployment Architecture

```
Load Balancer
    ↓
┌───────────────────────────────┐
│  Frontend Server (Next.js)    │
│  - Dashboard pages            │
│  - API routes (/api/*)        │
│  - Settings management        │
└───────────────────────────────┘
    ↓      ↓      ↓
    ↓      ↓      ↓
┌───────┬──────┬──────────────────────┐
│       │      │                      │
↓       ↓      ↓                      ↓
[Port] [Port] [Port]            [MongoDB]
3000   3001   3002              (shared)
│       │      │
Prompt  KB    Settings         PostgreSQL
Debugger Base (integrated)     (shared)
│       │
└───┬───┘
    ↓
 [MongoDB]
   - Apps
   - Users
   - Analyses
   - Configs

 [ChromaDB]
   - Vector indices
   - Embeddings

 [PostgreSQL]
   - Full-text search
   - Data sources
```

---

## Key Design Decisions

1. **Three Independent Services**: Allows independent scaling, deployment, and tech stack choices
2. **LangChain for Embeddings**: Abstraction layer supports multiple embedding models
3. **ChromaDB for Vectors**: Easy local deployment, HNSW for fast search
4. **Hybrid Search**: Combines semantic (better context) + text (keyword matching)
5. **Re-ranking**: Improves accuracy for top results
6. **Configuration-Driven**: LLM provider, chunking, search params all configurable per app
7. **MongoDB for Metadata**: Flexible schema for diverse data types
8. **TypeScript Strict Mode**: Full type safety across all services

---

## Next Steps for Implementation

1. **Finish Knowledge Base Service**:
   - Complete MongoDB persistence layer
   - Implement Express routes with validation
   - Wire up ChromaDB client
   - Add PostgreSQL FTS integration

2. **Create Settings API**:
   - LLM configuration endpoints
   - PostgreSQL connection management
   - Data source CRUD operations

3. **Update Frontend**:
   - Create Settings tabs (LLM, PostgreSQL, Data Sources)
   - Update Knowledge Base tab to search-only
   - Connect to backend APIs

4. **Testing & Deployment**:
   - Integration tests for all services
   - Docker containers for each service
   - Environment configuration templates
