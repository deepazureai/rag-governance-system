# DeepEval + Azure OpenAI LLM-as-Judge Implementation

## Overview

This document outlines the comprehensive hallucination detection and prompt improvement system that integrates Azure OpenAI as an LLM Judge with the RAG Governance System.

## What's Been Implemented

### 1. **Azure OpenAI Configuration Service** (`AzureOpenAIConfig.ts`)
- Initializes Azure OpenAI client with proper endpoint and API key management
- Singleton pattern ensures single client instance
- Supports configurable deployment IDs (default: `gpt-4`)
- Environment variables:
  - `AZURE_OPENAI_API_KEY`: Your Azure OpenAI API key
  - `AZURE_OPENAI_ENDPOINT`: Your Azure OpenAI endpoint URL
  - `AZURE_OPENAI_DEPLOYMENT_ID`: The model deployment ID (e.g., `gpt-4`, `gpt-35-turbo`)

### 2. **Hallucination Detection Service** (`HallucinationDetectionService.ts`)

#### Core Functions:

**A. `detectHallucinations(sourceDocuments, userPrompt, llmResponse)`**
- **What it does**: Uses Azure OpenAI as LLM Judge to analyze LLM responses against source documents
- **Returns**: 
  ```typescript
  {
    hallucinationScore: 0-100,        // How severe the hallucinations are
    groundednessScore: 0-100,         // How well grounded in source material
    detectedHallucinations: [],       // Specific false claims found
    missingContexts: [],              // What context is missing from PROMPT
    incompleteElements: [],           // What's incomplete in PROMPT
    promptGaps: [],                   // Structural gaps in PROMPT
    suggestions: [                    // Concrete improvement suggestions
      {
        category: 'structure' | 'context' | 'clarity' | 'constraints',
        issue: "What's wrong",
        currentScore: 40,
        suggestedScore: 75,            // Expected groundedness after fix
        suggestion: "How to fix it",
        example: "Example of improvement"
      }
    ],
    reasoning: "Detailed analysis"
  }
  ```

**Key Point**: The analysis identifies **what's missing or incomplete in the PROMPT**, not just in the response. This is critical for prompt engineering.

**B. `generateImprovedPrompt(originalPrompt, issues, targetGroundedness)`**
- **What it does**: Generates an improved version of the prompt that addresses identified issues
- **Returns**:
  ```typescript
  {
    improvedPrompt: "Better version of the prompt",
    improvements: [
      "Added explicit output format specification",
      "Included domain-specific term definitions"
    ],
    expectedGroundednessIncrease: 25  // How much groundedness should improve
  }
  ```

**Example**:
```
ORIGINAL (Groundedness: 40):
"Summarize the document"

IMPROVED (Expected Groundedness: 80):
"Summarize the provided document. 
- Use ONLY information from the source document
- If information is not in the source, explicitly state 'This is not covered in the source'
- Format: {title, keyPoints[], sourceVerified: boolean}
- Cite specific sections from the source for each claim"
```

**C. `analyzePromptQuality(prompt)`**
- Evaluates prompt clarity, specificity, and best practices
- Identifies structural issues before evaluation even starts

#### How It Works:

1. **Sends to Azure OpenAI**:
   - Source documents (context)
   - User prompt (what you're asking the system to do)
   - LLM response (what the system generated)

2. **Azure OpenAI Analyzes**:
   - Checks if claims in response are verifiable in source documents
   - Identifies hallucinations (false claims, made-up information)
   - Rates groundedness (0-100: how well grounded in sources)
   - **Examines the PROMPT structure** to find:
     - What context is missing (e.g., "You didn't tell it to cite sources")
     - What's incomplete (e.g., "Output format not specified")
     - Structural gaps (e.g., "No verification steps defined")

3. **Provides Suggestions**:
   - Each suggestion shows: current groundedness → suggested groundedness
   - Example: "Adding output format requirement could increase groundedness from 40 to 65"

### 3. **API Endpoints** (`hallucinationDetectionRoutes.ts`)

#### Endpoint 1: Hallucination Detection
```
POST /api/evaluation/hallucination-detection
{
  "sourceDocuments": ["doc1 content", "doc2 content"],
  "userPrompt": "Your prompt here",
  "llmResponse": "The system's response",
  "recordId": "optional-id"
}

Response:
{
  "analysis": HallucinationAnalysis,
  "timestamp": "2024-..."
}
```

#### Endpoint 2: Prompt Quality Analysis
```
POST /api/evaluation/prompt-quality
{
  "prompt": "Your prompt here",
  "recordId": "optional-id"
}

Response:
{
  "score": 65,
  "issues": ["Clarity issue", "Missing constraints"],
  "suggestions": ["How to improve", ...]
}
```

#### Endpoint 3: Generate Improved Prompt
```
POST /api/evaluation/generate-improved-prompt
{
  "originalPrompt": "Current prompt",
  "issues": ["Issue 1", "Issue 2"],
  "targetGroundedness": 80
}

Response:
{
  "improvedPrompt": "Better version",
  "improvements": ["What changed"],
  "expectedGroundednessIncrease": 25
}
```

#### Endpoint 4: End-to-End Evaluation (Complete Pipeline)
```
POST /api/evaluation/end-to-end
{
  "sourceDocuments": ["..."],
  "userPrompt": "...",
  "llmResponse": "...",
  "targetGroundedness": 80
}

Response:
{
  "hallucinationAnalysis": {...},
  "promptQuality": {...},
  "improvedPrompt": {...},
  "summary": {
    "currentGroundedness": 40,
    "targetGroundedness": 80,
    "gap": 40,
    "potentialImprovement": 35,
    "hallucinationCount": 3,
    "suggestionCount": 5
  }
}
```

## RAGAS vs DeepEval vs LLM-as-Judge

### RAGAS Framework
- **Type**: Rule-based metrics (heuristics)
- **Metrics**: Groundedness, Relevance, Coherence, Fluency, Factuality, Harmfulness
- **Cost**: Free (no LLM calls)
- **Speed**: Very fast
- **Accuracy**: Good for general indicators, but can miss nuanced hallucinations

### DeepEval (This Implementation)
- **Type**: LLM-as-Judge using Azure OpenAI
- **Metrics**: Hallucination Detection, Groundedness Analysis, Prompt Quality
- **Cost**: Based on Azure OpenAI token usage
- **Speed**: Slower (LLM calls required)
- **Accuracy**: Excellent - uses actual LLM reasoning to detect hallucinations
- **Unique Feature**: Provides specific, actionable suggestions for prompt improvement

### Usage Strategy:
1. **Quick feedback**: Use RAGAS for initial metrics
2. **Deep analysis**: Use LLM-as-Judge for detailed hallucination detection
3. **Prompt optimization**: Use `generateImprovedPrompt` to enhance prompts

## Configuration

### Required Environment Variables (in `.env.local`):

```bash
# Azure OpenAI (for LLM-as-Judge)
AZURE_OPENAI_API_KEY=your-api-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_ID=gpt-4  # or gpt-35-turbo
```

### Add to docker-compose.yml:
```yaml
environment:
  AZURE_OPENAI_API_KEY: ${AZURE_OPENAI_API_KEY}
  AZURE_OPENAI_ENDPOINT: ${AZURE_OPENAI_ENDPOINT}
  AZURE_OPENAI_DEPLOYMENT_ID: ${AZURE_OPENAI_DEPLOYMENT_ID:-gpt-4}
  HALLUCINATION_DETECTION_ENABLED: true
```

## Usage Example

### Scenario: Prompt has 40% groundedness, want to reach 80%

```javascript
// Step 1: Detect hallucinations
const analysis = await detectHallucinations(
  ["Source doc 1", "Source doc 2"],
  "Your prompt",
  "System's response"
);

// Result:
// groundednessScore: 40
// missingContexts: ["No instruction to cite sources"]
// incompleteElements: ["Output format not specified"]
// promptGaps: ["No verification step defined"]

// Step 2: Generate improved prompt
const improved = await generateImprovedPrompt(
  "Your prompt",
  analysis.missingContexts,
  80  // target groundedness
);

// Result:
// improvedPrompt: "Your prompt + added constraints + citations + format"
// expectedGroundednessIncrease: 35  // Can go from 40 to 75

// Step 3: Use improved prompt with system
// Expected groundedness: ~75 (close to target of 80)
```

## Next Steps: Frontend Integration

To add this to the Prompt Validation screen:

1. **Add Azure GPT as an evaluation option** alongside RAGAS
2. **Show hallucination detection results** with detailed reasoning
3. **Display improvement suggestions** with expected score increases
4. **Allow one-click prompt improvement** using `generateImprovedPrompt`
5. **Validate improved prompts** against uploaded documents

## File Structure

```
backend/src/
├── services/
│   ├── AzureOpenAIConfig.ts                 (NEW)
│   └── HallucinationDetectionService.ts     (NEW)
├── api/
│   └── hallucinationDetectionRoutes.ts      (NEW)
├── index.ts                                  (MODIFIED - added routes)
└── .env                                      (MODIFIED - added config)

.env.local.example                            (NEW - template)
docker-compose.yml                            (MODIFIED - added env vars)
```

## Cost Considerations

Each hallucination detection call to Azure OpenAI uses:
- ~1000-2000 input tokens (source docs + prompt + response)
- ~500-1000 output tokens (analysis + suggestions)
- **Estimate**: ~$0.01-0.05 per evaluation (GPT-4)

For production, you may want to:
- Batch evaluations
- Cache common analyses
- Use cheaper models (gpt-3.5-turbo) for initial screening
- Implement rate limiting

## Security Notes

- Azure OpenAI API keys are now stored in environment variables
- All credentials should be in `.env.local` (added to `.gitignore`)
- In production, load from Azure Key Vault
- Never commit `.env.local` files
