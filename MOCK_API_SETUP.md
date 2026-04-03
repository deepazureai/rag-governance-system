# Mock API Setup Guide

## Overview

The RAG LLM Evaluation Platform includes a comprehensive mock API system that allows you to develop and test the frontend without needing a running backend. Mock data simulates both RAGAS and Microsoft Evaluation SDK responses.

## Quick Start

### Option 1: Enable Mock API (Fastest - No Backend Required)

1. **Set Environment Variable**
```bash
# In .env.local (create if doesn't exist)
NEXT_PUBLIC_USE_MOCK_API=true
```

2. **Start Frontend**
```bash
npm run dev
```

3. **Test It**
   - Navigate to Explore page
   - Framework selector shows RAGAS and Microsoft options
   - Enter a query and evaluate
   - See mock results instantly

### Option 2: Use Real Backend (When Ready)

1. **Start Backend**
```bash
cd backend
npm install
npm run dev
# Backend runs on http://localhost:3001
```

2. **Update Frontend .env.local**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api/evaluations
NEXT_PUBLIC_USE_MOCK_API=false
```

3. **Start Frontend**
```bash
npm run dev
```

### Option 3: Auto-Fallback (Best for Development)

**Default behavior - no env vars needed:**
- If `NEXT_PUBLIC_USE_MOCK_API=true` → Always use mock
- If backend is running → Use real backend
- If backend is down → Automatically fallback to mock

Set in `.env.local`:
```bash
NEXT_PUBLIC_USE_MOCK_API=true
```

Then:
- Backend down? Mock API activates automatically
- Backend starts? Real API takes over
- No code changes needed

## Mock API Features

### Supported Endpoints

All evaluation endpoints are mocked:

| Endpoint | Mock Response |
|----------|--------------|
| `GET /evaluations/frameworks` | Returns RAGAS and Microsoft SDK info |
| `POST /evaluations/query` | Evaluates single query with metrics |
| `POST /evaluations/batch` | Batch processing with progress tracking |
| `GET /evaluations/history/:appId` | Historical evaluation results |
| `POST /evaluations/switch-framework` | Framework switching |
| `GET /evaluations/health` | Health check response |

### Mock Data Characteristics

**RAGAS Framework Metrics:**
- Groundedness: 92-100%
- Relevance: 88-100%
- Fluency: 89-100%
- Safety: 98-100%
- Coherence: 91-100%
- Completeness: 85-100%
- Factuality: 94-100%
- Harmfulness: 0-1%

**Microsoft SDK Metrics:**
- Similar ranges with slight variations
- Emphasizes Safety (99-100%)
- Emphasizes Completeness (88-100%)

### Realistic Simulation

Mock API simulates:
- ✓ Network latency (500ms for evaluations, 1500ms+ for batch)
- ✓ Realistic token usage (300-600 tokens per query)
- ✓ Cost estimation ($0.015-0.050 per evaluation)
- ✓ Timestamps and IDs
- ✓ Framework-specific metric variations
- ✓ Error handling (invalid framework selection)

## Files Created

```
src/api/
  ├── mock-data.ts          # Mock framework configs & data
  ├── mock-handler.ts       # Mock API request handlers
  └── client.ts             # Updated with fallback logic

src/hooks/
  └── useEvaluation.ts      # Updated to use new client
```

## Environment Variables

### Frontend (.env.local)

```bash
# Enable mock API (fastest development)
NEXT_PUBLIC_USE_MOCK_API=true

# Backend URL (when running real backend)
NEXT_PUBLIC_API_URL=http://localhost:3001/api/evaluations

# Optional: Debug logging
NEXT_PUBLIC_DEBUG_API=true
```

### Backend (.env when ready)

```bash
PORT=3001
CORS_ORIGIN=http://localhost:3000
RAGAS_ENABLED=true
MICROSOFT_SDK_ENABLED=true
OPENAI_API_KEY=your_key_here
```

## Testing Workflow

### 1. Quick UI Test (5 minutes)

```bash
# Terminal 1
NEXT_PUBLIC_USE_MOCK_API=true npm run dev
# Visit http://localhost:3000
```

### 2. Framework Selection Test

1. Go to Explore page
2. See "Select Framework" dropdown
3. Choose RAGAS or Microsoft
4. Enter test query
5. Click "Evaluate"
6. See metrics populate in real-time

### 3. Metrics Display Test

All pages show framework-specific metrics:
- Dashboard: Aggregated results
- Explore: Per-query metrics
- App Detail > Evaluation Tab: Detailed breakdown
- Benchmarks: Framework comparison

### 4. Switching Test

1. Evaluate with RAGAS
2. Switch to Microsoft
3. Evaluate same query
4. Notice metric variations
5. Both results appear in history

## Debugging

### Check if Mock API is Active

In browser DevTools Console:

```javascript
// Check environment
console.log(process.env.NEXT_PUBLIC_USE_MOCK_API)

// Test mock directly (in browser console)
// This confirms mock handlers work
```

### View Mock Responses

Add to `.env.local`:
```bash
NEXT_PUBLIC_DEBUG_API=true
```

Then check browser console for log messages showing which API was used.

### Simulate Backend Failure

```bash
# Enable mock but kill backend
NEXT_PUBLIC_USE_MOCK_API=true
npm run dev
# Backend off, but mock keeps frontend working
```

## Performance Notes

**Mock API:**
- Latency: 500ms-1500ms (simulated)
- Response size: ~2KB
- Memory usage: Negligible
- Perfect for: UI development, testing, demos

**Real Backend:**
- Latency: Depends on framework (usually 2-5s)
- Response size: ~2-5KB
- Memory usage: Depends on batch size
- Perfect for: Production, real evaluations

## Migration Path

1. **Phase 1:** Develop with mock API
   ```bash
   NEXT_PUBLIC_USE_MOCK_API=true
   npm run dev
   ```

2. **Phase 2:** Start backend, keep mock fallback
   ```bash
   cd backend && npm run dev
   NEXT_PUBLIC_USE_MOCK_API=true
   npm run dev
   ```

3. **Phase 3:** Disable mock, use real API
   ```bash
   NEXT_PUBLIC_USE_MOCK_API=false
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/evaluations
   npm run dev
   ```

## Common Issues

### Issue: Mock API not activating
**Solution:** Check `.env.local` has `NEXT_PUBLIC_USE_MOCK_API=true`

### Issue: Seeing backend errors
**Solution:** Backend not running? Set `NEXT_PUBLIC_USE_MOCK_API=true` to use mock

### Issue: Metrics seem generic
**Solution:** Mock data is randomized per request. Normal behavior.

## Next Steps

1. **Test Now:** `NEXT_PUBLIC_USE_MOCK_API=true npm run dev`
2. **Build Real Backend:** Follow BACKEND_SETUP_COMPLETE.md
3. **Switch to Real:** Update `.env.local` and restart
4. **Deploy:** Both frontend and backend ready for production

## API Request Examples

### Using Mock API

```bash
# Automatic with mock enabled
curl http://localhost:3000/api/evaluations/frameworks

# Response (mocked):
{
  "success": true,
  "data": {
    "frameworks": [
      {
        "id": "ragas",
        "name": "RAGAS",
        "metrics": ["groundedness", "relevance", ...]
      },
      ...
    ]
  }
}
```

### Evaluation Request

```bash
curl -X POST http://localhost:3000/api/evaluations/query \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "app-1",
    "query": "How do I reset my password?",
    "response": "Click forgot password on login",
    "framework": "ragas",
    "retrievedDocuments": []
  }'
```

## Summary

- ✅ No backend needed for development
- ✅ Realistic mock data with variations
- ✅ Framework-specific metric simulation
- ✅ Auto-fallback when backend unavailable
- ✅ Easy switch between mock and real API
- ✅ Perfect for UI/UX development, demos, testing
