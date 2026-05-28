# LLM Assistance System - Implementation Guide

## Overview

This guide covers implementing and deploying the LLM Assistance System with multi-provider support (OpenAI, Azure OpenAI, Claude, AWS Bedrock).

## System Components

### 1. Core Services

#### LLMAssistanceService
- **Location**: `backend/src/services/LLMAssistanceService.ts`
- **Purpose**: Orchestrates LLM-assisted workflows
- **Methods**:
  - `assistCombinePrompts()`: Combines multiple prompts into one optimized template
  - `assistRefineRecommendation()`: Improves recommendation text
  - `assistGenerateKBSummary()`: Generates KB content summaries
  - `validateLLMResponse()`: Validates response length and quality

Key features:
- All methods return suggestions, never auto-save
- Content validation (min/max length checks)
- Comprehensive error handling
- Support for all 4 LLM providers

#### LLMClientFactory
- **Location**: `backend/src/services/LLMClientFactory.ts`
- **Purpose**: Creates appropriate LLM provider instances
- **Supported Providers**:
  - `OpenAIProvider`: Calls OpenAI API
  - `AzureOpenAIProvider`: Calls Azure OpenAI API
  - `ClaudeProvider`: Calls Anthropic Claude API
  - `AWSBedrockProvider`: Calls AWS Bedrock API

#### ConfigManager
- **Location**: `backend/src/utils/ConfigManager.ts`
- **Purpose**: Manages LLM configuration storage and validation
- **Features**:
  - Configuration caching (1 hour TTL)
  - Automatic retry logic (3 attempts)
  - Credential encryption/decryption
  - Default configuration initialization

### 2. API Endpoints

#### Template Assistance
- **Route**: `POST /api/prompt-templates/assist/combine-prompts`
- **Service**: `LLMAssistanceService.assistCombinePrompts()`
- **Location**: `backend/src/api/promptTemplateRoutes.ts`

#### Recommendation Refinement
- **Route**: `POST /api/ba-review/assist/refine-recommendation`
- **Service**: `LLMAssistanceService.assistRefineRecommendation()`
- **Location**: `backend/src/api/baReviewRoutes.ts`

#### KB Summarization
- **Route**: `POST /api/knowledge-base/assist/generate-summary`
- **Service**: `LLMAssistanceService.assistGenerateKBSummary()`
- **Location**: `backend/src/api/knowledgeBaseRoutes.ts`

### 3. Frontend Components

#### LLMTemplateAssistant
- **Location**: `src/components/dashboard/llm-template-assistant.tsx`
- **Props**:
  - `applicationId`: Application identifier
  - `selectedPromptIds`: Array of prompt IDs to combine
  - `isOpen`: Dialog visibility state
  - `onClose`: Close callback
  - `onSave`: Save callback with final template

#### RecommendationRefiner
- **Location**: `src/components/dashboard/recommendation-refiner.tsx`
- **Props**:
  - `applicationId`: Application identifier
  - `originalRecommendation`: Original recommendation text
  - `queueItemId`: Optional queue item identifier
  - `isOpen`: Dialog visibility state
  - `onClose`: Close callback
  - `onSave`: Save callback with refined text

#### KBSummaryGenerator
- **Location**: `src/components/dashboard/kb-summary-generator.tsx`
- **Props**:
  - `applicationId`: Application identifier
  - `documentContent`: Full document content
  - `documentId`: Optional document identifier
  - `documentTitle`: Optional document title
  - `isOpen`: Dialog visibility state
  - `onClose`: Close callback
  - `onSave`: Save callback with summary

## Setup Instructions

### Prerequisites

1. Node.js 18+ installed
2. npm or pnpm package manager
3. API keys for at least one LLM provider

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install AWS SDK for Bedrock support
npm install @aws-sdk/client-bedrock-runtime @aws-sdk/credential-providers

# Install frontend dependencies
cd ../
npm install
```

### Step 2: Configure Environment Variables

Create `.env.local` in the project root:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5001

# Encryption
CRYPTO_ENCRYPTION_KEY=$(openssl rand -base64 32)

# LLM Provider Selection (choose one or more)

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_API_KEY=...
AZURE_OPENAI_DEPLOYMENT=deployment-name
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# Claude
CLAUDE_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-opus-20240229

# AWS Bedrock
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

### Step 3: Configure LLM Provider in Database

Store LLM configuration in your database using ConfigManager:

```typescript
import { configManager } from './utils/ConfigManager.js';

// Store LLM configuration for application
await configManager.setApplicationLLMConfig('app-123', {
  provider: 'openai', // or 'azure-openai', 'claude', 'aws-bedrock'
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL,
  temperature: 0.7,
  maxTokens: 2048,
});

// Optionally store KB-specific configuration
await configManager.setApplicationKBConfig('app-123', {
  embeddingProvider: 'openai',
  embeddingOpenaiApiKey: process.env.OPENAI_API_KEY,
  kbLlmProvider: 'claude',
  kbLlmClaudeApiKey: process.env.CLAUDE_API_KEY,
});
```

### Step 4: Start the Backend

```bash
cd backend
npm run build
npm start
```

The backend should start on `http://localhost:5001`

### Step 5: Start the Frontend

```bash
npm run dev
```

The frontend should be available on `http://localhost:3000`

## Usage

### Using Template Assistance

```tsx
import { LLMTemplateAssistant } from '@/components/dashboard/llm-template-assistant';
import { useState } from 'react';

export function TemplateBuilder() {
  const [showAssistant, setShowAssistant] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState<string[]>([]);

  const handleSave = async (finalTemplate, llmSuggestion) => {
    const response = await fetch('/api/prompt-templates/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId: 'app-123',
        templateName: 'Combined Template',
        promptTemplate: finalTemplate,
        qualityGuidelines: 'Quality guidelines...',
        baEmail: 'user@example.com',
      }),
    });
    
    setShowAssistant(false);
  };

  return (
    <>
      <button onClick={() => setShowAssistant(true)}>
        Generate with LLM
      </button>
      
      <LLMTemplateAssistant
        applicationId="app-123"
        selectedPromptIds={selectedPrompts}
        isOpen={showAssistant}
        onClose={() => setShowAssistant(false)}
        onSave={handleSave}
      />
    </>
  );
}
```

### Using Recommendation Refiner

```tsx
import { RecommendationRefiner } from '@/components/dashboard/recommendation-refiner';
import { useState } from 'react';

export function RecommendationForm() {
  const [recommendation, setRecommendation] = useState('');
  const [showRefiner, setShowRefiner] = useState(false);

  const handleRefine = async (refined, original) => {
    setRecommendation(refined);
    setShowRefiner(false);
    
    // Save to backend
    await fetch('/api/ba-review/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        queueItemId: 'queue-456',
        improvedPrompt: refined,
      }),
    });
  };

  return (
    <>
      <textarea
        value={recommendation}
        onChange={(e) => setRecommendation(e.target.value)}
      />
      
      <button onClick={() => setShowRefiner(true)}>
        Improve with AI
      </button>

      <RecommendationRefiner
        applicationId="app-123"
        originalRecommendation={recommendation}
        isOpen={showRefiner}
        onClose={() => setShowRefiner(false)}
        onSave={handleRefine}
      />
    </>
  );
}
```

## Testing

### Run Integration Tests

```bash
cd backend
API_URL=http://localhost:5001 npm test -- tests/api.integration.test.ts
```

### Test Template Assistance Manually

```bash
curl -X POST http://localhost:5001/api/prompt-templates/assist/combine-prompts \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-123",
    "selectedPromptIds": ["prompt-1", "prompt-2"],
    "userContext": "Combine for data validation"
  }'
```

### Test Recommendation Refinement Manually

```bash
curl -X POST http://localhost:5001/api/ba-review/assist/refine-recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-123",
    "recommendationText": "This is a sample recommendation that needs improvement. The applicant has good skills but communication could be better."
  }'
```

### Test KB Summarization Manually

```bash
curl -X POST http://localhost:5001/api/knowledge-base/assist/generate-summary \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-123",
    "contentText": "Long document content here..."
  }'
```

## Troubleshooting

### LLM Provider Not Working

1. **Check credentials**:
   ```bash
   # Verify environment variables are set
   echo $OPENAI_API_KEY
   echo $AZURE_OPENAI_API_KEY
   echo $CLAUDE_API_KEY
   ```

2. **Test provider connection**:
   ```typescript
   const provider = new OpenAIProvider(config);
   const validation = await provider.validate();
   console.log(validation);
   ```

3. **Check API rate limits**: Review provider documentation and dashboard

### Configuration Not Loading

1. **Verify database connection**:
   ```bash
   npm run test -- tests/config.test.ts
   ```

2. **Check encryption key**:
   ```bash
   echo $CRYPTO_ENCRYPTION_KEY | wc -c  # Should be 44+ characters
   ```

3. **Review ConfigManager logs**:
   ```bash
   grep "ConfigManager" logs/*.log
   ```

### Frontend Components Not Rendering

1. **Check API accessibility**:
   ```bash
   curl http://localhost:5001/health
   ```

2. **Verify CORS configuration**:
   ```bash
   # Check CORS headers in API responses
   curl -i -X OPTIONS http://localhost:5001/api/prompt-templates
   ```

3. **Review browser console** for JavaScript errors

## Performance Optimization

### Caching

- LLM configuration cached for 1 hour
- Invalidate cache after configuration updates:
  ```typescript
  configManager.invalidateLLMCache('app-123');
  ```

### Rate Limiting

Implement rate limiting at API gateway level:

```typescript
// Example with express-rate-limit
import rateLimit from 'express-rate-limit';

const llmLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  keyGenerator: (req) => req.body.applicationId || req.ip,
});

app.post('/api/prompt-templates/assist/combine-prompts', llmLimiter, ...);
```

### Token Usage Monitoring

Track token usage per application:

```typescript
// In LLMAssistanceService
const usage = {
  applicationId,
  workflow: 'combine-prompts',
  inputTokens: response.usage?.prompt_tokens || 0,
  outputTokens: response.usage?.completion_tokens || 0,
  totalTokens: response.usage?.total_tokens || 0,
  timestamp: new Date(),
};

await logTokenUsage(usage);
```

## Security Best Practices

1. **Never log credentials** - All API keys are encrypted
2. **Validate all inputs** - Length checks, type validation
3. **Use HTTPS only** - In production
4. **Rotate credentials regularly** - Especially AWS keys
5. **Monitor API usage** - Detect unusual patterns
6. **Use least privilege** - Restrict AWS permissions

## Deployment

### Docker Deployment

Create `Dockerfile.backend`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm ci --production

COPY backend/src ./src
RUN npm run build

CMD ["npm", "start"]
```

### Environment Variables in Production

Use a secrets management system:

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name llm-config \
  --secret-string file://config.json

# Or environment variables
export CRYPTO_ENCRYPTION_KEY=$(aws secretsmanager get-secret-value --secret-id crypto-key --query SecretString --output text)
```

## Monitoring

### Key Metrics

1. **LLM API latency**: Average response time
2. **Error rate**: Failed generations vs successful
3. **Token usage**: Total tokens consumed per day
4. **Cost**: Estimated cost based on token usage

### Logging

All LLM operations logged with:
- Request timestamp
- Application ID
- Provider used
- Request/response length
- Error details if failed

## Support

For issues or questions:
1. Check this guide and troubleshooting section
2. Review logs for error details
3. Test with simpler prompts to isolate issues
4. Verify provider credentials are correct

## Changelog

### Version 1.0.0
- Initial release
- Support for OpenAI, Azure OpenAI, Claude, AWS Bedrock
- Three assistance workflows: Templates, Recommendations, KB Summaries
- Full error handling and validation
- Frontend components with side-by-side editing
- Comprehensive documentation and tests
