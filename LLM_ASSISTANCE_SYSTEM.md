# LLM-Assisted Workflow System

Comprehensive LLM assistance integration for prompt templates, recommendations, and knowledge base content. Supports 4 major LLM providers (OpenAI, Azure OpenAI, Claude, AWS Bedrock) with user-confirmed assistance patterns.

## Overview

This system provides three main LLM-assisted workflows:

1. **Template Assistance**: Combine multiple prompts into a single optimized template
2. **Recommendation Refinement**: Improve and polish BA recommendation text
3. **Knowledge Base Summarization**: Generate concise summaries of KB content

All workflows follow the same principle: **AI suggests, user edits, user saves**. No auto-saving of LLM suggestions.

## Architecture

### Backend Structure

```
backend/src/
├── services/
│   ├── LLMAssistanceService.ts       # Main assistance service
│   ├── LLMClientFactory.ts           # Factory for creating LLM providers
│   └── ConfigManager.ts              # Configuration management & validation
├── api/
│   ├── promptTemplateRoutes.ts       # Template assistance endpoint
│   ├── baReviewRoutes.ts             # Recommendation refinement endpoint
│   └── knowledgeBaseRoutes.ts        # KB summary generation endpoint
└── utils/
    ├── ConfigManager.ts              # Config validation & caching
    └── CryptoUtil.ts                 # Credential encryption
```

### Frontend Components

```
src/components/dashboard/
├── llm-template-assistant.tsx        # Template combination UI
├── recommendation-refiner.tsx        # Recommendation improvement UI
└── kb-summary-generator.tsx          # KB content summarization UI
```

### API Clients

```
src/api/
└── prompt-template-client.ts         # API client for all LLM endpoints
```

## Supported LLM Providers

### 1. OpenAI

Configuration fields:
- `openaiApiKey`: API key from OpenAI
- `openaiModel`: Model ID (e.g., "gpt-4", "gpt-3.5-turbo")

Example config:
```json
{
  "provider": "openai",
  "openaiApiKey": "sk-...",
  "openaiModel": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

### 2. Azure OpenAI

Configuration fields:
- `azureEndpoint`: Azure endpoint URL
- `azureApiKey`: Azure API key
- `azureDeploymentName`: Deployment name
- `azureApiVersion`: API version (e.g., "2024-02-15-preview")

Example config:
```json
{
  "provider": "azure-openai",
  "azureEndpoint": "https://your-resource.openai.azure.com",
  "azureApiKey": "...",
  "azureDeploymentName": "deployment-name",
  "azureApiVersion": "2024-02-15-preview",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

### 3. Claude (Anthropic)

Configuration fields:
- `claudeApiKey`: API key from Anthropic
- `claudeModel`: Model ID (e.g., "claude-3-opus-20240229", "claude-3-sonnet-20240229")

Example config:
```json
{
  "provider": "claude",
  "claudeApiKey": "sk-ant-...",
  "claudeModel": "claude-3-opus-20240229",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

### 4. AWS Bedrock

Configuration fields:
- `awsRegion`: AWS region (e.g., "us-east-1", "us-west-2")
- `bedrockModelId`: Model ID (e.g., "anthropic.claude-3-sonnet-20240229-v1:0")
- `awsAccessKeyId` (optional): AWS access key ID
- `awsSecretAccessKey` (optional): AWS secret access key

Supported model families:
- **Claude**: `anthropic.claude-*`
- **Llama**: `meta.llama*`
- **Mistral**: `mistral.*`
- **Cohere**: `cohere.command-*`

Example config:
```json
{
  "provider": "aws-bedrock",
  "awsRegion": "us-east-1",
  "bedrockModelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
  "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "temperature": 0.7,
  "maxTokens": 2048
}
```

## API Endpoints

### Template Assistance

**POST** `/api/prompt-templates/assist/combine-prompts`

Combines multiple selected prompts into a single optimized template.

Request body:
```json
{
  "applicationId": "app-123",
  "selectedPromptIds": ["prompt-1", "prompt-2", "prompt-3"],
  "userContext": "Optional context about the desired outcome"
}
```

Response:
```json
{
  "success": true,
  "message": "LLM suggestion generated successfully",
  "data": {
    "suggestion": "Combined and improved prompt text...",
    "selectedPromptIds": ["prompt-1", "prompt-2", "prompt-3"],
    "llmProvider": "gpt-4",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Recommendation Refinement

**POST** `/api/ba-review/assist/refine-recommendation`

Improves and refines BA recommendation text.

Request body:
```json
{
  "applicationId": "app-123",
  "queueItemId": "queue-456",
  "recommendationText": "Original recommendation text..."
}
```

Response:
```json
{
  "success": true,
  "message": "LLM suggestion generated successfully",
  "data": {
    "suggestion": "Refined recommendation text...",
    "originalRecommendation": "Original recommendation text...",
    "queueItemId": "queue-456",
    "llmProvider": "configured-provider",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Knowledge Base Summarization

**POST** `/api/knowledge-base/assist/generate-summary`

Generates a concise summary of KB content.

Request body:
```json
{
  "applicationId": "app-123",
  "documentId": "doc-789",
  "contentText": "Full document content..."
}
```

Response:
```json
{
  "success": true,
  "message": "KB summary suggestion generated successfully",
  "data": {
    "suggestion": "Concise summary of the content...",
    "originalContentLength": 5000,
    "documentId": "doc-789",
    "llmProvider": "configured-kb-provider",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## Frontend Components

### LLMTemplateAssistant

Modal for template generation with LLM assistance.

```tsx
import { LLMTemplateAssistant } from '@/components/dashboard/llm-template-assistant';

<LLMTemplateAssistant
  applicationId="app-123"
  selectedPromptIds={["prompt-1", "prompt-2"]}
  isOpen={true}
  onClose={() => {}}
  onSave={async (finalTemplate, llmSuggestion) => {
    // Save template
  }}
/>
```

Features:
- Side-by-side comparison of LLM suggestion and user edits
- Copy/Reset buttons for editing
- Character count metrics
- Error and success handling

### RecommendationRefiner

Modal for refining BA recommendations.

```tsx
import { RecommendationRefiner } from '@/components/dashboard/recommendation-refiner';

<RecommendationRefiner
  applicationId="app-123"
  originalRecommendation="Original text..."
  queueItemId="queue-456"
  isOpen={true}
  onClose={() => {}}
  onSave={async (refinedText, llmSuggestion) => {
    // Save recommendation
  }}
/>
```

Features:
- Original recommendation display for context
- Side-by-side editing interface
- Character count tracking
- Full error handling

### KBSummaryGenerator

Dialog for generating KB content summaries.

```tsx
import { KBSummaryGenerator } from '@/components/dashboard/kb-summary-generator';

<KBSummaryGenerator
  applicationId="app-123"
  documentContent="Full content..."
  documentId="doc-789"
  documentTitle="Document Title"
  isOpen={true}
  onClose={() => {}}
  onSave={async (summary, llmSuggestion) => {
    // Save summary
  }}
/>
```

Features:
- Content compression ratio calculation
- Detailed comparison statistics
- Multi-window editing view
- Supports large documents (auto-truncates)

## Configuration Management

### ConfigManager

Handles LLM configuration storage, validation, and caching.

Key methods:
- `getApplicationLLMConfig(applicationId)`: Fetch LLM config for dashboard workflows
- `getApplicationKBConfig(applicationId)`: Fetch separate LLM config for KB workflows
- `validateLLMConfig(config)`: Validate dashboard LLM configuration
- `validateKBConfig(config)`: Validate KB LLM configuration
- `invalidateLLMCache(applicationId)`: Clear cache after config updates

Features:
- Configuration caching (1 hour TTL)
- Automatic retry logic (up to 3 attempts)
- Credential encryption/decryption
- Default configuration initialization
- Comprehensive error handling

### CryptoUtil

Handles encryption and decryption of sensitive credentials.

Methods:
- `encrypt(plaintext)`: Encrypt sensitive data
- `decrypt(encrypted)`: Decrypt sensitive data

Used for:
- API keys
- AWS credentials
- Database connection strings
- All sensitive configuration

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

Common error scenarios:
- Missing required fields: 400 Bad Request
- Invalid configuration: 400 Bad Request
- LLM generation failure: 500 Internal Server Error
- Invalid credentials: 500 Internal Server Error
- Content validation failure: 400 Bad Request

## Usage Examples

### Complete Template Generation Flow

```tsx
// 1. User selects prompts from library
const [selectedIds, setSelectedIds] = useState([]);

// 2. Open LLM assistance modal
const [showAssistant, setShowAssistant] = useState(false);

// 3. Handle suggestion and save
const handleSave = async (finalTemplate, llmSuggestion) => {
  const response = await fetch('/api/prompt-templates/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId,
      templateName: 'Combined Template',
      promptTemplate: finalTemplate,
      qualityGuidelines: 'Guidelines...',
      baEmail: userEmail,
    }),
  });

  const result = await response.json();
  console.log('Template saved:', result.data);
};

// 4. Render component
return (
  <LLMTemplateAssistant
    applicationId={appId}
    selectedPromptIds={selectedIds}
    isOpen={showAssistant}
    onClose={() => setShowAssistant(false)}
    onSave={handleSave}
  />
);
```

### Recommendation Refinement Flow

```tsx
// 1. BA writes initial recommendation
const [recommendation, setRecommendation] = useState('');

// 2. Open refiner
const handleRefine = async () => {
  setShowRefiner(true);
};

// 3. Save refined version
const handleSaveRefined = async (refined, original) => {
  await fetch('/api/ba-review/update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      queueItemId,
      improvedPrompt: refined,
      reason: 'Refined with LLM assistance',
    }),
  });

  setRecommendation(refined);
};

// 4. Render
return (
  <RecommendationRefiner
    applicationId={appId}
    originalRecommendation={recommendation}
    isOpen={showRefiner}
    onClose={() => setShowRefiner(false)}
    onSave={handleSaveRefined}
  />
);
```

## Testing

Run backend tests:
```bash
cd backend
npm test
```

Run frontend type checking:
```bash
cd src
npx tsc --noEmit
```

## Deployment

1. Set environment variables:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.example.com
   CRYPTO_ENCRYPTION_KEY=<generated-key>
   ```

2. Deploy backend:
   ```bash
   cd backend
   npm run build
   npm start
   ```

3. Deploy frontend:
   ```bash
   npm run build
   npm start
   ```

## Security Considerations

1. **Credential Storage**: All API keys and credentials are encrypted using CryptoUtil
2. **Configuration Caching**: Cached for 1 hour with automatic invalidation
3. **Request Validation**: All inputs validated for length and content
4. **Error Messages**: Sensitive information not exposed in error responses
5. **CORS**: Configured to prevent unauthorized access
6. **Rate Limiting**: Can be added at API gateway level

## Troubleshooting

### LLM Suggestion Generation Fails

1. Check provider credentials are correct
2. Verify API keys have required permissions
3. Check API rate limits haven't been exceeded
4. Review error message in response

### Configuration Not Loading

1. Verify application ID is correct
2. Check configuration exists in system
3. Verify encryption key is set
4. Review ConfigManager logs

### Frontend Component Not Rendering

1. Verify API endpoint is accessible
2. Check CORS configuration
3. Review browser console for errors
4. Verify component props are correct

## Contributing

When adding new LLM providers:

1. Implement `ILLMProvider` interface
2. Add provider to `LLMClientFactory.create()`
3. Add validation to `ConfigManager`
4. Add provider to settings UI
5. Document provider configuration
6. Add test cases

## License

Internal use only
