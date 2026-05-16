# Consolidated Requirements & Implementation Plan

## Answers to Your 5 Questions

### 1. DeepEval LLM-As-Judge
**Decision**: Configurable per app (like external RAG). Default = Claude, but users can set custom LLM in settings.
- Settings tab: "Scoring Frameworks" → Enable DeepEval → Select LLM provider + model
- API key configuration per app
- Response format: Same structure as other three frameworks

### 2. Document Upload Flow
**Location**: Settings → Data Sources → "Upload Documents" tab (per app)
- **Supported**: PDF, TXT, JSON, CSV
- **Max size**: 100MB per file (configurable)
- **Flow**: Upload → Parse → Generate embeddings → Store in ChromaDB
- **Status**: Show upload progress, embedding generation status

### 3. PostgreSQL Connection
**Location**: Settings → Data Sources → "Database Connection" tab (per app)
- User provides: Host, Port, Database, Table, Username, Password
- **Select Data**: Pick specific columns to index OR SQL query for custom selection
- **Refresh**: Manual "Sync Now" button + optional auto-refresh schedule (daily/weekly)
- **Tracking**: Show row count, last sync time, columns indexed

### 4. Tester Search UI
**Location**: New dedicated page "Knowledge Base" (accessible from main nav)
- **Search bar**: Single unified search (hybrid - semantic + text)
- **Results**: Show source badge (Document / PostgreSQL / External), relevance score
- **Compare**: Click result to see side-by-side with dashboard monitoring data
- **Filters**: By source, by app, by score range

### 5. Performance Targets
- **Embeddings generation**: 500-1000 tokens/second per app (batch processing)
- **Search latency**: <200ms for cached queries, <2s for new embeddings
- **Refresh frequency**: No more than hourly (expensive) unless explicitly needed
- **Cache strategy**: In-memory LRU (1GB default, configurable)

---

## Infrastructure Stack (Updated - No Redis)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Evaluation** | Three frameworks + DeepEval | Scoring |
| **Vector Search** | ChromaDB (local, in-process) | Semantic search + embeddings |
| **Text Search** | PostgreSQL FTS | Full-text search |
| **Data Source** | PostgreSQL + File Upload | Document ingestion |
| **Caching** | In-memory LRU (Node.js) | Query cache, session data |
| **Microservices** | 3 independent services | Debugger, Knowledge, Guidance |
| **Frontend** | Next.js | React components for all features |

---

## Complete Requirements List

### Phase 1: Dashboard Enhancement
- [ ] Display evaluation data (three frameworks) with clear breakdown
- [ ] Create prompt templates from dashboard data
- [ ] Real-time monitoring with per-framework scoring visible

### Phase 2: Prompt Debugger Service (Requirement #1)
- [ ] Root cause analysis endpoint
- [ ] Integration with Claude LLM-As-Judge
- [ ] Explanation generation for low scores
- [ ] Recommendations engine with examples
- [ ] Type-safe request/response (Zod validation)

### Phase 3: Knowledge Integration Service (Requirement #2)
- [ ] Per-app settings for external LLM/RAG configuration
- [ ] Document upload UI + processing
- [ ] PostgreSQL data source connection UI
- [ ] Embeddings generation (ChromaDB)
- [ ] Hybrid search endpoint (semantic + text)
- [ ] Improvement suggestions based on knowledge base

### Phase 4: Tester Guidance Service (Requirement #3)
- [ ] Real-time suggestion engine
- [ ] Best practices recommendations
- [ ] Leaderboard tracking (in-memory)
- [ ] Top-performing prompts per app
- [ ] Effectiveness metrics

### Phase 5: DeepEval Integration
- [ ] Fourth framework scoring setup
- [ ] Per-app LLM configuration
- [ ] Result aggregation with other three frameworks
- [ ] Consistent scoring format

### Phase 6: Knowledge Base Search UI
- [ ] Dedicated search page
- [ ] Hybrid search implementation
- [ ] Results display with source badges
- [ ] Side-by-side comparison with dashboard
- [ ] Filter and sort capabilities

---

## Data Models

### ChromaDB Collections (Per App)
```
Collection: "app_{appId}_documents"
- id: unique embedding ID
- document_id: file ID or PostgreSQL row ID
- content: text chunk
- source: "upload" | "postgresql" | "external"
- embedding: vector
- metadata: {appId, uploadedAt, fileName/tableName}
```

### In-Memory Cache (Node.js)
```typescript
interface CacheEntry {
  key: string;
  value: any;
  ttl: number; // milliseconds
  timestamp: number;
}

// LRU strategy: 1GB max, evict oldest on overflow
```

### PostgreSQL Schema (New)
```sql
CREATE TABLE app_data_sources (
  id UUID PRIMARY KEY,
  app_id UUID NOT NULL,
  source_type ENUM('document_upload', 'postgresql_connection', 'external_rag'),
  name VARCHAR(255),
  config JSONB, -- connection details or metadata
  last_synced TIMESTAMP,
  row_count INT,
  created_at TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE document_uploads (
  id UUID PRIMARY KEY,
  app_id UUID NOT NULL,
  file_name VARCHAR(255),
  file_size INT,
  source_id UUID NOT NULL,
  embeddings_status ENUM('pending', 'processing', 'completed', 'failed'),
  chunk_count INT,
  created_at TIMESTAMP,
  FOREIGN KEY (app_id) REFERENCES apps(id),
  FOREIGN KEY (source_id) REFERENCES app_data_sources(id)
);
```

---

## Microservices Summary

### Prompt Debugger Service
- Port: 3001
- Endpoints:
  - `POST /api/debug` - Analyze low-scoring prompt
  - `POST /api/recommendations` - Generate improvement suggestions
- Dependencies: Claude API, MongoDB, PostgreSQL
- No external cache needed (stateless)

### Knowledge Integration Service
- Port: 3002
- Endpoints:
  - `POST /api/sources/upload` - Handle document upload
  - `POST /api/sources/postgresql` - Test and sync PostgreSQL
  - `POST /api/search/hybrid` - Semantic + text search
  - `GET /api/sources/{appId}` - List configured sources
- Dependencies: ChromaDB, PostgreSQL, File storage
- In-memory: Embedding cache (recent queries)

### Tester Guidance Service
- Port: 3003
- Endpoints:
  - `POST /api/suggestions` - Real-time guidance
  - `GET /api/leaderboard/{appId}` - Top prompts
  - `GET /api/best-practices/{appId}` - Framework guidelines
- Dependencies: MongoDB, in-memory cache for leaderboard
- In-memory: Leaderboard (refresh every 5 minutes)

---

## Implementation Sequence

**Week 1**: Prompt Debugger Service (complete root cause analysis)
**Week 2**: Knowledge Integration Service (upload, PostgreSQL, embeddings, search)
**Week 3**: Knowledge Base Search UI + Dashboard integration
**Week 4**: Tester Guidance Service + Leaderboard
**Week 5**: DeepEval Integration into all three frameworks
**Week 6**: Polish, testing, documentation

---

## TypeScript Standards (Applied Everywhere)
- `strict: true` in tsconfig
- No `any` types - use `unknown` + type guards
- Zod for all external data validation
- Explicit return types on all functions
- Error handling with proper try/catch blocks
- Environment variable validation at startup
