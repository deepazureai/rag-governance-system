# DeepEval and LLM Recommendations System - Deployment Guide

## System Complete

The recommendation generation system is fully implemented with:
- MetricsAnalysisService for DeepEval metric analysis
- LLMAssistanceService.generateRecommendations() for Azure OpenAI-powered suggestions
- Backend endpoint: POST /api/ba-review/get-recommendations
- Frontend modal with enhanced recommendations display

## Build and Deploy

### Step 1: Build Backend
```bash
docker-compose build --no-cache backend
```

### Step 2: Build Frontend
```bash
docker-compose build --no-cache frontend
```

### Step 3: Start Services
```bash
docker-compose up -d
```

## Testing

1. Navigate to localhost:3000/dashboard
2. Click "Click to view recommendations" on any raw data card
3. Click "Generate Recommendations" button in modal
4. View DeepEval analysis and LLM recommendations in modal

## Environment Required

```bash
AZURE_OPENAI_API_KEY=your_key
AZURE_OPENAI_ENDPOINT=https://your-instance.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=o4-mini
AZURE_OPENAI_API_VERSION=2025-04-01-preview
```

## Data Flow

Raw Data Card → Modal Opens → Click "Generate Recommendations" → 
Backend: DeepEval Analysis + LLM Generation → 
Frontend: Display in Modal Sections (DeepEval + LLM Recommendations)

## Metrics Analyzed

- groundedness, coherence, relevance, faithfulness, answerRelevancy
- contextRelevancy, contextPrecision, contextRecall, correctness
- bleuScore, rougeL, llamaCorrectness, llamaRelevancy, llamaFaithfulness
- overallScore

Each metric compared against industry thresholds with specific improvement suggestions.
