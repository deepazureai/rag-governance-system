# LLM Provider Configuration Guide

## Overview

The Prompt Debugger Service supports multiple LLM providers to enable flexibility and cost optimization. You can configure a default provider at startup and switch providers per-app at runtime.

## Supported Providers

### 1. Claude (Anthropic)
**Best for:** Advanced reasoning, complex analysis
- Model: `claude-opus-4-1-20250805` (recommended), `claude-sonnet-4-20250514`, `claude-haiku-3-5-20241022`
- Cost: $15/1M input tokens, $75/1M output tokens (Opus)
- API Key: Get from https://console.anthropic.com

**Configuration:**
```bash
LLM_PROVIDER=claude
LLM_MODEL=claude-opus-4-1-20250805
LLM_API_KEY=sk-ant-...
```

### 2. OpenAI
**Best for:** Cost-effective, widely available
- Model: `gpt-4-turbo`, `gpt-4o`, `gpt-4o-mini`
- Cost: $10/1M input, $30/1M output (gpt-4-turbo)
- API Key: Get from https://platform.openai.com/api-keys

**Configuration:**
```bash
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo
LLM_API_KEY=sk-...
```

### 3. DeepSeek
**Best for:** Budget-friendly, open models
- Model: `deepseek-coder`, `deepseek-chat`
- Cost: Very low (~$0.14/1M tokens)
- API Key: Get from https://platform.deepseek.com

**Configuration:**
```bash
LLM_PROVIDER=deepseek
LLM_MODEL=deepseek-coder
LLM_API_KEY=...
```

### 4. Custom Provider (OpenAI-compatible)
**Best for:** Self-hosted models, custom endpoints
- Examples: Ollama, vLLM, Hugging Face Inference
- Cost: Depends on your infrastructure
- Setup: Run any OpenAI-compatible endpoint

**Configuration:**
```bash
LLM_PROVIDER=custom
LLM_MODEL=your-model-name
LLM_API_KEY=your-api-key
LLM_BASE_URL=https://api.your-provider.com/v1
```

## Startup Configuration

**Default provider** is set via environment variables:

```bash
export LLM_PROVIDER=claude
export LLM_MODEL=claude-opus-4-1-20250805
export LLM_API_KEY=sk-ant-xxxxx
export MONGODB_URI=mongodb://localhost:27017
npm start
```

## Per-App Runtime Configuration

To use different providers for different apps, extend the `PUT /api/apps/{appId}/config` endpoint:

```typescript
// Example: Configure App A to use Claude, App B to use OpenAI
POST /api/debug/analyze-prompt
{
  "appId": "app_123",
  "promptId": "prompt_456",
  "promptText": "...",
  "actualOutput": "...",
  "scores": { "groundedness": 45, "relevance": 60 },
  "llmOverride": {
    "provider": "openai",
    "model": "gpt-4-turbo"
  }
}
```

In `src/routes/debug.ts`:
```typescript
// If llmOverride provided, switch provider temporarily
if (request.llmOverride) {
  debugAnalyzer.setLLMConfig({
    provider: request.llmOverride.provider,
    model: request.llmOverride.model,
    apiKey: process.env[`LLM_API_KEY_${request.llmOverride.provider.toUpperCase()}`],
  });
}
```

## Cost Comparison (for 1,000 debug analyses)

Assuming average request: 500 input tokens, 200 output tokens

| Provider | Cost/Request | Cost/1000 |
|----------|--------------|-----------|
| DeepSeek | $0.00007 | $0.07 |
| GPT-4o-mini | $0.00015 | $0.15 |
| GPT-4-Turbo | $0.007 | $7.00 |
| Claude Haiku | $0.0001 | $0.10 |
| Claude Sonnet | $0.0015 | $1.50 |
| Claude Opus | $0.015 | $15.00 |

## Switching Providers at Runtime

```typescript
import { DebugAnalyzer } from './services/DebugAnalyzer';

const analyzer = new DebugAnalyzer(initialConfig);

// Later, switch to different provider
analyzer.setLLMConfig({
  provider: 'openai',
  model: 'gpt-4-turbo',
  apiKey: process.env.OPENAI_API_KEY,
});
```

## Recommendations

- **For production with critical apps:** Use Claude Opus (best reasoning)
- **For most use cases:** Use GPT-4-Turbo (balanced cost/quality)
- **For budget-conscious:** Use DeepSeek or GPT-4o-mini
- **For experimentation:** Use Claude Haiku or GPT-4o-mini
- **For self-hosted:** Deploy open-source model via Ollama + custom provider

## Error Handling

Each provider has its own error patterns. The service abstracts them:

```typescript
try {
  await debugAnalyzer.analyzePrompt(...);
} catch (error) {
  if (error.message.includes('rate_limit')) {
    // Handle rate limiting
  } else if (error.message.includes('invalid_api_key')) {
    // Handle auth error
  }
}
```

## Adding New Providers

To add a new provider (e.g., Groq):

1. Create new class in `src/services/LLMService.ts`:
```typescript
class GroqClient implements ProviderClient {
  provider: LLMProvider = 'groq';
  // ... implement call() method
}
```

2. Update `LLMProvider` type in `src/types/index.ts`:
```typescript
export type LLMProvider = 'claude' | 'openai' | 'deepseek' | 'custom' | 'groq';
```

3. Update `createClient()` in LLMService:
```typescript
case 'groq':
  return new GroqClient(config);
```

4. Document in `.env.example`
