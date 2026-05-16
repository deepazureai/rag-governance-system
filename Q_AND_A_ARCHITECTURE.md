# Strategic Q&A: Recent Work, New Requirements, and Architecture

## Q1: What were the recent features added?

### Completed (Last 2 Weeks)
1. **Data Ingestion Pipeline**
   - CSV file reading from local folders
   - Automatic RAGAS evaluation framework integration
   - Batch processing orchestration
   - Results saved to MongoDB collections

2. **Dashboard Raw Data View**
   - Display raw ingested data
   - Show evaluation metrics (groundedness, relevance, fluency, etc.)
   - Support filtering and search

3. **Application Management**
   - Create applications with data source configuration
   - Automatic batch processing trigger
   - Evaluation metrics dashboard

4. **Production Readiness**
   - Eliminated all mock data (100% real API integration)
   - Strict TypeScript enforcement (no `any` types)
   - Build optimization and dependency cleanup

---

## Q2: Three New Requirements - Technical Breakdown

### Requirement 1: Root Cause Analysis for Low Scores
**User Problem:** "My prompt scored 30% on groundedness. Why? How do I fix it?"

**Proposed Solution:** Dedicated Prompt Debugger Service
- Compares user's prompt against high-scoring prompts in same app
- Uses LLM to analyze: "Why doesn't this response cite sources properly?"
- Returns: `{ rootCauses: [...], recommendations: [...] }`
- UI: "Debug" button on dashboard → shows breakdown → actionable fixes

**Why Microservice:** 
- Separate AI model for analysis (different use case from main app)
- Real-time analysis shouldn't block tester workflows
- Scales independently when many testers debug simultaneously

---

### Requirement 2: External Knowledge Integration (RAG + LLMs)
**User Problem:** "I want my RAG model to give feedback on prompts. And also try Claude."

**Proposed Solution:** Knowledge Integration Service
- Admin configures in app settings: "Use my Pinecone RAG + Claude API"
- When tester submits prompt: Service queries both RAG + Claude
- RAG provides domain context, Claude suggests improvements
- Returns: `{ externalFeedback, suggestedCorrections, newExpectedScore: "70" }`
- Caches responses to reduce API costs

**Why Microservice:**
- Managing multiple knowledge sources (RAG, Pinecone, Claude, GPT, custom)
- Each app has different configurations
- Needs persistent storage of configs and cache
- Prevents main backend from becoming "catch-all" service

---

### Requirement 3: Guidance System for 600 Testers Across 100 Apps
**User Problem:** "We have 600 testers. We need them to write better prompts across 100 apps. How do we guide them at scale?"

**Proposed Solution:** Real-time Tester Guidance Service
- Tester selects app, starts typing prompt
- WebSocket real-time suggestions: "Try asking for [X]"
- Shows: Current score vs. expected score
- Shows: Best practices and top scorer's prompt structure
- Leaderboard showing improvements

**Why Microservice:**
- WebSocket connections for 600 concurrent testers
- Needs Redis to track sessions in real-time
- Separate AI model for guidance generation
- Load scaling: guidance service can have 5 instances while debugger has 1
- Decoupled from main app - testers don't compete with admin workflows

---

## Q3: Should You Use Microservices vs. Monolith?

### Problem with Single Monolith Backend

If you add all three features to current backend (3000 LOC → 8000 LOC):

```
Backend Monolith (8000 LOC)
├── App Management
├── Data Ingestion
├── Evaluation Processing
├── Alert System        ← EXISTING
├── Root Cause Analysis ← NEW (Feature 1)
├── Knowledge Integration ← NEW (Feature 2)
│   ├── RAG integration
│   ├── LLM integrations (Claude, GPT, custom)
│   └── Config management
└── Guidance System ← NEW (Feature 3)
    ├── Real-time streaming
    ├── Session management
    └── Leaderboards
```

**Problems:**
- ❌ **Scaling Bottleneck**: 600 testers need guidance → entire backend slows down
- ❌ **Deployment Risk**: Bug in Root Cause → redeploy entire app (affects 100 running apps)
- ❌ **Technology Mismatch**: Guidance needs Redis + WebSockets, Debugger needs LLM context, Knowledge needs Vector DB
- ❌ **Code Complexity**: 8000 LOC becomes hard to reason about
- ❌ **Team Bottleneck**: Multiple engineers can't work in parallel (merge conflicts)
- ❌ **Resource Waste**: Each server instance runs all features (guidance, debugger, knowledge) even if only one is needed

### Solution: Three Focused Microservices

```
API Gateway (3000)
├─→ Main Backend (3000)
│   ├── App Management
│   └── Data Ingestion
│
├─→ Prompt Debugger (3001)
│   └── Root Cause Analysis
│
├─→ Knowledge Integration (3002)
│   └── RAG + LLM Config
│
└─→ Tester Guidance (3003)
    └── Real-time WebSocket Guidance
```

**Benefits:**
- ✅ **Independent Scaling**: 5 guidance service instances, 1 debugger instance
- ✅ **Safe Deployment**: Update debugger without touching main app
- ✅ **Right Tools**: Guidance uses Redis, Knowledge uses Vector DB
- ✅ **Team Velocity**: Team A owns Debugger, Team B owns Knowledge, Team C owns Guidance
- ✅ **Fault Isolation**: Guidance down? Users can still use main app features
- ✅ **Resource Efficiency**: Pay for guidance instances only when 600 testers active

---

## Q4: How to Implement as Independent Sub-Projects?

### Project Structure

```
v0-project/
├── frontend/                          (Next.js - unchanged)
├── backend/                           (Main service - 3000)
│   ├── src/
│   ├── package.json
│   └── Dockerfile
│
├── services/                          (NEW - Microservices)
│   ├── prompt-debugger/               (Service 1)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── models/
│   │   │   └── schemas/               (Zod validation)
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── knowledge-integration/         (Service 2)
│   │   ├── src/
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   ├── tester-guidance/               (Service 3)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── websocket/
│   │   │   ├── services/
│   │   │   └── schemas/               (Zod validation)
│   │   ├── package.json
│   │   └── Dockerfile
│   │
│   └── shared/                        (Shared utilities)
│       ├── src/
│       │   ├── db/                    (MongoDB connection)
│       │   ├── auth/                  (JWT verification)
│       │   ├── schemas/               (Common Zod schemas)
│       │   ├── types/                 (Shared TypeScript types)
│       │   └── logger/                (Centralized logging)
│       └── package.json
│
└── docker-compose.yml                 (Local development)
```

### Each Service Structure (Example: prompt-debugger)

```
prompt-debugger/
├── src/
│   ├── index.ts                       (Express server)
│   ├── routes/
│   │   └── analyzeRoutes.ts           (POST /api/debug/analyze-prompt)
│   ├── services/
│   │   ├── RootCauseAnalyzer.ts       (Business logic)
│   │   ├── LLMIntegration.ts          (Claude/GPT calls)
│   │   └── PatternDetector.ts         (Identify patterns)
│   ├── models/
│   │   └── database.ts                (MongoDB collection helpers)
│   ├── schemas/
│   │   └── validation.ts              (Zod schemas - TypeScript strict)
│   └── middleware/
│       ├── auth.ts                    (JWT validation)
│       └── errorHandler.ts            (Consistent error responses)
├── Dockerfile
├── docker-compose.yml                 (This service + MongoDB)
├── package.json
└── tsconfig.json                      (Strict mode)
```

### Key: TypeScript Strict Mode in Each Service

**Each service's tsconfig.json:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "strictNullChecks": true
  }
}
```

**Example: Validated API Handler with Zod**
```typescript
// schemas/validation.ts
import { z } from 'zod';

export const PromptAnalysisSchema = z.object({
  appId: z.string().uuid('Invalid app ID'),
  promptId: z.string().uuid('Invalid prompt ID'),
  scores: z.object({
    groundedness: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    fluency: z.number().min(0).max(100),
  }),
});

type PromptAnalysisRequest = z.infer<typeof PromptAnalysisSchema>;

// routes/analyzeRoutes.ts
async function handleAnalyzePrompt(
  req: Request,
  res: Response
): Promise<void> {
  // Runtime validation - catches bad requests
  const parsed = PromptAnalysisSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error });
    return;
  }

  const data: PromptAnalysisRequest = parsed.data;
  // Now TypeScript knows data shape at compile AND runtime
  
  const analysis = await RootCauseAnalyzer.analyze(data);
  res.json(analysis);
}
```

---

## Q5: TypeScript Best Practices - Going Forward

### Standards to Follow (From Document)

**1. Strict tsconfig.json in every service**
```json
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true,
  "noUncheckedIndexedAccess": true,
  "exactOptionalPropertyTypes": true
}
```

**2. No `any` types - use `unknown` with guards**
```typescript
// ❌ NEVER:
function process(data: any): any

// ✅ ALWAYS:
function process(data: unknown): ProcessResult {
  if (typeof data !== 'object' || data === null) {
    throw new Error('Invalid data');
  }
  // Safe to use data as object
}
```

**3. Runtime validation for external data (Zod)**
```typescript
// All API inputs validated at runtime
const UserInputSchema = z.object({
  prompt: z.string().min(1).max(5000),
  appId: z.string().uuid(),
});

const data = UserInputSchema.parse(req.body); // Throws if invalid
```

**4. Explicit types, no implicit inference**
```typescript
// ❌ Implicit:
const alerts = [];
alerts.push(someAlert); // alerts is any[]

// ✅ Explicit:
const alerts: Alert[] = [];
alerts.push(someAlert); // Type safe
```

**5. Optional chaining + nullish coalescing, no non-null assertions**
```typescript
// ❌ Dangerous:
const name = user!.profile!.name; // Crashes if null

// ✅ Safe:
const name = user?.profile?.name ?? 'Unknown';
```

---

## Implementation Checklist

### Before Writing Any Code:
- [ ] Read `/ARCHITECTURE_PLAN_NEW_FEATURES.md`
- [ ] Understand 3-service approach
- [ ] Set up TypeScript strict mode in each service
- [ ] Create shared utilities package
- [ ] Set up Zod validation schemas

### Phase 1 - Prompt Debugger (Start Here):
- [ ] Create `services/prompt-debugger/` scaffold
- [ ] Implement Zod schemas for input validation
- [ ] Create MongoDB collection helpers in shared package
- [ ] Implement `RootCauseAnalyzer` service
- [ ] Wire LLM integration (Claude)
- [ ] Create `/api/debug/analyze-prompt` endpoint
- [ ] Connect to frontend dashboard

### Phase 2 - Knowledge Integration:
- [ ] Create `services/knowledge-integration/` scaffold
- [ ] Implement RAG model connector
- [ ] Implement LLM selector and caller
- [ ] Create app settings UI tab
- [ ] Implement config validation

### Phase 3 - Tester Guidance:
- [ ] Create `services/tester-guidance/` scaffold
- [ ] Implement WebSocket server
- [ ] Implement real-time suggestion generation
- [ ] Build tester dashboard UI
- [ ] Implement Redis session management

### Phase 4 - Integration:
- [ ] Set up API Gateway
- [ ] Wire service-to-service auth
- [ ] Implement cross-service caching
- [ ] Load test with 100+ concurrent connections
- [ ] Deploy to production

---

## Why This Approach Wins

1. **Team Growth**: Hire specialists per service (AI/ML engineer for Debugger, Backend engineer for Knowledge, Full-stack for Guidance)
2. **Time to Market**: 3 teams work in parallel, not sequential
3. **Maintenance**: Each service owner understands their 1-2k LOC deeply
4. **Scaling**: Black Friday? 600 testers using Guidance? Scale just that service
5. **Technology**: Use best tools for each job (Redis, Vector DB, WebSockets where needed)
6. **Quality**: Strict TypeScript in each service from day one = fewer bugs
7. **Future**: Easy to add Service 4, 5, 6 without touching existing code

This is the architecture used by Stripe, Slack, Uber for their platforms.
