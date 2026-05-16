# Strategic Decision Summary: Local RAG + Hybrid Search

## Your Question Answered

**"Does the application build a RAG model locally, or connect to an existing one? Should it do both?"**

### Decision: **Build Local RAG + Optional External Integration**

```
Primary Flow (Always Works):
  Local ChromaDB → PostgreSQL FTS → Hybrid Merge → Claude Analysis → Cache in Redis

Optional Flow (If User Configures):
  + External RAG (Claude, GPT, LLamaIndex) for "second opinion"
  + Never blocks critical path (runs async)
  + Validates and improves suggestions
```

This is a **privacy-first, performance-optimized** architecture where:

1. **Local RAG is the single source of truth** for "how to prompt well in your business"
2. **External RAG is optional validation** (configurable per app in settings)
3. **No data leaves your infrastructure** unless the user explicitly enables it

---

## Why This Beats the Alternatives

### Option A: Only External RAG
```
❌ Vendor lock-in (tied to Claude/GPT pricing)
❌ Latency (API call every time)
❌ Privacy concerns (prompts sent to external APIs)
❌ Rate limiting (won't scale to 600 concurrent testers)
❌ Costs accumulate quickly
```

### Option B: Only Local RAG (No External)
```
✓ Full control
✓ No external costs
✓ Privacy guaranteed
⚠ Limited validation (only learns from your data)
⚠ Can't leverage external best practices
```

### Option C: Hybrid (Your Choice) ✅
```
✓ Fast local defaults (ChromaDB queries in 50-100ms)
✓ Scales to 600 concurrent users
✓ Optional external validation (for enterprises)
✓ Privacy-first (external only if user enables)
✓ Graceful degradation (works without external APIs)
✓ Learn from own data + external knowledge when available
```

---

## Technology Stack Justification

### Why ChromaDB Instead of Paid Vector DBs

| Feature | ChromaDB | Pinecone | Weaviate |
|---------|----------|----------|----------|
| **Cost** | $0 | $300-1000/month | $300-2000/month |
| **Privacy** | Local | Vendor | Vendor |
| **Semantic Search** | ✓ | ✓ | ✓ |
| **Text Search** | ✗ (use PG) | ✗ (use PG) | ✗ (use PG) |
| **Deployment** | Embedded | API | API/Managed |
| **Hybrid Search** | Easy (+ PG) | Hard (separate DB) | Hard (separate DB) |
| **For Your Use Case** | Perfect fit | Overkill | Overkill |

**ChromaDB wins because:**
- Runs locally (your infrastructure, your data)
- Free (no per-query costs)
- Integrates with PostgreSQL for hybrid search
- Simple to embed in microservices
- Open-source (no vendor surprises)

### Why PostgreSQL FTS (Not Elasticsearch)

**Full-Text Search requirements:**
- Keyword matching on prompts
- Pattern detection in high-scoring prompts
- Tag-based filtering

PostgreSQL native FTS is sufficient because:
- Already running in your stack
- Native `tsvector` + `tsquery` support
- No new infrastructure
- Hybrid search combos work great with ChromaDB
- Scales fine for your volume

### Why Redis (For Caching, Not Vector Storage)

**Redis responsibilities:**
```
✓ Cache embedding vectors (1-hour TTL)
✓ Cache analysis results (1-hour TTL)
✓ Store active tester sessions (1-hour TTL)
✓ Real-time leaderboards (24-hour TTL)
✓ Rate limiting per tester
✓ Pub/sub for WebSocket broadcasts
```

**Redis NOT used for:**
```
✗ Primary vector storage (that's ChromaDB)
✗ Keyword search (that's PostgreSQL)
✗ Prompt history (that's MongoDB)
```

---

## How Hybrid Search Works: End-to-End

### User clicks "Debug" on low-scoring prompt

```typescript
POST /api/debug/analyze {
  appId: "tech-docs-app",
  prompt: "What is AI?",
  scores: {
    groundedness: 30,      // ❌ Needs improvement
    relevance: 45,         // ❌ Needs improvement
    fluency: 65,           // ⚠️ Okay
    coherence: 55,         // ⚠️ Okay
    overall: 48            // ❌ Low score
  }
}
```

### Step 1: Redis Cache Check
```typescript
cacheKey = "analysis:tech-docs-app:a1b2c3d4"
cached = await redis.get(cacheKey)
// ✓ Hit: Return cached result in 5ms
// ✗ Miss: Proceed to steps 2-3
```

### Step 2: Parallel Queries
```typescript
// CONCURRENT:
semanticResults = await chromadb.query({
  queryEmbedding: [0.123, 0.456, ...],  // Generated from "What is AI?"
  appId: "tech-docs-app",
  minScore: 80,
  limit: 10
})
// Returns: Top 10 similar prompts that scored 80%+
// Examples: "Explain AI in business context" (92% score)
//           "What is AI and how does it differ from ML?" (88% score)

textResults = await postgres.query(`
  SELECT * FROM prompts
  WHERE app_id = 'tech-docs-app'
    AND search_vector @@ plainto_tsquery('what is AI')
    AND evaluation_scores->>'overall'::float >= 80
  ORDER BY ts_rank DESC
  LIMIT 10
`)
// Returns: Keyword matches that scored 80%+
// Examples: Prompts mentioning "AI", "what is", "explain"
```

### Step 3: Hybrid Merge
```typescript
// Semantic score: How similar is this prompt to yours?
// Range: 0 (different) to 1 (identical)
semanticScore = 1 - chromaDbDistance

// Text score: How well does this match your keywords?
// Range: 0 to 1 (normalized ts_rank)
textScore = normalizeRank(postgresRank)

// Hybrid score: Weighted combination
hybridScore = 0.6 * semanticScore + 0.4 * textScore

// Final ranking (top prompts to learn from):
results.sort((a, b) => b.hybridScore - a.hybridScore)
// Result: Top 5 best matching + highest scoring prompts
```

### Step 4: Claude Analysis
```
Claude receives:
1. Your low-scoring prompt: "What is AI?"
2. Top 5 similar high-scoring prompts from your app
3. Their patterns: ["has_context", "includes_examples", "specifies_format"]
4. Your scores: Groundedness 30%, Relevance 45%

Claude analyzes:
"Your prompt is too vague. High-scoring prompts in your domain:
- Add business context: 'What is AI in enterprise software?'
- Include examples: 'Give 3 real-world examples of AI'
- Specify format: 'Structure your answer as: Definition, Examples, Use Cases'

Root causes of low score:
1. Missing scope - You ask 'What is AI?' but don't specify domain
2. No examples requested - Users get generic answers without specifics
3. Undefined format - System doesn't know how to structure response

Recommendations:
1. Rephrase: 'Explain what AI is in the context of [your business]'
2. Add: 'Provide 3 concrete examples relevant to our industry'
3. Specify: 'Structure as: Definition → Examples → Comparison to X'"
```

### Step 5: Cache Result (1 hour)
```typescript
analysis = {
  rootCauses: [
    "Missing scope - no business context specified",
    "No examples requested",
    "Undefined output format"
  ],
  recommendations: [
    "Add business context to prompt",
    "Ask for specific examples",
    "Define expected format"
  ],
  patterns: ["missing_context", "no_examples", "undefined_format"],
  scoringExplanation: "Generic prompts score low..."
}

await redis.set(
  "analysis:tech-docs-app:a1b2c3d4",
  JSON.stringify(analysis),
  "EX",
  3600  // 1-hour TTL
)
```

### Step 6: Return to Frontend
```json
{
  "success": true,
  "data": {
    "rootCauses": [
      "Missing scope - no business context specified",
      "No examples requested",
      "Undefined output format"
    ],
    "recommendations": [
      "Try: 'Explain what AI is in the context of enterprise software'",
      "Try: 'List 3 real-world examples of AI in business'",
      "Try: 'Define AI, then compare it to automation and machine learning'"
    ],
    "patterns": ["missing_context", "no_examples", "undefined_format"]
  }
}
```

---

## Scaling to 600 Concurrent Testers

### Request Volume Analysis
```
Base: 100 apps × 6 testers per app = 600 concurrent
Each tester: 1 request per 30 seconds = 20 req/sec
Total: 12,000 requests/minute across all testers
```

### Optimization Strategy

**1. Aggressive Caching**
```
Layer 1: Redis (5-min TTL)
  - "What is AI?" → cached results
  - Same 5-min window = instant response

Layer 2: ChromaDB results cache (10-sec TTL)
  - Embedding queries for popular terms
  - 600 testers → high likelihood of overlap

Layer 3: Claude response cache (1-hour TTL)
  - Same prompt = identical suggestion
  - Share results across testers

Expected hit rate: 85%+
Impact: Avg response time 30ms (vs 2s uncached)
```

**2. Batch Processing**
```
Queue similar requests:
- If 10 testers ask about "AI" in 5 seconds
- Batch into 1 ChromaDB + 1 Claude call
- Return cached result to all 10
```

**3. Smart Fallback**
```
If Claude API rate-limited:
  → Return cached suggestion
  → Queue for retry in background
  → User never sees latency

If ChromaDB slow:
  → Use PostgreSQL text search only
  → Less precise but still useful
  → Graceful degradation
```

**4. Infrastructure Sizing**
```
ChromaDB: 1 instance (all apps share, in-memory)
PostgreSQL: Existing + FTS indexes
Redis: Standard tier (caching, sessions, pub/sub)
Claude API: Shared rate limit
```

---

## Data Privacy Guarantees

### Data Flow with Local RAG
```
┌─────────────────────────────────────────────┐
│         Frontend (User's Browser)           │
│   Only sees: Analysis + Recommendations    │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│   Microservice (Your Infrastructure)        │
│  - Receives: Prompt + Scores                │
│  - Process: Local ChromaDB + PostgreSQL    │
│  - Queries: Claude (optional, configurable)│
│  - Returns: Analysis only                  │
└─────────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────┐
│       Storage (Your Infrastructure)         │
│  - MongoDB: Full prompt history             │
│  - ChromaDB: Local embeddings               │
│  - PostgreSQL: Full-text indexes            │
│  - Redis: Session cache                     │
│  *** NO DATA LEAVES UNLESS EXTERNAL RAG *** │
└─────────────────────────────────────────────┘
```

### Privacy Guarantees
- ✅ Prompts never sent to vector DB APIs
- ✅ Embeddings stay local (ChromaDB)
- ✅ User can disable external RAG entirely
- ✅ Audit trail in MongoDB (what was analyzed, when, by whom)
- ✅ HIPAA-compliant (if needed)

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Add ChromaDB to infrastructure
- [ ] Create embedding generation pipeline
- [ ] Index all existing prompts
- [ ] Deploy Prompt Debugger service

### Week 2: Hybrid Search
- [ ] Add PostgreSQL full-text search
- [ ] Implement hybrid merge algorithm
- [ ] Optimize cache strategy
- [ ] Test with sample prompts

### Week 3: Root Cause Analysis
- [ ] Integrate Claude for analysis
- [ ] Test end-to-end flow
- [ ] Add "Debug" button to dashboard
- [ ] Load testing with concurrent users

### Week 4: Knowledge Integration
- [ ] Build settings UI for external RAG config
- [ ] Implement optional external RAG integration
- [ ] Add knowledge source management
- [ ] Test with multiple LLM providers

### Week 5: Tester Guidance
- [ ] Deploy Guidance service
- [ ] WebSocket implementation
- [ ] Real-time suggestion system
- [ ] Leaderboard tracking

### Week 6: Scaling & Polish
- [ ] Load test to 600 concurrent
- [ ] Optimize caching strategy
- [ ] Add monitoring & observability
- [ ] Production deployment

---

## Summary: Your Architecture Decision

| Component | Choice | Why |
|-----------|--------|-----|
| Primary RAG | ChromaDB (Local) | Privacy, cost, performance, control |
| Text Search | PostgreSQL FTS | Already available, simple hybrid |
| Embedding Storage | ChromaDB | Co-located with semantic search |
| Vector DB (Paid) | None needed | ChromaDB handles it locally |
| Caching | Redis | Performance, sessions, real-time |
| External RAG | Optional | User configurable per app |
| Microservices | 3 independent | Scales independently |
| For 600 Testers | Local-first + cache | 85% cache hit = 30ms responses |

**Result:** Fast, private, scalable system that learns from your domain-specific data while optionally validating against external knowledge sources.
