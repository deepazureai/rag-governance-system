# Local RAG + Hybrid Search Architecture

## Strategic Decision: Why Local RAG for This Application

### Problem Statement
You have 3 new requirements that need intelligent context:
1. **Root cause analysis** - Why did groundedness score drop from 70 to 30?
2. **Knowledge feedback** - What do other RAG models suggest for this prompt?
3. **Tester guidance** - How do I write better prompts for this business context?

### Option Analysis

| Approach | Pros | Cons | Best For |
|----------|------|------|----------|
| **External RAG Only** | Less infrastructure | Vendor lock-in, latency, costs, privacy concerns | Quick prototyping |
| **Local RAG Only** | Full control, privacy, no API costs, consistent | Infrastructure burden | Production with proprietary data |
| **Hybrid (Local + External)** | Best of both, validation layer, privacy-first | More complex | Enterprise production systems |

### Recommendation: **Hybrid Approach (Local Primary + External Optional)**

**Local RAG will be the primary system:**
- Index all prompts, evaluation results, and scoring patterns
- Provide real-time recommendations based on your business context
- Serve as the source of truth for "how to prompt well in your domain"
- Store everything locally = no data leakage

**External RAG as optional secondary validator:**
- User can configure external RAG per application
- Used for "second opinion" on corrections
- Runs async, doesn't block critical path
- Integrated in Knowledge Integration Service

---

## Technology Stack: Local RAG + Hybrid Search

### Storage Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                 │
└─────────────────────────────────────────────────────┘
                           │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌─────────┐      ┌──────────────┐  ┌──────────────┐
    │ MongoDB │      │ PostgreSQL   │  │    Redis     │
    │  (Core) │      │  (Full-Text) │  │  (Cache)     │
    └─────────┘      └──────────────┘  └──────────────┘
         │                  │                  │
         └──────────────────┼──────────────────┘
                           │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
    │  ChromaDB   │  │  LLM Cache   │  │   Sessions   │
    │  (Semantic) │  │   (Redis)    │  │   (Redis)    │
    └─────────────┘  └──────────────┘  └──────────────┘
         │
    ┌─────────────────────────────────────────┐
    │  3 Microservices Using Local RAG        │
    ├─────────────────────────────────────────┤
    │ 1. Prompt Debugger (ChromaDB + LLM)     │
    │ 2. Knowledge Integration (ChromaDB)     │
    │ 3. Tester Guidance (ChromaDB + Redis)   │
    └─────────────────────────────────────────┘
```

### Component Roles

#### 1. **ChromaDB** (Local Vector Database)
**Purpose:** Semantic search on prompts and evaluation data

**Why ChromaDB:**
- Open-source, no external dependencies
- Runs locally (serverless compatible)
- Supports similarity search on embeddings
- Simple Python/JS SDK
- HIPAA/SOC2 compliant (no data leaves your infrastructure)

**What gets indexed:**
```
Prompt Document Structure:
{
  id: "prompt_uuid",
  appId: "app_uuid",
  text: "What is the capital of France?",
  category: "geography",
  tags: ["history", "facts"],
  evaluationScores: {
    groundedness: 95,
    relevance: 92,
    fluency: 98,
    coherence: 96,
    overall: 95.25
  },
  responseText: "The capital of France is Paris...",
  embedding: [0.123, 0.456, ...], // Generated via OpenAI/local model
  createdAt: "2024-05-16",
  metadata: { framework: "RAGAS", model: "gpt-4", version: 1 }
}
```

**Hybrid Search Implementation:**
```typescript
// Semantic search (ChromaDB)
const similarPrompts = await chroma.query({
  queryEmbeddings: [promptEmbedding],
  nResults: 10,
  where: { appId: appId }
});

// Text search (PostgreSQL FTS)
const keywordMatches = await db.query(`
  SELECT * FROM prompts 
  WHERE appId = $1 
  AND to_tsvector('english', text || ' ' || tags) 
      @@ plainto_tsquery('english', $2)
  ORDER BY ts_rank(...) DESC
  LIMIT 10
`);

// Combine results (Hybrid)
const hybridResults = combineResults(
  similarPrompts,
  keywordMatches,
  weights: { semantic: 0.6, keyword: 0.4 }
);
```

#### 2. **PostgreSQL Full-Text Search**
**Purpose:** Fast keyword and text pattern matching

**Why PostgreSQL (not Elasticsearch):**
- Already running in your stack (likely)
- Native FTS capabilities (tsvector, tsquery)
- No additional infrastructure
- Great for indexing tags, categories, patterns

**Indexed columns:**
- `text` - The prompt itself
- `tags` - Business-context tags
- `response_text` - The LLM response
- `metric_patterns` - Identified patterns

#### 3. **Redis** (Not for Vector DB - for Caching & Sessions)
**Purpose:** Performance caching, real-time sessions, leaderboards

**What goes in Redis:**
```
Keys:
- cache:embedding:{prompt_id} → Pre-calculated embeddings
- cache:analysis:{prompt_id} → Root cause analysis results
- cache:recommendation:{app_id}:{metric} → Latest recommendations
- session:tester:{tester_id} → Active testing session
- leaderboard:{app_id}:day → Daily leaderboard scores
- rate_limit:tester:{tester_id} → API rate limiting
```

**Why NOT use Redis as primary vector DB:**
- Redis doesn't do semantic search natively
- Redis Bloom filters exist but are limited
- Redis is for temporal/cache data, not analytical

---

## Service-Specific Architecture

### Service 1: Prompt Debugger Service
**Builds understanding of what makes prompts fail**

```typescript
// Root Cause Analysis Flow
1. User clicks "Debug" on low-scoring prompt
2. Query ChromaDB for similar HIGH-scoring prompts
   → SELECT prompts WHERE semantic_similarity > 0.8 AND overall_score > 85
3. Compare metrics: Low (30) vs High (90)
   → What changed? Structure? Terminology? Context?
4. Generate root cause via Claude:
   "Your prompt lacks specific entities. High-scoring prompts 
    include: [entity1], [entity2]. Try rephrasing to include these."
5. Cache analysis in Redis (1-hour TTL)
6. Store pattern in MongoDB for learning
```

**ChromaDB Integration:**
```typescript
interface DebuggerService {
  analyzePrompt(appId: string, promptId: string): Promise<{
    rootCauses: string[];
    recommendations: string[];
    similarHighScoringPrompts: ChromaDocument[];
    scoreTrends: MetricTrend[];
  }>;
  
  getSimilarPrompts(
    embedding: number[],
    appId: string,
    minScore: number = 85
  ): Promise<ChromaDocument[]>;
}
```

### Service 2: Knowledge Integration Service
**Connects to external RAG + manages local knowledge**

```
Per-Application Configuration:
{
  appId: "app_123",
  knowledgeSources: [
    {
      type: "local_rag",
      enabled: true,
      provider: "chromadb",
      indexedDocuments: 5000,
      lastUpdated: "2024-05-16"
    },
    {
      type: "external_rag",
      enabled: true,
      provider: "anthropic_claude",
      config: { model: "claude-3-opus", temperature: 0.7 }
    },
    {
      type: "external_llm",
      enabled: false,
      provider: "openai",
      config: { model: "gpt-4", temperature: 0.5 }
    }
  ]
}
```

**Flow:**
1. User enables "Get feedback from RAG" for App X
2. Admin uploads business context docs to local ChromaDB
3. When tester writes prompt, service:
   - Query ChromaDB for relevant context from domain docs
   - Optionally call external Claude for validation
   - Combine both perspectives
   - Return: "Based on your business docs, here's a better phrasing..."

**Hybrid search in action:**
```typescript
async function getKnowledgeFeedback(
  appId: string,
  prompt: string,
  currentScore: number
): Promise<KnowledgeFeedback> {
  // 1. Semantic search in local RAG
  const relevantDocs = await chromaDB.query({
    queryEmbeddings: [await generateEmbedding(prompt)],
    where: { appId: appId },
    nResults: 5
  });

  // 2. Text search for keywords
  const keywordDocs = await postgresDB.query(`
    SELECT * FROM knowledge_docs
    WHERE appId = $1 AND text @@ websearch_to_tsquery($2)
    LIMIT 5
  `, [appId, extractKeywords(prompt)]);

  // 3. Combine using hybrid scoring
  const combinedContext = mergeSearchResults(relevantDocs, keywordDocs);

  // 4. Generate feedback via Claude
  const feedback = await claude.generate({
    systemPrompt: `You are an expert at improving prompts for: ${combinedContext}`,
    userPrompt: `How can I improve this prompt? Current score: ${currentScore}%`
  });

  return { feedback, relevantContext: combinedContext };
}
```

### Service 3: Tester Guidance Service
**Real-time suggestions for 600 concurrent testers**

```
Architecture for 600 concurrent testers:
1. WebSocket connections for real-time updates
2. Redis pub/sub for tester → service communication
3. ChromaDB queries cached in Redis (10-second TTL)
4. Leaderboard updated in Redis (sorted set)
```

**Real-time flow:**
```
Tester types prompt:
  ↓
Service queries ChromaDB (cached in Redis)
  ↓
Finds top-3 similar high-scoring prompts
  ↓
Generates 2-3 suggestions via Claude
  ↓
Caches result in Redis (key: hash(prompt) + app_id)
  ↓
Sends to tester via WebSocket
  ↓
Updates leaderboard if tester submits
```

**Redis usage:**
```typescript
// Real-time session
redis.set(`session:${testerId}:app_${appId}`, JSON.stringify({
  activePrompt: "...",
  score: 87.5,
  suggestions: [...],
  timestamp: Date.now()
}), 'EX', 3600); // 1-hour session

// Leaderboard
redis.zadd(`leaderboard:${appId}:day`, score, testerId);
redis.expire(`leaderboard:${appId}:day`, 86400); // 24 hours

// Cache embedding
redis.set(`embedding:${promptHash}`, JSON.stringify(embedding), 'EX', 3600);
```

---

## Data Flow: End-to-End Example

### Scenario: Tester Gets Real-Time Guidance

```
1. TESTER TYPES PROMPT
   Input: "What is AI?"
   App: "Technical Documentation"
   
2. SERVICE RECEIVES (via WebSocket)
   - Generate embedding locally
   - Check Redis cache for similar prompts
   
3. CACHE MISS → QUERY CHROMADB
   Query: {
     embedding: [0.123, 0.456, ...],
     appId: "tech_docs_app",
     where: { overall_score: { $gte: 80 } }
   }
   Result: Top 5 similar high-scoring prompts
   
4. EXTRACT PATTERNS FROM RESULTS
   High-scoring prompts have:
   - Clear scope ("What is X in the context of Y?")
   - Specific examples ("Give 3 examples of...")
   - Expected format ("Structure your response as...")
   
5. GENERATE SUGGESTIONS VIA CLAUDE
   Prompt to Claude:
   "Based on these high-scoring prompts in our system, 
    how can I improve this prompt: 'What is AI?'
    
    Examples of similar high-scoring prompts:
    [list from ChromaDB]
    
    Suggest 2-3 improvements."
   
6. CACHE RESULT IN REDIS
   Key: `suggestion:hash(prompt):${appId}`
   TTL: 5 minutes
   
7. SEND TO TESTER IMMEDIATELY
   Via WebSocket: {
     suggestions: [
       "What is AI in the context of enterprise software?",
       "Explain AI with 3 business examples",
       "Define AI, then show how it compares to ML"
     ],
     scoringExpected: [89, 91, 88],
     pattern: "Add scope, examples, and structure"
   }
   
8. TESTER SUBMITS BEST SUGGESTION
   → Stored in MongoDB
   → Added to ChromaDB for next search
   → Leaderboard updated in Redis
   → Pattern logged for future reference
```

---

## Deployment & Scaling

### Local Development
```bash
# Start local services
docker-compose up -d chromadb postgres redis

# Each service runs independently
npm run dev:debugger
npm run dev:knowledge
npm run dev:guidance
```

### Production Deployment
```
- ChromaDB: Vercel KV (Redis-compatible) or self-hosted
- PostgreSQL: AWS RDS or Neon (existing)
- Redis: Upstash or self-hosted
- Services: Vercel Functions or Docker containers
```

### Scaling for 600 Concurrent Testers
```
1. ChromaDB Queries: Cache aggressively (Redis)
   - 600 testers hitting ChromaDB = bottleneck
   - Cache embeddings for 10 seconds
   - Cache analysis results for 60 seconds
   
2. Claude Calls: Batch & queue with rate limiting
   - Use SQS/Redis Streams for queuing
   - Batch similar requests
   - Fallback to cached suggestions if rate limit hit
   
3. WebSocket Connections: Use pub/sub
   - Redis pub/sub for broadcast updates
   - One connection per tester = efficient
   - Heartbeat every 30 seconds
```

---

## Migration Path from Current Monolith

### Phase 1 (Week 1): Add ChromaDB
- Index all existing prompts + scores
- Implement basic semantic search
- No breaking changes to existing dashboard

### Phase 2 (Week 2-3): Launch Prompt Debugger Service
- Deploy debugger microservice
- Add "Debug" button to dashboard
- Use ChromaDB for root cause analysis

### Phase 3 (Week 4): Launch Knowledge Integration Service
- Allow admins to upload business context docs
- Integrate with external RAG (optional)
- Settings UI for per-app configuration

### Phase 4 (Week 5-6): Launch Tester Guidance Service
- Deploy guidance service with WebSocket support
- Real-time suggestions for testers
- Leaderboard system

---

## TypeScript Implementation Pattern

```typescript
// Strict types from day 1
import { z } from 'zod';

// Validation schemas
const PromptDocumentSchema = z.object({
  id: z.string().uuid(),
  appId: z.string().uuid(),
  text: z.string().min(5).max(5000),
  embedding: z.array(z.number()).length(1536), // OpenAI embedding
  evaluationScores: z.object({
    groundedness: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    fluency: z.number().min(0).max(100),
    coherence: z.number().min(0).max(100),
    overall: z.number().min(0).max(100)
  }),
  createdAt: z.date(),
  metadata: z.record(z.any()).optional()
});

type PromptDocument = z.infer<typeof PromptDocumentSchema>;

// Service implementation
class DebuggerService {
  private chromaDB: Chroma;
  private llmClient: Anthropic;
  private redis: Redis;

  async analyzePrompt(
    appId: string,
    promptId: string
  ): Promise<RootCauseAnalysis> {
    // Runtime validation
    if (!appId?.match(/^[0-9a-f-]{36}$/)) {
      throw new Error(`Invalid appId: ${appId}`);
    }

    // Type-safe query
    const prompt = await this.getPrompt(promptId);
    const similar = await this.querySimilarHighScoring(
      prompt.embedding,
      appId
    );

    // Guaranteed type safety
    const analysis: RootCauseAnalysis = {
      rootCauses: [],
      recommendations: [],
      similarPrompts: similar
    };

    return analysis;
  }
}
```

---

## Summary: Local RAG + Hybrid Search Decision

| Component | Technology | Why |
|-----------|-----------|-----|
| Semantic Search | ChromaDB | Local, open-source, no vendor lock-in |
| Text Search | PostgreSQL FTS | Already available, tsvector powerful |
| Caching | Redis | Performance, real-time sessions, leaderboards |
| Embeddings | OpenAI API | Simple integration, high quality |
| LLM | Claude/GPT | External optional, not required for core RAG |
| Primary Storage | MongoDB | Existing, reliable, stores evaluation data |
| Microservices | 3 independent | Scales to 600 testers, parallel development |

**This approach gives you:**
- ✅ Full control over prompt data (privacy)
- ✅ Fast local RAG (no external latency)
- ✅ Optional external validation (flexibility)
- ✅ Hybrid search (semantic + keyword)
- ✅ Scales to 600 concurrent users
- ✅ TypeScript strict mode throughout
