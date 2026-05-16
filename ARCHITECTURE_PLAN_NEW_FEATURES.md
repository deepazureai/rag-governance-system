# New Features Architecture Plan - Microservices Approach

## Executive Summary

**Recent Work Completed:**
- ✅ Complete data ingestion pipeline (CSV → RAGAS evaluation → MongoDB)
- ✅ Application creation and dashboard display
- ✅ Batch processing and evaluation metrics collection
- ✅ Eliminated mock data in favor of real API integration
- ✅ TypeScript strict mode enforcement

**New Requirements:**
1. Root Cause Analysis - Debug low-scoring prompts with actionable insights
2. External Knowledge Integration - RAG models and configurable LLM feedback per application
3. Guidance System - AI-powered prompt optimization for 600+ testers across 100+ apps

---

## Architecture Recommendation: Microservices Approach

### Why Microservices Over Monolith?

| Concern | Monolith | Microservices |
|---------|----------|---------------|
| **Scalability** | Single service bottleneck | Each service scales independently |
| **Complexity** | Single codebase grows unwieldy (10k+ LOC) | Focused services (1-2k LOC each) |
| **AI Model Integration** | RAG, LLM, Debug all in same process | Separate services for each AI concern |
| **Deployment** | Entire app redeploys for bug fix | Deploy only affected service |
| **Team Velocity** | Merge conflicts on shared code | Teams own independent services |
| **Resource Usage** | One app uses resources for all features | Scale only what's needed |
| **Tester Guidance System** | 600 concurrent testers cause load spikes | Dedicated guidance service handles load |

**Decision: 3 Focused Microservices + API Gateway**

---

## Microservices Architecture

### Service 1: Prompt Debugger Service
**Purpose:** Root cause analysis for low-scoring prompts

**Responsibilities:**
- Analyze prompt-response pairs with low evaluation scores
- Identify which metrics are causing low scores (groundedness, relevance, fluency, etc.)
- Provide actionable insights: "Relevance score 30% - response doesn't address user intent"
- Generate debugging recommendations: "Try rephrasing to include [key terms]"
- Compare against high-scoring similar prompts to identify patterns

**Tech Stack:**
- Node.js + Express
- MongoDB for prompt history and analysis cache
- LLM integration (Claude/GPT) for root cause analysis
- Internal: Port 3001

**API Endpoints:**
```
POST /api/debug/analyze-prompt
  { appId, promptId, scores, responseText }
  → { rootCauses, recommendations, similarHighScoringPrompts }

GET /api/debug/metrics-breakdown/:promptId
  → { metricAnalysis, scoreTrends, recommendations }

GET /api/debug/prompt-patterns/:appId
  → { lowScoringPatterns, commonIssues, fixes }
```

**Database Collections:**
- `prompt_debug_cache` - Store analysis results
- `metric_patterns` - Store identified patterns per app
- `recommendation_history` - Track which recommendations improved scores

---

### Service 2: Knowledge Integration Service
**Purpose:** Integrate external knowledge sources (RAG, LLMs, enterprise data) per application

**Responsibilities:**
- Manage per-application external knowledge source configurations
- Interface with user's own RAG models
- Call external LLMs for feedback (Claude, GPT, open-source)
- Cache knowledge sources for performance
- Provide corrected prompt suggestions based on external feedback

**Tech Stack:**
- Node.js + Express
- MongoDB for configuration and cache
- Vector DB integration (Pinecone/Weaviate for RAG)
- LangChain for prompt chaining
- Internal: Port 3002

**API Endpoints:**
```
POST /api/knowledge/configure
  { appId, sourceType, config }
  → Configure RAG model or external LLM

POST /api/knowledge/get-feedback
  { appId, prompt, currentScore }
  → { externalFeedback, suggestedCorrections, newExpectedScore }

GET /api/knowledge/sources/:appId
  → { configuredSources, status, lastSync }

POST /api/knowledge/validate-source
  { sourceType, credentials }
  → { isValid, errorMessage }
```

**Settings UI Tab:**
- "External Knowledge" tab in Application Settings
- Connect RAG model: URL + API key
- Connect LLM: Provider + API key + model selection
- Test connection button
- Knowledge source status dashboard

**Database Collections:**
- `app_knowledge_configs` - Store per-app external source configurations
- `knowledge_cache` - Cache feedback to reduce API calls
- `feedback_history` - Track feedback over time

---

### Service 3: Tester Guidance Service
**Purpose:** AI-powered guidance system for 600+ testers testing 100+ apps

**Responsibilities:**
- Provide real-time prompt optimization suggestions for testers
- Analyze tester's current prompt against app's evaluation baseline
- Suggest prompt structures and phrasing for maximum scoring
- Generate guidance based on application's business context
- Track guidance effectiveness across all testers
- Provide prompt templates and best practices per app

**Tech Stack:**
- Node.js + Express + WebSocket (for real-time guidance)
- MongoDB for guidance cache and effectiveness tracking
- Redis for real-time session management (handle 600 concurrent testers)
- Claude API for context-aware guidance generation
- Internal: Port 3003

**API Endpoints:**
```
POST /api/guidance/suggest
  { appId, currentPrompt, currentScore }
  → { suggestions, promptTemplate, contextualTips, expectedScore }

GET /api/guidance/best-practices/:appId
  → { industryStandards, topScoringPrompts, patterns }

POST /api/guidance/track-result
  { appId, testerId, originalPrompt, guidedPrompt, scoreImprovement }
  → { trackingId, aggregatedStats }

WS /ws/guidance/:appId/:testerId
  Subscribe to real-time guidance stream

GET /api/guidance/leaderboard/:appId
  → { topTesters, averageScores, improvements }

GET /api/guidance/app-context/:appId
  → { businessContext, expectedMetrics, industryBenchmarks }
```

**Database Collections:**
- `tester_guidance_sessions` - Real-time session tracking
- `guidance_effectiveness` - Track which guidance improves scores
- `prompt_templates` - Store per-app best-practice templates
- `tester_leaderboards` - Aggregate performance metrics

**Features for Testers:**
- Real-time suggestion sidebar while typing prompts
- "Why did my prompt score low?" instant analysis
- Prompt template picker with examples
- "Apply guidance" button to auto-populate suggestions
- Leaderboard to see top performers and their strategies

---

## API Gateway Layer

**Purpose:** Single entry point, route requests to appropriate service, handle auth

**Tech Stack:**
- Kong or Node.js + Express middleware
- JWT validation
- Request rate limiting (especially for guidance service)
- Load balancing

**Routes:**
```
/api/debug/* → Prompt Debugger Service (3001)
/api/knowledge/* → Knowledge Integration Service (3002)
/api/guidance/* → Tester Guidance Service (3003)
/api/apps/* → Main Backend Service (3000) [existing]
```

---

## Frontend Integration

### Dashboard Updates

**Raw Data Tab Changes:**
- Black screen background (as discussed)
- Right panel with "Debug" button
- Click "Debug" → shows root cause analysis from Prompt Debugger Service
- Shows which metrics are causing low scores
- Actionable recommendations

### New Application Settings Tab
**"External Knowledge" Tab:**
- RAG Model configuration with test button
- LLM selection (Claude, GPT, custom)
- Credentials management
- Knowledge source status
- Sync history

### New Tester Dashboard (for testers, not admin)
**Guidance-Focused UI:**
- App selector (pick from 100 apps)
- Prompt input box
- Real-time suggestions sidebar
- Current score vs. expected score
- "Apply suggestion" button
- Best practices panel
- Leaderboard

---

## Data Flow Examples

### Example 1: Root Cause Analysis
```
Tester sees low score (groundedness: 30%) on dashboard
↓
Clicks "Debug" button
↓
Frontend calls: POST /api/debug/analyze-prompt
↓
Prompt Debugger Service:
  - Compares to high-scoring prompts in same app
  - Analyzes response against evaluation rubric
  - Calls LLM: "Why does this response score low on groundedness?"
↓
Returns:
  {
    rootCauses: [
      "Response includes speculative information not in source",
      "Missing citation of supporting evidence"
    ],
    recommendations: [
      "Add 'Based on the provided context...'",
      "Reference specific paragraphs in source material"
    ]
  }
↓
Dashboard displays analysis and recommendations
```

### Example 2: External Knowledge Feedback
```
Admin configures RAG model in settings
↓
Tester submits prompt in guidance service
↓
Tester Guidance Service:
  - Sends prompt to Knowledge Integration Service
  - Knowledge Service queries RAG model
  - RAG returns domain-specific context
  - Calls external LLM with both user's prompt and RAG context
↓
External LLM returns:
  "This prompt could be improved by asking for [X]. Try: 'Can you also explain...'"
↓
Guidance Service suggests improved prompt
↓
If tester accepts, tracks score improvement
```

### Example 3: Testers Getting Guidance at Scale
```
600 testers are testing across 100 apps simultaneously
↓
Each tester connects to Tester Guidance Service via WebSocket
↓
Tester types prompt in app #5
↓
WebSocket sends: { appId: 5, prompt: "...", currentScore: 45 }
↓
Guidance Service:
  - Checks Redis cache for app #5 patterns (fast)
  - If cache miss, queries MongoDB for best practices
  - Generates real-time suggestion via LLM
  - Sends back suggestions < 1 second
↓
Frontend displays suggestions in real-time
↓
If guidance improves score, effectiveness tracker records win
↓
Next tester for app #5 gets same suggestions (from cache) → faster
```

---

## Deployment Strategy

### Local Development
```
npm run dev:backend   # Main service on 3000
npm run dev:debugger  # Service on 3001
npm run dev:knowledge # Service on 3002
npm run dev:guidance  # Service on 3003
npm run dev:frontend  # Next.js on 3001
```

### Production (Vercel)
Each service deployed as separate Vercel Function:
- `/api/debug` → Prompt Debugger Service
- `/api/knowledge` → Knowledge Integration Service
- `/api/guidance` → Tester Guidance Service
- `/api/apps` → Main Backend Service (existing)

Services communicate via internal HTTPS URLs
Database connection pooled across services
Redis shared for cross-service caching

### Docker Compose (Option B)
```yaml
services:
  api-gateway:
    build: ./gateway
    ports: ["3000:3000"]
  
  debugger-service:
    build: ./services/debugger
    ports: ["3001:3001"]
    
  knowledge-service:
    build: ./services/knowledge
    ports: ["3002:3002"]
    
  guidance-service:
    build: ./services/guidance
    ports: ["3003:3003"]
    
  mongodb:
    image: mongo:latest
    
  redis:
    image: redis:latest
```

---

## Implementation Roadmap

### Phase 1: Prompt Debugger Service (2-3 weeks)
1. Create service scaffold with Express
2. Implement root cause analysis logic
3. Integrate LLM for analysis
4. Add MongoDB persistence
5. Connect to frontend dashboard
6. Test with 10-20 low-scoring prompts

### Phase 2: Knowledge Integration Service (3-4 weeks)
1. Create service scaffold
2. Implement RAG model integration
3. Implement external LLM integration
4. Add settings UI to applications
5. Cache external feedback
6. Test with different RAG models

### Phase 3: Tester Guidance Service (4-5 weeks)
1. Create service scaffold with Express + WebSocket
2. Implement prompt suggestion logic
3. Build real-time guidance streaming
4. Add Redis for concurrent session handling
5. Create tester dashboard UI
6. Build leaderboard and analytics
7. Load test with 100+ concurrent connections

### Phase 4: Integration & Optimization
1. API Gateway setup
2. Service-to-service authentication
3. Cross-service caching strategy
4. Performance optimization
5. Production deployment
6. Load testing with full 600-tester load

---

## TypeScript Best Practices Application

All code will follow strict TypeScript standards:

**Service Configuration Example:**
```typescript
import { z } from 'zod';

// Runtime validation for all external data
const PromptAnalysisRequestSchema = z.object({
  appId: z.string().min(1, 'App ID required'),
  promptId: z.string().uuid(),
  scores: z.object({
    groundedness: z.number().min(0).max(100),
    relevance: z.number().min(0).max(100),
    fluency: z.number().min(0).max(100),
  }),
  responseText: z.string().min(1),
});

type PromptAnalysisRequest = z.infer<typeof PromptAnalysisRequestSchema>;

async function analyzePrompt(
  data: unknown
): Promise<AnalysisResult | AnalysisError> {
  // Runtime validation - catches malformed API requests
  const parsed = PromptAnalysisRequestSchema.safeParse(data);
  
  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  // Now we know data is valid
  const { appId, promptId, scores } = parsed.data;
  
  // Rest of implementation...
}
```

**No `any` types - use `unknown` with guards:**
```typescript
// ❌ Never this:
async function callExternalLLM(input: any): Promise<any>

// ✅ Always this:
async function callExternalLLM(input: unknown): Promise<LLMResponse> {
  if (typeof input !== 'string') {
    throw new Error('Input must be string');
  }
  // Now safely use input as string
}
```

---

## Benefits Summary

| Feature | Benefit |
|---------|---------|
| **Focused Services** | Each team owns one service, 2k LOC max, easy to understand |
| **Independent Scaling** | Guidance service scales for 600 testers, others scale as needed |
| **AI Integration** | Each service optimized for its AI requirements (no bloat) |
| **Real-time Capable** | WebSocket guidance service designed for concurrent connections |
| **Fault Isolation** | Debugger down? Guidance still works. Knowledge down? Core app works |
| **Technology Choice** | Each service can use best tools (Redis for guidance, Vector DB for knowledge) |
| **Testing** | Easier to test focused services with specific test data |
| **Deployment** | Deploy individual services without full app restart |

---

## Next Steps

1. **Read and approve this architecture**
2. **Create service scaffolds** (Express app per service)
3. **Implement shared utilities** (MongoDB connection, auth, Zod schemas)
4. **Start Phase 1** (Prompt Debugger Service)
5. **Strict TypeScript enforcement** throughout

All code will follow the attached TypeScript best practices from the first day of implementation.
