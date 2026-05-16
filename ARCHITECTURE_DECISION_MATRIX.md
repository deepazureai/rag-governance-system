# Architecture Decision Matrix: Your Final Stack

## Executive Summary

You're building an intelligent prompt optimization platform for 600 concurrent testers across 100+ applications. The architecture must support:

1. **Root Cause Analysis** - Why prompts score low with actionable insights
2. **Knowledge Integration** - Optional external RAG validation per application
3. **Real-time Guidance** - Suggestions to 600 testers as they type

**Decision: 3-tier hybrid stack with local RAG as primary, external optional as secondary**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                       │
│  Dashboard | Explore | Settings | Prompt Tester                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────── API GATEWAY ─────────────────────────────┐
│  Route /debug → Debugger | /knowledge → Integration | /guidance   │
└─────────────────────────────────────────────────────────────────┘
        ↓                        ↓                        ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  DEBUGGER (3001) │  │  KNOWLEDGE (3002)│  │  GUIDANCE (3003) │
│  Root cause      │  │  External RAG    │  │  Real-time       │
│  analysis        │  │  configuration   │  │  suggestions     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        ↓                        ↓                        ↓
    ┌─────────────────────────────────────────────────────┐
    │         SHARED DATA LAYER                           │
    ├─────────────────────────────────────────────────────┤
    │  MongoDB: Prompts, Scores, Analysis Cache          │
    │  ChromaDB: Embeddings + Semantic Search (Local)    │
    │  PostgreSQL: Full-text Search + FTS Indexes        │
    │  Redis: Cache + Sessions + Leaderboard + Pub/Sub   │
    └─────────────────────────────────────────────────────┘
```

---

## Detailed Component Breakdown

### 1. Storage Layer

#### MongoDB (Existing)
```
Collections:
├── apps
│   └── Metadata, created by admins
├── prompts
│   ├── id, appId, text, responseText
│   ├── evaluationScores (RAGAS metrics)
│   ├── embedding (1536-dim, OpenAI)
│   ├── identifiedPatterns ["has_context", "includes_examples"]
│   └── debugAnalysis (cached from Claude)
├── prompt_debug_cache
│   └── Store analysis results by prompt hash
└── knowledge_sources
    └── Per-app external RAG configurations
```

#### ChromaDB (NEW - Local Vector DB)
```
Purpose: Semantic search on prompts
Storage: Local (your infrastructure)
Schema:
  {
    id: "prompt_uuid",
    embedding: [0.123, 0.456, ...],
    metadata: {
      appId, scores, tags, patterns
    },
    document: "What is AI in context of..."
  }

Query example:
  query_embedding = embed("What is AI?")
  results = chromadb.query(query_embedding, top_k=5)
  → Returns: Similar prompts with high scores
```

#### PostgreSQL (Existing + Full-Text Search)
```
Purpose: Text search + keyword matching
NEW: Full-text search vector column

ALTER TABLE prompts ADD COLUMN search_vector tsvector;
UPDATE prompts SET search_vector = 
  to_tsvector('english', text || ' ' || response_text || ' ' || tags);
CREATE INDEX idx_prompts_search ON prompts USING gin(search_vector);

Query example:
  SELECT * FROM prompts
  WHERE search_vector @@ plainto_tsquery('what is AI')
    AND evaluation_scores->>'overall'::float >= 80
  → Returns: Keyword matches with high scores
```

#### Redis (Existing)
```
Purpose: Caching + Real-time features
Keys:
  cache:embedding:{hash} → Pre-calculated embeddings (1-hour TTL)
  cache:analysis:{hash} → Root cause analysis (1-hour TTL)
  session:tester:{id} → Active session (1-hour TTL)
  leaderboard:{appId}:day → Daily scores (24-hour TTL)
  rate_limit:{testerId} → Concurrent request limit
  
Pub/Sub:
  channel:app:{appId} → Broadcast updates to testers
```

---

### 2. Microservices Layer

#### Service 1: Prompt Debugger (Port 3001)

**Purpose:** Analyze low-scoring prompts with root cause analysis

**Data Flow:**
```
User clicks "Debug" on low-scoring prompt
        ↓
Query ChromaDB: Find semantically similar HIGH-scoring prompts
        ↓
Query PostgreSQL: Find keyword-matching HIGH-scoring prompts
        ↓
Merge results: Hybrid score (60% semantic + 40% text)
        ↓
Send to Claude: "Here are 5 high-scoring similar prompts.
                 Why is my prompt scoring low and how do I fix it?"
        ↓
Claude returns: Root causes + Recommendations + Patterns
        ↓
Cache in Redis (1 hour) + Store patterns in MongoDB
        ↓
Return to frontend with actionable insights
```

**API Endpoints:**
```
POST /api/debug/analyze
  Input: { appId, prompt, scores }
  Output: { rootCauses, recommendations, patterns }

GET /api/debug/metrics-breakdown/{promptId}
  → Explain each metric score individually

GET /api/debug/prompt-patterns/{appId}
  → Common issues in this app's prompts
```

**Dependencies:**
- ChromaDB (semantic search)
- PostgreSQL (text search)
- Claude API (analysis)
- Redis (caching)
- OpenAI (embeddings)

---

#### Service 2: Knowledge Integration (Port 3002)

**Purpose:** External RAG validation + per-app knowledge management

**Configuration UI (in Settings):**
```
For each app, admin can configure:
  ☑ Enable Local RAG (always on)
    └─ Indexed from: Prompts in this app
  
  ☑ Enable External RAG (optional)
    Provider: [Claude | GPT-4 | LLamaIndex]
    Config: { model, temperature, parameters }
    
  ☐ Upload Knowledge Documents
    └─ Business context docs indexed in ChromaDB
    
  ☐ Enable External LLM Feedback
    Provider: [Claude | GPT-4 | Open Source]
```

**Data Flow (When External RAG Enabled):**
```
Tester writes prompt
        ↓
Query local ChromaDB + PostgreSQL
        ↓
Get suggestions from local knowledge
        ↓
[ASYNC] Also query external RAG:
  1. Retrieve context from uploaded docs (semantic search)
  2. Send to external LLM for feedback
  3. Compare with local suggestions
  4. Return best suggestion (or combined)
        ↓
Cache result (1 hour)
        ↓
Return suggestions (don't block on external)
```

**API Endpoints:**
```
POST /api/knowledge/configure
  Input: { appId, sourceType, provider, config }
  → Configure external RAG per app

POST /api/knowledge/upload-documents
  Input: { appId, documents[] }
  → Index business context docs

POST /api/knowledge/get-feedback
  Input: { appId, prompt, currentScore }
  Output: { externalFeedback, suggestedCorrections }

GET /api/knowledge/status/{appId}
  → Show configuration + indexed doc count
```

**Dependencies:**
- External LLM APIs (optional, configurable)
- ChromaDB (local RAG + doc indexing)
- PostgreSQL (text search)
- Redis (caching)

---

#### Service 3: Tester Guidance (Port 3003)

**Purpose:** Real-time suggestions to 600 concurrent testers

**Architecture:**
```
600 testers × 1 connection/tester = WebSocket pool
        ↓
Each tester types prompt
        ↓
Service queries ChromaDB (with 5-second cache)
        ↓
Finds top 5 similar high-scoring prompts
        ↓
Generates 2-3 suggestions via Claude (async)
        ↓
Sends via WebSocket in real-time
        ↓
Tester submits best suggestion
        ↓
Add to ChromaDB for future searches
        ↓
Update leaderboard in Redis
```

**Redis Optimization for Scale:**
```
Per-tester session: { activePrompt, score, suggestions, timestamp }
Pub/sub: Broadcast leaderboard updates every 10 seconds
Cache: Embedding queries (10-sec TTL)
Rate limiting: 20 req/sec per tester
Leaderboard: Sorted set, updated on submission
```

**API Endpoints:**
```
WebSocket /ws/guidance/{testerId}
  Subscribe to real-time suggestions

POST /api/guidance/suggest
  Input: { appId, prompt }
  Output: { suggestions[], scoringExpected[], patterns }

GET /api/guidance/leaderboard/{appId}
  → Top scorers for app today

GET /api/guidance/best-prompts/{appId}
  → Best patterns for business context
```

**Dependencies:**
- ChromaDB (semantic search + cache)
- Claude API (suggestion generation)
- Redis (sessions, leaderboard, cache)
- OpenAI (embeddings)
- WebSocket library (Express.js)

---

### 3. Integration Points

#### Frontend Dashboard
```
Components:
├── Debug Button
│   └── Calls: POST /api/debug/analyze
│       Shows: Root causes + Recommendations
│
├── Tester Guidance Panel
│   └── WebSocket /ws/guidance/{testerId}
│       Shows: Real-time suggestions
│
├── Settings → Knowledge Integration
│   └── Calls: POST /api/knowledge/configure
│       Allows: Upload docs, select external RAG
│
└── Leaderboard
    └── Calls: GET /api/guidance/leaderboard/{appId}
        Shows: Top scorers today
```

#### Data Pipeline
```
1. New prompts ingested → Batch embedding generation
2. Embeddings stored in ChromaDB
3. Full-text indexes updated in PostgreSQL
4. Available immediately for search queries
```

---

## Performance Characteristics

### Response Times

| Operation | Latency | Cache Hit | Notes |
|-----------|---------|-----------|-------|
| Debug analysis (cached) | 20ms | 85% | Redis hit |
| Debug analysis (uncached) | 1.5-2s | 15% | Cold: ChromaDB + Claude |
| Real-time suggestion (cached) | 30ms | 90% | WebSocket + Redis |
| Real-time suggestion (uncached) | 800ms | 10% | ChromaDB + Claude async |
| Leaderboard update | 10ms | 100% | Redis sorted set |
| Full-text search | 50ms | - | PostgreSQL indexed |

### Throughput for 600 Concurrent Testers

```
Scenario: 600 testers, 20 req/sec each = 12,000 req/min

Without caching:
  12,000 ChromaDB queries/min → 120 OpenAI embedding calls
  12,000 Claude calls → $ expensive, rate limited

With caching (85% hit rate):
  1,800 uncached → 18 OpenAI embedding calls (batched)
  1,800 Claude calls (queued, batched)
  10,200 Redis hits (instant)
  Result: $minimal, scales linearly
```

---

## Cost Analysis (Monthly)

### Infrastructure Costs

| Component | Cost | Notes |
|-----------|------|-------|
| MongoDB | $50-200 | Existing, shared |
| PostgreSQL | $100-300 | Existing, shared |
| Redis | $30-100 | Upstash, shared |
| ChromaDB | $0 | Local, no per-query cost |
| Microservices | $50-150 | Vercel Functions or containers |
| OpenAI Embeddings | $50-100 | 1.5k calls/day @ $0.02/1M |
| Claude API | $200-500 | 1.8k calls/day, varies by model |
| **Total** | **$480-1350** | All-in with 600 concurrent |

**vs. External RAG Only:**
- Pinecone: +$300-500/month (minimum)
- Weaviate: +$300-2000/month
- Your approach saves 30-50% through local caching

---

## Scaling Strategy

### Phase 1: Current Load (100 testers, 20 apps)
```
Services: Single instance each
Database: Existing shared instances
Cache: Standard Redis tier
Cost: ~$500/month
```

### Phase 2: Growth (600 testers, 100 apps)
```
Services: 2-3 instances each (auto-scale)
Database: Upgraded PostgreSQL + Redis
Cache: Enhanced Redis tier
Batching: Async queue for Claude calls
Cost: ~$1,000-1,500/month (including external RAG)
```

### Phase 3: Enterprise (2000+ testers)
```
Dedicated infrastructure per service
Load balancing: API Gateway routes to services
Database: Sharded or multi-region
Cache: Redis cluster
Batch processing: Celery or AWS SQS
Cost: $2,000-3,000/month (elastic)
```

---

## Technology Decisions vs. Alternatives

### Vector Database: ChromaDB vs. Pinecone vs. Weaviate

| Criterion | ChromaDB | Pinecone | Weaviate |
|-----------|----------|----------|----------|
| **Where it runs** | Local | Cloud only | Cloud only |
| **Cost** | $0 | $300+/mo | $300+/mo |
| **Privacy** | ✓ Complete | ✗ Vendor | ✗ Vendor |
| **Latency** | 50-100ms | 200-500ms | 200-500ms |
| **Text search** | ✗ (use PG) | ✗ (separate) | ✗ (separate) |
| **Hybrid easy** | ✓ (with PG) | ✗ Hard | ✗ Hard |
| **Setup time** | 30min | 2 hours | 3 hours |
| **Scaling** | Local first | Automatic | Automatic |

**Winner for your use case:** ChromaDB (local, cheap, hybrid-friendly)

### Text Search: PostgreSQL FTS vs. Elasticsearch

| Criterion | PostgreSQL | Elasticsearch |
|-----------|-----------|---|
| **New infrastructure** | ✗ No | ✓ Yes |
| **Cost** | $0 | $100+/mo |
| **TF-IDF ranking** | ✓ | ✓ |
| **Full-text features** | ✓ Sufficient | ✓ Advanced |
| **For your volume** | ✓ Plenty | Overkill |
| **Integration** | ✓ Native | ✗ API |

**Winner for your use case:** PostgreSQL FTS (already available, sufficient)

### Caching: Redis vs. Memcached vs. Varnish

| Criterion | Redis | Memcached | Varnish |
|-----------|-------|-----------|---------|
| **Data types** | Many | Simple | HTTP only |
| **Pub/Sub** | ✓ | ✗ | ✗ |
| **Sessions** | ✓ | ✓ | ✗ |
| **Leaderboards** | ✓ Sorted set | ✗ | ✗ |
| **TTL support** | ✓ | ✓ | ✓ |
| **For guidance service** | ✓ Perfect | Okay | ✗ Wrong layer |

**Winner for your use case:** Redis (sessions + leaderboard + pub/sub)

---

## Data Flow Example: Complete Journey

### A Tester Writes "What is AI?"

```
TIME 0ms:   Tester types in prompt input
TIME 10ms:  WebSocket sends to /ws/guidance/{testerId}
TIME 11ms:  Service receives, checks Redis cache
TIME 12ms:  Cache miss (new prompt) → Query ChromaDB
TIME 100ms: ChromaDB returns 5 similar high-scoring prompts
TIME 101ms: Service sends to tester immediately:
            "Searching for best practices..."
TIME 102ms: [ASYNC] Query PostgreSQL for keywords
TIME 150ms: PostgreSQL returns matching prompts
TIME 151ms: [ASYNC] Merge results with hybrid scoring
TIME 152ms: [ASYNC] Call Claude: "How to improve this prompt?"
TIME 1200ms: Claude responds with suggestions
TIME 1201ms: Cache in Redis (1-hour TTL)
TIME 1202ms: Send suggestions to tester via WebSocket

Tester sees: 30ms "thinking..." + 1200ms for suggestions
Result displayed: "Improve by adding context" + Examples
Tester clicks "use this suggestion"
TIME 1250ms: Submitted prompt added to MongoDB
TIME 1251ms: New embedding generated + added to ChromaDB
TIME 1300ms: Leaderboard updated in Redis
TIME 1400ms: Next tester types → Cache HIT (30ms response)
```

---

## Deployment Checklist

### Week 1: Setup
- [ ] Deploy ChromaDB instance
- [ ] Add embedding column to MongoDB
- [ ] Add FTS indexes to PostgreSQL
- [ ] Configure Redis
- [ ] Generate embeddings for all existing prompts

### Week 2: Services
- [ ] Deploy Prompt Debugger service
- [ ] Deploy Knowledge Integration service
- [ ] Deploy Tester Guidance service
- [ ] API Gateway routes configured

### Week 3: Integration
- [ ] Add "Debug" button to dashboard
- [ ] Add Tester Guidance panel
- [ ] Add Settings for external RAG config
- [ ] WebSocket connections tested

### Week 4: Optimization
- [ ] Load test to 600 concurrent
- [ ] Tune caching strategy
- [ ] Monitor performance
- [ ] Production deployment

---

## Summary: Your Decision

**You're building:**
```
Local RAG + Hybrid Search + Optional External Validation
+ 3 Focused Microservices
+ Intelligent Caching
= Fast, Private, Scalable System
```

**That delivers:**
- ✅ Root cause analysis (1.5-2s latency)
- ✅ Real-time guidance (30ms with cache)
- ✅ Scales to 600 concurrent testers
- ✅ No vendor lock-in (local primary)
- ✅ Privacy-first architecture
- ✅ Optional external RAG validation
- ✅ 30-50% cost savings vs. external-only
