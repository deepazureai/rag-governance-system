# Testing Guide

## Setup

### Prerequisites
- Node.js 18+
- MongoDB (for integration tests)
- DeepEval service running (for integration tests with DeepEval)

### Install Testing Dependencies
```bash
cd backend
npm install
```

## Running Tests

### Unit Tests Only
```bash
npm test -- --testPathPattern="__tests__" --testPathIgnore="integration"
```

### Integration Tests
```bash
npm test -- --testPathPattern="integration"
```

### All Tests
```bash
npm test
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

## Test Structure

### Unit Tests
- `backend/src/services/__tests__/BAReviewQueueService.test.ts` - BA review queue priority calculation
- `backend/src/services/__tests__/DeepEvalClient.test.ts` - DeepEval service communication

### Integration Tests
- `backend/src/__tests__/ba-review-workflow.integration.test.ts` - Complete BA review workflow
- `backend/src/__tests__/deepeval-pipeline.integration.test.ts` - DeepEval evaluation pipeline

### Test Utilities
- `backend/src/__tests__/test-utils.ts` - Factory functions and test helpers

## Environment Variables for Tests

Create `.env.test` in the backend directory:
```
MONGODB_TEST_URL=mongodb://localhost:27017/rag-evaluation-test
DEEPEVAL_SERVICE_URL=http://localhost:8000
DEEPEVAL_API_KEY=test-api-key-12345678901234567890
```

## Test Coverage Thresholds

The project uses the following coverage requirements:
- **Statements**: 60%
- **Branches**: 60%
- **Functions**: 60%
- **Lines**: 60%

## Key Test Scenarios

### BA Review Queue
- Priority calculation for low scores, negative feedback, high latency
- Queue item creation and status transitions
- Prompt improvement tracking with audit trail

### DeepEval Integration
- Health checks and service communication
- Single and batch evaluation requests
- Evaluation score storage and retrieval
- Ethics violation detection (toxicity, bias)
- Multiple framework comparison (RAGAS vs DeepEval)

### Workflow Tests
- Raw data creation with timestamps and metrics
- Non-destructive prompt improvements (multiple versions)
- Template creation from reviewed prompts
- Complete workflow from data ingestion to template publication

## Debugging Tests

Add console logs within tests:
```typescript
console.log('[v0] Debug message:', variable);
```

Run specific test file:
```bash
npm test -- path/to/test.test.ts
```

Run specific test suite:
```bash
npm test -- --testNamePattern="BA Review Queue"
```

## Best Practices

1. Use TestDataFactory for consistent mock data
2. Clean up test data in beforeEach/afterEach hooks
3. Test both success and error scenarios
4. Mock external services (DeepEval API)
5. Test data persistence and retrieval from MongoDB
6. Verify audit trails for all BA modifications
7. Test priority scoring with various input combinations

## Continuous Integration

Tests run automatically on:
- Pull requests
- Pushes to main branch
- Scheduled daily runs

Minimum requirement: 60% coverage on all metrics
