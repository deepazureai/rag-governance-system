# Visual Architecture Reference

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
│  Dashboard | Settings | Explore | Tester Dashboard (NEW)           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │ HTTP/WebSocket
                           ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY (Kong/Express)                      │
│  - Route to correct service                                         │
│  - JWT validation                                                   │
│  - Rate limiting                                                    │
└─┬──────────────┬──────────────┬──────────────┬─────────────────────┘
  │              │              │              │
  ▼              ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  Main API  │ │  Debugger  │ │ Knowledge  │ │ Guidance   │
│  (Port     │ │  Service   │ │ Service    │ │ Service    │
│   3000)    │ │ (Port 3001)│ │(Port 3002) │ │(Port 3003) │
└┬───────────┘ └┬───────────┘ └┬───────────┘ └┬───────────┘
 │              │              │              │
 │ ┌────────────┤              │              │
 │ │            │              │              │
 ▼ ▼            ▼              ▼              ▼
MongoDB      MongoDB       MongoDB       MongoDB + Redis
(Shared)     Cache         Cache         (Session Cache)
             
  Vector DB ←────────────────────────────────
  (RAG Integration)
```

---

## Service Deployment

```
Production Deployment (Vercel)
├── api/debug/*          ─────→ Debugger Service (1 instance)
├── api/knowledge/*      ─────→ Knowledge Service (1 instance)
├── api/guidance/*       ─────→ Guidance Service (5 instances)
│                               (Auto-scales based on tester load)
├── api/apps/*           ─────→ Main Backend Service (2 instances)
└── [Frontend]           ─────→ Vercel Static Hosting

Database
├── MongoDB (Shared Atlas)
│   ├── applicationmasters
│   ├── rawdatarecords
│   ├── evaluationrecords
│   ├── prompt_debug_cache
│   ├── app_knowledge_configs
│   ├── knowledge_cache
│   ├── tester_guidance_sessions
│   ├── guidance_effectiveness
│   └── prompt_templates
│
├── Redis (Shared Upstash)
│   └── Tester sessions cache (for 600 concurrent connections)
│
└── Vector DB (Pinecone/Weaviate)
    └── RAG embeddings for knowledge integration
```

---

## Request Flow Examples

### Example 1: Tester Clicks "Debug" on Low Score

```
Frontend Dashboard (Black Screen View)
    │
    │ Click "Debug" button on prompt with 30% groundedness
    │
    ▼
POST /api/debug/analyze-prompt
{
  appId: "app-123",
  promptId: "prompt-456",
  scores: { groundedness: 30, relevance: 45, fluency: 70 },
  responseText: "...",
  promptText: "..."
}
    │
    ▼
API Gateway validates JWT
    │
    ▼
Route to → Debugger Service (Port 3001)
    │
    ▼
Zod validates request schema
    │
    ├─ if invalid → 400 error + details
    │
    ├─ if valid → continue
    │
    ▼
RootCauseAnalyzer identifies:
  - Groundedness: 30 (LOW)
  - Relevance: 45 (LOW)
  - Fluency: 70 (OK)
    │
    ▼
Call Claude for each low metric:
  ├─ "Why groundedness 30?" → Claude analyzes
  ├─ "Why relevance 45?" → Claude analyzes
  └─ Generate recommendations for each
    │
    ▼
Save analysis to MongoDB cache
    │
    ▼
Return JSON:
{
  rootCauses: [
    { metric: "groundedness", score: 30, issue: "...", recommendations: [...] }
  ],
  recommendations: [...],
  topSimilarPrompts: [...]
}
    │
    ▼
Frontend displays in right panel
    │
    └─→ Tester reads recommendations
        └─→ Tries improved prompt
            └─→ Score improves 30% → 65% ✅
```

---

### Example 2: Admin Configures RAG Model

```
Settings → Applications → Select App → "External Knowledge" Tab
    │
    │ Click "Add Knowledge Source"
    │
    ▼
Form appears:
  - Source Type: RAG Model
  - URL: https://api.pinecone.io/...
  - API Key: [REDACTED]
    │
    │ Click "Test Connection"
    │
    ▼
POST /api/knowledge/validate-source
{
  sourceType: "rag_model",
  credentials: { url: "...", apiKey: "..." }
}
    │
    ▼
Knowledge Integration Service:
  ├─ Call Pinecone API to test connection
  ├─ Validate API key works
  ├─ Check for existing embeddings
  └─ Return { isValid: true, status: "Connected" }
    │
    ▼
Frontend shows ✅ "Connected"
    │
    │ Admin clicks "Save"
    │
    ▼
POST /api/knowledge/configure
{
  appId: "app-123",
  sourceType: "rag_model",
  config: { url: "...", apiKey: "..." }
}
    │
    ▼
Knowledge Service saves to MongoDB:
  app_knowledge_configs collection
    │
    ▼
From now on, all prompts in this app get RAG feedback ✅
```

---

### Example 3: 600 Testers Getting Real-Time Guidance

```
Tester 1 logs in                Tester 2 logs in          ... Tester 600 logs in
  │                                │                               │
  └────────────────┬───────────────┴───────────────────────────────┘
                   │
                   ▼
        WebSocket connections → Guidance Service
                   │
                   ├─ Maintain Redis session for each tester
                   ├─ Track: { testerId, appId, currentScore, ... }
                   │
                   ▼
        Tester 1 types prompt in App #5
                   │
                   ├─ WebSocket: { appId: 5, prompt: "...", score: 45 }
                   │
                   ▼
        Guidance Service receives
                   │
                   ├─ Check Redis cache for App #5 patterns (exists from prev testers)
                   ├─ Call Claude: "How to improve [prompt] for [app context]"
                   ├─ Return suggestion within 1 second
                   │
                   ▼
        WebSocket sends back: { suggestions: [...] }
                   │
                   ▼
        Frontend displays in real-time (no page refresh)
                   │
                   ▼
        Tester sees and accepts suggestion
                   │
                   └─ Result tracked in effectiveness collection
                      └─ Other testers benefit from cached pattern ✅
```

---

## TypeScript Type Safety Flow

```
External Data (API Request)
    │
    ▼
Zod Schema Validation
  ├─ Type check (is appId a valid UUID?)
  ├─ Range check (is score 0-100?)
  ├─ Length check (is text < 5000 chars?)
  │
  ├─ if invalid → 400 + error details
  │
  └─ if valid → parsed.data has correct type
    │
    ▼
TypeScript Type System
  ├─ Compiler knows exact shape of data
  ├─ IDE autocomplete works perfectly
  ├─ No `any` types ever used
  │
    ▼
Type Guards on External APIs
  ├─ Claude API response checked with isClaudeResponse()
  ├─ Pinecone response checked with isPineconeResponse()
  ├─ If structure invalid → Error immediately
  │
    ▼
Optional Chaining + Nullish Coalescing
  ├─ data?.user?.name ?? "Unknown"
  ├─ Never crashes on undefined
  │
    ▼
Error Handling
  ├─ Catch specific error types
  ├─ Log with context
  ├─ Return meaningful messages
```

---

## Database Schema Per Service

### Main Backend
```javascript
db.applicationmasters → {
  id, name, description, createdAt, updatedAt
}

db.batchprocesses → {
  id, appId, status, progress, createdAt, completedAt
}

db.rawdatarecords → {
  id, appId, batchId, sourceType, content, metadata, savedAt
}

db.evaluationrecords → {
  id, rawDataRecordId, metrics: { groundedness, relevance, ... }, timestamp
}
```

### Debugger Service
```javascript
db.prompt_debug_cache → {
  promptId, appId, analysis: { rootCauses, recommendations }, savedAt
}

db.metric_patterns → {
  appId, metric, issues, frequency, topFixes
}
```

### Knowledge Integration Service
```javascript
db.app_knowledge_configs → {
  appId, sourceType, config: { url, apiKey, ... }, status, lastSync
}

db.knowledge_cache → {
  promptHash, appId, feedback, generatedAt, expiresAt
}
```

### Guidance Service
```javascript
db.tester_guidance_sessions → {
  testerId, appId, sessionStarted, lastActivity, suggestionsApplied
}

db.guidance_effectiveness → {
  testerId, appId, originalScore, guidedScore, improvement, timestamp
}

db.prompt_templates → {
  appId, category, template, examples, successRate
}
```

---

## Monitoring & Alerts

```
Each Service Reports:
├─ Response time (should be < 1000ms)
├─ Error rate (should be < 1%)
├─ API call count
├─ Database query time
└─ Cache hit rate

Dashboard Shows:
├─ Guidance Service: 5 instances × 600 connections = 3000 concurrent
├─ Debugger Service: 120 analysis requests/hour avg
├─ Knowledge Service: Cache hit rate 85%
└─ Main Backend: Database query time 45ms avg
```

---

## Scaling Strategy

### Current Load (Phase 1)
```
- 10-20 concurrent app creators
- 50-100 testers at peak
- 100 applications
→ Single instance per service, 2 instances main backend
```

### Future Load (6 months)
```
- 100+ concurrent app creators
- 600 testers at peak
- 100+ applications
→ Guidance Service: 5 instances (auto-scale)
  Main Backend: 3 instances (auto-scale)
  Debugger: 2 instances
  Knowledge: 2 instances
```

### Redis Usage
```
Guidance Service at capacity:
├─ 600 active tester sessions
├─ ~10KB per session = 6MB total
├─ Connection pool: 100 concurrent
└─ Cache: 1GB for patterns + embeddings
```

This is production-ready architecture. Ready to implement Phase 1? ✅
