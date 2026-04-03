# RAG LLM Evaluation Backend

A production-grade Node.js backend for the RAG LLM Evaluation Platform with pluggable evaluation frameworks and real-time streaming capabilities.

## Features

- **Framework Abstraction Layer**: Seamlessly switch between RAGAS and Microsoft Evaluation SDK
- **Pluggable Architecture**: Non-corrosive framework interface for easy extensibility
- **Real-time Streaming**: WebSocket support for live evaluation progress
- **Batch Processing**: Evaluate multiple queries with progress tracking
- **Result Persistence**: SQLite/PostgreSQL support for storing evaluation history
- **RESTful API**: Comprehensive REST endpoints for all evaluation operations
- **Type-Safe**: Full TypeScript implementation with Zod validation

## Architecture

### Directory Structure

```
backend/
├── src/
│   ├── frameworks/          # Evaluation framework implementations
│   │   ├── types.ts        # Framework interface definitions
│   │   ├── registry.ts     # Framework registry and manager
│   │   ├── ragas.ts        # RAGAS framework adapter
│   │   └── microsoft.ts    # Microsoft Evaluation SDK adapter
│   ├── services/           # Business logic services
│   │   ├── evaluation.ts   # Evaluation orchestration
│   │   ├── database.ts     # Database persistence layer
│   │   └── websocket.ts    # WebSocket management
│   ├── api/
│   │   └── routes.ts       # REST API endpoints
│   ├── models/
│   │   └── database.ts     # Database type definitions
│   └── index.ts            # Express server entry point
├── package.json
├── tsconfig.json
└── .env.example
```

### Framework Abstraction

The backend implements a non-corrosive framework abstraction through the `IEvaluationFramework` interface:

```typescript
interface IEvaluationFramework {
  getMetadata(): FrameworkMetadata;
  initialize(): Promise<void>;
  evaluate(request: EvaluationRequest): Promise<EvaluationResult>;
  evaluateBatch(request: BatchEvaluationRequest): Promise<EvaluationResult[]>;
  healthCheck(): Promise<boolean>;
  shutdown(): Promise<void>;
}
```

Each framework adapter:
- Implements the same interface
- Can be independently enabled/disabled
- Returns standardized result formats
- Handles its own resource management

## Quick Start

### Prerequisites

- Node.js 18+
- npm or pnpm
- Environment variables configured

### Installation

```bash
cd backend
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:

```env
PORT=3001
NODE_ENV=development

# Frameworks
RAGAS_ENABLED=true
MICROSOFT_SDK_ENABLED=true

# Azure (for Microsoft SDK)
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=your_endpoint
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment

# LLM (for RAGAS)
OPENAI_API_KEY=your_key
LLM_MODEL=gpt-4-turbo-preview

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## API Endpoints

### Framework Management

**GET /api/evaluations/frameworks**
List available evaluation frameworks.

Response:
```json
{
  "success": true,
  "data": [
    {
      "type": "ragas",
      "metadata": {
        "name": "RAGAS",
        "version": "0.1.0",
        "description": "Retrieval Augmented Generation Assessment",
        "supportedMetrics": ["groundedness", "relevance", "coherence", "fluency"]
      }
    }
  ]
}
```

### Single Evaluation

**POST /api/evaluations/query**
Evaluate a single query-response pair.

Request:
```json
{
  "appId": "app-1",
  "query": "What is machine learning?",
  "response": "Machine learning is...",
  "retrievedDocuments": [
    {
      "content": "Document content...",
      "source": "wikipedia.org",
      "relevance": 0.95
    }
  ],
  "framework": "ragas"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "eval-123",
    "frameworkName": "RAGAS",
    "query": "What is machine learning?",
    "response": "Machine learning is...",
    "metrics": {
      "groundedness": 92.5,
      "relevance": 91.3,
      "coherence": 94.2,
      "fluency": 89.7
    },
    "overallScore": 91.9,
    "executionTime": 245,
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

### Batch Evaluation

**POST /api/evaluations/batch**
Evaluate multiple queries with progress tracking.

Request:
```json
{
  "appId": "app-1",
  "evaluations": [
    {
      "query": "Query 1",
      "response": "Response 1",
      "retrievedDocuments": [...]
    },
    {
      "query": "Query 2",
      "response": "Response 2",
      "retrievedDocuments": [...]
    }
  ],
  "framework": "microsoft"
}
```

### Evaluation History

**GET /api/evaluations/history/:appId?limit=50&offset=0**
Retrieve evaluation history for an app.

### Framework Switching

**POST /api/evaluations/switch-framework**
Switch the active framework.

Request:
```json
{
  "framework": "microsoft"
}
```

### Health Check

**GET /api/evaluations/health**
Health status of all frameworks.

Response:
```json
{
  "success": true,
  "data": {
    "ragas": {
      "name": "RAGAS",
      "healthy": true
    },
    "microsoft": {
      "name": "Microsoft Evaluation SDK",
      "healthy": true
    }
  }
}
```

## WebSocket Events

Connect to `ws://localhost:3001/ws` for real-time updates.

### Messages

**Start Evaluation:**
```json
{
  "type": "start_evaluation",
  "payload": {
    "appId": "app-1",
    "query": "...",
    "response": "...",
    "retrievedDocuments": [...]
  }
}
```

**Start Batch Evaluation:**
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

**Subscribe to Channel:**
```json
{
  "type": "subscribe",
  "payload": {
    "channel": "batch-123"
  }
}
```

**Progress Updates:**
```json
{
  "type": "batch_progress",
  "data": {
    "batchId": "batch-123",
    "completed": 5,
    "total": 10,
    "percentComplete": 50,
    "estimatedSecondsRemaining": 30
  }
}
```

## Extending with New Frameworks

To add a new evaluation framework:

1. Create a new framework class extending `BaseEvaluationFramework`:

```typescript
import { BaseEvaluationFramework, EvaluationRequest, EvaluationResult } from './types';

export class NewFramework extends BaseEvaluationFramework {
  getMetadata() {
    return {
      name: 'My Framework',
      version: '1.0.0',
      description: '...',
      supportedMetrics: [...]
    };
  }

  async initialize(): Promise<void> {
    // Initialize resources
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResult> {
    // Implement evaluation logic
  }

  async healthCheck(): Promise<boolean> {
    // Health check implementation
  }
}
```

2. Register in the framework registry (`registry.ts`):

```typescript
private registerFrameworks(): void {
  const newFramework = new NewFramework();
  this.frameworks.set('new-framework', newFramework);
}
```

3. Update environment variables to enable/disable.

## Database

### Schema

**evaluations** table:
- id (UUID)
- appId (string)
- query (text)
- response (text)
- frameworkUsed (string)
- metrics (JSON)
- overallScore (float)
- executionTime (integer)
- createdAt (timestamp)

**batch_evaluations** table:
- id (UUID)
- appId (string)
- frameworkUsed (string)
- totalEvaluations (integer)
- completedEvaluations (integer)
- status (enum)
- startedAt (timestamp)
- completedAt (timestamp)

### Switching Database

To use PostgreSQL instead of SQLite:

1. Set `DATABASE_URL=postgresql://user:password@localhost:5432/rag_evaluation`
2. Update database service to use postgres driver
3. Run migrations

## Error Handling

The backend implements comprehensive error handling:

- Input validation with Zod
- Framework-specific error wrapping
- Graceful degradation
- Detailed error messages
- Structured logging

## Performance Considerations

- Framework initialization is cached
- Batch evaluations use parallel processing where possible
- WebSocket subscriptions reduce redundant API calls
- Database queries are optimized with indexing
- Memory management for large batch operations

## Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend ./
RUN npm install && npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

### Environment Variables

Required for production:
- `NODE_ENV=production`
- `CORS_ORIGIN` (frontend URL)
- Database configuration
- API keys for frameworks

## Monitoring

Key metrics to monitor:

- Evaluation execution time
- Framework health status
- Batch processing progress
- WebSocket connection count
- Database query performance
- Error rates by framework

## Contributing

When adding new features:

1. Maintain framework abstraction
2. Add corresponding API endpoints
3. Update error handling
4. Add WebSocket support if needed
5. Document configuration

## License

MIT
