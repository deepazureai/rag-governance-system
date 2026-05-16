# Implementation Roadmap - Phase 1: Prompt Debugger Service

## Overview
The Prompt Debugger Service analyzes why a prompt scored low and provides improvement recommendations. It's the foundation for understanding evaluation gaps.

## Phase 1 Deliverables

### 1. Service Scaffold
- Node.js + Express server
- TypeScript strict mode
- Zod validation schemas
- MongoDB connection

### 2. Core Features
- Root cause analyzer (why did score drop?)
- Recommendation engine (what would improve it?)
- Claude LLM-As-Judge integration
- Explanation generation

### 3. API Endpoints
```
POST /api/debug
- Input: {appId, promptId, scores: {framework1, framework2, framework3}}
- Output: {rootCauses, recommendations, examples}

POST /api/recommendations
- Input: {appId, promptId, framework, lowestScore}
- Output: {suggestions: [{text, expectedScore, reasoning}]}
```

### 4. Data Model
```typescript
interface DebugAnalysis {
  promptId: string;
  appId: string;
  scores: {
    framework1: number;
    framework2: number;
    framework3: number;
  };
  rootCauses: string[]; // "Missing citations", "Hallucination detected", etc
  recommendations: Recommendation[];
  analyzedAt: Date;
}

interface Recommendation {
  suggestion: string;
  rationale: string;
  expectedScore: number; // predicted score after applying suggestion
  example: string; // example of improved prompt
}
```

## File Structure
```
services/prompt-debugger/
├── src/
│   ├── schemas/
│   │   └── validation.ts          # Zod schemas
│   ├── types/
│   │   └── index.ts               # Business logic types
│   ├── services/
│   │   ├── DebugAnalyzer.ts       # Root cause logic
│   │   ├── RecommendationEngine.ts # Suggestions
│   │   ├── LLMService.ts          # Claude integration
│   │   └── MongoService.ts        # Data persistence
│   ├── routes/
│   │   └── debug.routes.ts        # Express routes
│   ├── middleware/
│   │   └── validation.ts          # Request validation
│   └── index.ts                   # Server entry point
├── tsconfig.json
├── package.json
└── .env.example
```

## Implementation Steps
1. Create service scaffold with Express + TypeScript
2. Define Zod schemas for request/response validation
3. Implement DebugAnalyzer business logic
4. Integrate Claude API for LLM-As-Judge
5. Implement RecommendationEngine
6. Create MongoDB persistence layer
7. Wire Express routes with middleware
8. Add error handling and logging

Ready to start Phase 1 implementation?
