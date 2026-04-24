# Frontend-Backend Integration Guide

This guide explains how the React frontend integrates with the Node.js evaluation backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Explore Page / App Detail / Benchmarks             │   │
│  │  - Framework Selector Component                      │   │
│  │  - useEvaluation Hook                               │   │
│  │  - Real-time Progress Display                       │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    REST API       WebSocket    Redux Store
  (POST/GET)      (Real-time)   (Framework)
        │              │              │
        └──────────────┼──────────────┘
                       │
┌──────────────────────────────────────────────────────────────┐
│                  Node.js Backend                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express Server + Framework Registry                 │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │  RAGAS          │    Microsoft SDK    │   Future     │   │
│  │  Framework      │    Framework        │   Frameworks │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database Service (SQLite/PostgreSQL)               │   │
│  │  - Store evaluations                                 │   │
│  │  - Store batch results                              │   │
│  │  - Track evaluation history                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## Frontend Integration Points

### 1. Framework Selector Component

**Location:** `src/components/evaluation/framework-selector.tsx`

Displays available frameworks and allows users to switch between them.

```tsx
<FrameworkSelector />
```

**Features:**
- Fetches available frameworks from backend
- Displays framework metadata (name, version, metrics)
- Allows switching active framework
- Shows active framework status

### 2. useEvaluation Hook

**Location:** `src/hooks/useEvaluation.ts`

Main hook for interacting with the evaluation backend.

```tsx
const {
  frameworks,           // List of available frameworks
  selectedFramework,    // Currently active framework
  loading,              // Request loading state
  error,                // Error message
  evaluateQuery,        // Single query evaluation
  evaluateBatch,        // Batch evaluation
  switchFramework,      // Change active framework
} = useEvaluation();
```

**Usage:**

```tsx
// Single evaluation
const result = await evaluateQuery(
  'app-1',
  'What is machine learning?',
  'Machine learning is...',
  [{ content: 'Doc content', source: 'Wikipedia' }]
);

// Batch evaluation
const results = await evaluateBatch('app-1', [
  {
    query: 'Query 1',
    response: 'Response 1',
    retrievedDocuments: [...]
  },
  // More items...
]);

// Switch framework
await switchFramework('microsoft');
```

### 3. Integration in Explore Page

**Location:** `app/explore/page.tsx`

The Explore page integrates framework selection with query testing:

```tsx
'use client';

import { useEvaluation } from '@/hooks/useEvaluation';
import { FrameworkSelector } from '@/components/evaluation/framework-selector';

export default function ExplorePage() {
  const { evaluateQuery, selectedFramework } = useEvaluation();

  const handleEvaluate = async () => {
    const result = await evaluateQuery(
      appId,
      query,
      response,
      retrievedDocuments
    );
    // Display result
  };

  return (
    <DashboardLayout>
      <FrameworkSelector />
      {/* Query input and results */}
    </DashboardLayout>
  );
}
```

### 4. Integration in App Detail Page

**Location:** `app/apps/[id]/page.tsx`

App detail pages show evaluation metrics from the selected framework:

**Evaluation Tab:**
- Framework-specific metrics grid
- Quality radar chart
- Historical trend data

**Performance Tab:**
- Framework governance metrics
- Performance comparisons

## Backend API Reference

### REST Endpoints

#### List Frameworks

```bash
GET /api/evaluations/frameworks

Response:
{
  "success": true,
  "data": [
    {
      "type": "ragas",
      "metadata": {
        "name": "RAGAS",
        "version": "0.1.0",
        "description": "...",
        "supportedMetrics": [...]
      }
    }
  ]
}
```

#### Single Query Evaluation

```bash
POST /api/evaluations/query

Request:
{
  "appId": "app-1",
  "query": "Your query",
  "response": "System response",
  "retrievedDocuments": [
    {
      "content": "Document content",
      "source": "source.com",
      "relevance": 0.95
    }
  ],
  "framework": "ragas"
}

Response:
{
  "success": true,
  "data": {
    "id": "eval-123",
    "frameworkName": "RAGAS",
    "metrics": {
      "groundedness": 92.5,
      "relevance": 91.3,
      ...
    },
    "overallScore": 91.9,
    "executionTime": 245,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

#### Batch Evaluation

```bash
POST /api/evaluations/batch

Request:
{
  "appId": "app-1",
  "evaluations": [
    { "query": "...", "response": "...", "retrievedDocuments": [...] },
    { "query": "...", "response": "...", "retrievedDocuments": [...] }
  ],
  "framework": "ragas"
}

Response:
{
  "success": true,
  "data": {
    "count": 2,
    "results": [
      { "id": "eval-1", "metrics": {...}, "overallScore": 91.9 },
      { "id": "eval-2", "metrics": {...}, "overallScore": 89.2 }
    ]
  }
}
```

#### Evaluation History

```bash
GET /api/evaluations/history/:appId?limit=50&offset=0

Response:
{
  "success": true,
  "data": [
    { "id": "eval-1", "query": "...", "metrics": {...}, "createdAt": "..." }
  ]
}
```

#### Switch Framework

```bash
POST /api/evaluations/switch-framework

Request:
{
  "framework": "microsoft"
}

Response:
{
  "success": true,
  "message": "Framework switched to microsoft"
}
```

#### Health Check

```bash
GET /api/evaluations/health

Response:
{
  "success": true,
  "data": {
    "ragas": { "name": "RAGAS", "healthy": true },
    "microsoft": { "name": "Microsoft SDK", "healthy": false }
  }
}
```

## WebSocket Real-time Updates

Connect to `ws://localhost:5000/ws` for real-time progress updates.

### Subscribe to Batch

```json
{
  "type": "subscribe",
  "payload": {
    "channel": "batch-123"
  }
}
```

### Start Batch Evaluation

```json
{
  "type": "start_batch_evaluation",
  "payload": {
    "batchId": "batch-123",
    "appId": "app-1",
    "evaluations": [...]
  }
}
```

### Progress Update (Server sends)

```json
{
  "type": "batch_progress",
  "data": {
    "batchId": "batch-123",
    "completed": 5,
    "total": 10,
    "percentComplete": 50,
    "estimatedSecondsRemaining": 30,
    "results": [...]
  }
}
```

### Completion (Server sends)

```json
{
  "type": "batch_complete",
  "data": {
    "batchId": "batch-123",
    "completed": 10,
    "results": [...]
  }
}
```

## Framework Switching Flow

```
User selects framework in UI
    ↓
FrameworkSelector component triggers switchFramework()
    ↓
useEvaluation hook calls POST /api/evaluations/switch-framework
    ↓
Backend registry switches active framework
    ↓
UI updates to reflect new framework
    ↓
Next evaluation uses new framework
```

## Data Flow Example

### Single Query Evaluation

```
1. User enters query in Explore page
2. User clicks "Evaluate"
3. evaluateQuery() called from useEvaluation hook
4. Hook sends POST to /api/evaluations/query with selected framework
5. Backend routes to selected framework adapter (RAGAS or Microsoft)
6. Framework executes evaluation
7. Results stored in database
8. Results returned to frontend
9. Metrics displayed in UI
10. Redux alert dispatched for user notification
```

### Batch Evaluation with Progress

```
1. User uploads multiple queries
2. evaluateBatch() called
3. WebSocket connection established
4. Client subscribes to batch channel
5. Backend starts processing
6. Progress updates sent via WebSocket
7. UI shows progress bar in real-time
8. When complete, full results sent
9. Results displayed and stored locally
10. User can view detailed results
```

## Error Handling

The hook provides error handling through:

1. **Try-catch blocks** - Captures network errors
2. **Backend validation** - Zod schema validation
3. **Graceful degradation** - Falls back if framework unavailable
4. **User notifications** - Redux alerts dispatch errors

```tsx
try {
  const result = await evaluateQuery(...);
} catch (error) {
  // Error automatically dispatched as Redux alert
  // UI shows error message to user
}
```

## State Management

### Redux Store

**Evaluation State:**
- `selectedFramework` - Currently active framework
- `evaluationResults` - Cached evaluation results
- `batchProgress` - Real-time batch progress

**Updated via:**
- `useEvaluation` hook
- WebSocket messages
- API responses

### React Query

*Optional: Can be added for server state caching*

## Environment Configuration

### Frontend (.env.local)

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api/evaluations
```

### Backend (.env)

```
CORS_ORIGIN=http://localhost:3000
RAGAS_ENABLED=true
MICROSOFT_SDK_ENABLED=true
```

## Development Workflow

1. **Start backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start frontend:**
   ```bash
   npm run dev
   ```

3. **Test integration:**
   - Navigate to Explore page
   - Select framework
   - Enter query and evaluate
   - View results

4. **Monitor:**
   - Check backend logs for evaluation details
   - Use browser DevTools to inspect API calls
   - Monitor WebSocket messages

## Production Deployment

### Backend Deployment

```bash
cd backend
npm run build
npm start
```

### Frontend Deployment

```bash
npm run build
npm start
```

### Environment Setup

1. Set `NEXT_PUBLIC_API_URL` to production backend URL
2. Configure backend `.env` with production credentials
3. Update `CORS_ORIGIN` for production domain
4. Set up database (PostgreSQL recommended)
5. Configure API keys for frameworks

## Troubleshooting

### Framework not loading

- Check backend health: `GET /api/evaluations/health`
- Verify environment variables are set
- Check backend logs for initialization errors

### Evaluation timeouts

- Increase backend timeout if processing large documents
- Check backend performance metrics
- Reduce batch size

### WebSocket connection fails

- Ensure backend WebSocket is running
- Check CORS configuration
- Verify firewall rules

### Results not persisting

- Verify database connection
- Check database permissions
- Ensure database is initialized

## Next Steps

1. Implement production database (PostgreSQL)
2. Add authentication/authorization
3. Set up monitoring and logging
4. Implement caching strategy
5. Add rate limiting
6. Deploy to production
