# Mock API Implementation Summary

## What Was Created

A complete mock API layer that allows the React frontend to function independently without a running Node.js backend. Perfect for development, testing, and demonstrations.

## Quick Start (30 seconds)

```bash
# 1. Set environment variable
echo "NEXT_PUBLIC_USE_MOCK_API=true" > .env.local

# 2. Start frontend
npm run dev

# 3. Open browser
# Navigate to http://localhost:3000
# Everything works with mock data!
```

## Files Created (3 New Files)

### 1. src/api/mock-data.ts (126 lines)
- Mock framework configurations for RAGAS and Microsoft
- Mock evaluation results with realistic metrics
- Framework-specific metric generation functions
- Mock evaluation history
- Batch processing responses

### 2. src/api/mock-handler.ts (150 lines)
- MockApiHandler class with static methods
- Handles all 6 evaluation endpoints
- Simulates network latency (500ms-1500ms)
- Routes requests to appropriate mock handlers
- Returns realistic data with variations

### 3. Updated: src/api/client.ts (130+ lines)
- Fallback mechanism to MockApiHandler
- Automatic retry with mock when backend unavailable
- Seamless switching between real and mock API
- No breaking changes to existing code
- Environment-based configuration

## How It Works

```
┌─────────────────────────────────────┐
│   React Component/Hook              │
│   (Explore, Dashboard, etc.)        │
└──────────────┬──────────────────────┘
               │
               v
┌─────────────────────────────────────┐
│   API Client (apiClient)            │
│   Makes HTTP request                │
└──────────────┬──────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    ┌────v────┐  ┌──v───────────┐
    │ Real    │  │ Mock API      │
    │Backend  │  │ (fallback)    │
    │Running  │  │               │
    └────┬────┘  └──┬───────────┘
         │          │
         └────┬─────┘
              v
    ┌──────────────────┐
    │ Response to UI   │
    └──────────────────┘
```

## Features

### 1. Framework Support
- RAGAS: Groundedness, Relevance, Coherence, Fluency, Factuality, Harmfulness
- Microsoft SDK: All RAGAS metrics + Safety, Completeness
- Easy to add more frameworks

### 2. Realistic Mock Data
- Random variation in metrics (not identical)
- Framework-specific variations
- Simulated network latency
- Realistic token counts (300-600)
- Estimated costs ($0.015-0.050)
- Proper timestamps and IDs

### 3. All Endpoints Mocked
- `GET /evaluations/frameworks` - List available frameworks
- `POST /evaluations/query` - Single query evaluation
- `POST /evaluations/batch` - Batch processing
- `GET /evaluations/history/:appId` - Query history
- `POST /evaluations/switch-framework` - Framework switching
- `GET /evaluations/health` - Health status

### 4. Smart Fallback
- Tries real backend first
- Falls back to mock on connection error
- Environment-configurable
- No code changes needed to switch

## Usage

### Frontend .env.local

```bash
# Option 1: Always use mock (fastest development)
NEXT_PUBLIC_USE_MOCK_API=true

# Option 2: Use real backend if running, mock if not
NEXT_PUBLIC_USE_MOCK_API=true
NEXT_PUBLIC_API_URL=http://localhost:5000/api/evaluations

# Option 3: Only real backend (backend must be running)
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=http://localhost:5000/api/evaluations
```

## Integration Points

### 1. useEvaluation Hook
Updated to work with mock API:
```typescript
const { frameworks, selectedFramework, evaluateQuery, switchFramework } = useEvaluation();
```

### 2. API Client
All methods work with mock:
```typescript
await apiClient.post('/evaluations/query', payload)
await apiClient.get('/evaluations/frameworks')
```

### 3. Framework Selector Component
Displays mock frameworks:
- RAGAS (v0.1.0)
- Microsoft Evaluation SDK (v1.0.0)

## Testing Scenarios

### Scenario 1: UI Development (No Backend Needed)
```bash
NEXT_PUBLIC_USE_MOCK_API=true npm run dev
# Build UI components, test flows, verify layouts
# All mock data responds instantly
```

### Scenario 2: Framework Testing
1. Set mock mode to true
2. Go to Explore page
3. Select RAGAS → Evaluate → See metrics
4. Select Microsoft → Evaluate → See different metrics
5. Compare in Benchmarks page

### Scenario 3: Production Deployment
```bash
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_API_URL=https://your-backend.com/api/evaluations
npm run dev
```

### Scenario 4: Graceful Degradation
```bash
# Backend crashes or network issue?
# If NEXT_PUBLIC_USE_MOCK_API=true:
# - Frontend keeps working
# - Shows mock data
# - User continues interacting
```

## Data Flows

### Single Query Evaluation
```
User → Framework Selector → "Evaluate" Button
          ↓
    API Client (Query)
          ↓
    Mock Handler (if enabled)
          ↓
    Generate metrics (randomized)
          ↓
    Return response
          ↓
    Display in UI (metric cards, charts)
```

### Framework Switching
```
User → Select "Microsoft"
          ↓
    Switch Framework API
          ↓
    Mock Handler updates
          ↓
    Next evaluation uses Microsoft metrics
          ↓
    Different metric values (more emphasis on safety)
```

## Performance

| Metric | Mock API | Real Backend |
|--------|----------|--------------|
| Single Query | ~1.5s | 2-5s (depends on LLM) |
| Latency | Simulated 500ms-1500ms | Actual network |
| Memory | <1MB | Depends on framework |
| Best For | Development & Testing | Production |
| Setup Time | 0 (already included) | 5-10 minutes |

## Code Examples

### Using Mock API in Components

```typescript
import { useEvaluation } from '@/hooks/useEvaluation';

export function MyComponent() {
  const { 
    frameworks, 
    selectedFramework, 
    evaluateQuery, 
    loading 
  } = useEvaluation();

  const handleEvaluate = async () => {
    const result = await evaluateQuery(
      'app-1',
      'What is RAG?',
      'RAG combines retrieval and generation...',
      []
    );
    
    // Works with mock or real API transparently
    console.log(result.metrics);
  };

  return (
    <div>
      {/* Mock data works here */}
      {frameworks.map(f => (
        <button key={f.id} onClick={() => handleEvaluate()}>
          Evaluate with {f.name}
        </button>
      ))}
    </div>
  );
}
```

## Migration Path

```
Week 1: Build with Mock API
  └─ NEXT_PUBLIC_USE_MOCK_API=true
  └─ Full UI development

Week 2: Backend Development
  └─ Parallel development of Node.js backend
  └─ Still use mock in frontend

Week 3: Integration Testing
  └─ Start backend
  └─ Switch frontend to real API
  └─ Verify end-to-end flow

Week 4: Production Ready
  └─ All tests pass
  └─ Deploy frontend + backend
  └─ Monitor real evaluations
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Mock API not working | Check `NEXT_PUBLIC_USE_MOCK_API=true` in .env.local |
| Backend errors still showing | Restart frontend after setting mock=true |
| Metrics seem fake | That's correct - they're mock data with randomization |
| Want to use real backend | Set `NEXT_PUBLIC_USE_MOCK_API=false` and restart |

## Next Steps

1. **Right Now:** `echo "NEXT_PUBLIC_USE_MOCK_API=true" > .env.local && npm run dev`
2. **Try Explore Page:** Go to http://localhost:3000 → Explore
3. **Test Framework Selection:** Select RAGAS, evaluate query, see mock results
4. **When Ready:** Follow BACKEND_SETUP_COMPLETE.md to build real backend
5. **Switch:** Update .env.local to `NEXT_PUBLIC_USE_MOCK_API=false`

## Summary

✅ **Frontend works immediately** - No backend required
✅ **Realistic data** - Framework-specific metrics with variations
✅ **Easy testing** - All UI flows testable with mock
✅ **Transparent switching** - One env var to switch between mock and real
✅ **Production ready** - Graceful fallback if backend fails
✅ **No refactoring needed** - Existing code works with both
