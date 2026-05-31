# DeepEval and LLM Recommendations - Complete Requirements

## Overview

The recommendations system requires TWO sources of analysis:
1. **DeepEval** - Framework for analyzing evaluation metrics and identifying issues
2. **LLM** - Uses Settings LLM to generate actionable suggestions based on analysis

Both require complete, properly-structured data about the evaluation record.

---

## Data Structure Required

### Core Record Data (from Raw Data)

```typescript
interface RecommendationInput {
  // Original prompt and response
  userPrompt: string;           // The original user query (REQUIRED)
  llmResponse: string;          // The LLM's response (REQUIRED)
  
  // Context used for generation
  contextRetrieved: Array<{
    source: string;            // Document/source name
    relevanceScore: number;    // 0-1 or 0-100
    content: string;           // Actual context chunk used
  }>;                          // (REQUIRED for context analysis)
  
  // ALL evaluation metrics - NOT just one
  evaluationScores: Array<{
    metricName: string;        // 'groundedness', 'coherence', 'relevance', etc.
    value: number;             // Score (0-100 typically)
    timestamp: string;         // When calculated
  }>;                          // (REQUIRED - ALL metrics needed)
  
  // Timing information
  userPromptEnteredAt: string; // ISO timestamp when user entered prompt
  llmResponseGeneratedAt: string; // ISO timestamp when LLM generated response
  contextRetrievalTime?: number;  // Milliseconds to retrieve context
  llmGenerationTime?: number;     // Milliseconds for LLM generation
  totalLatency?: number;          // Total end-to-end latency
  tokensUsed?: number;            // Token count for cost analysis
  
  // User feedback
  userFeedback?: {
    sentiment: 'positive' | 'negative' | 'neutral';
    comment?: string;
  };
}
```

---

## How DeepEval Uses the Data

### Inputs to DeepEval

DeepEval analyzes the record to identify issues:

```json
{
  "query": "What is machine learning?",
  "response": "Machine learning is... [LLM response]",
  "context": [
    {
      "source": "Wikipedia",
      "relevance": 0.95,
      "content": "Machine learning is a subset of AI..."
    }
  ],
  "metrics": {
    "groundedness": 45,
    "coherence": 88,
    "relevance": 52,
    "answerRelevancy": 60,
    "contextRecall": 75,
    "contextPrecision": 82
  }
}
```

### Analysis Output from DeepEval

DeepEval identifies issues:

```json
{
  "issues": [
    {
      "metric": "groundedness",
      "score": 45,
      "severity": "critical",
      "reason": "LLM made claims not supported by context",
      "example": "Claim about X not found in provided context",
      "suggestedFix": "Either add source context or remove unsupported claim"
    },
    {
      "metric": "relevance",
      "score": 52,
      "severity": "high",
      "reason": "Answer doesn't directly address user question",
      "example": "Asked for Y but answered about Z",
      "suggestedFix": "Restructure answer to lead with direct answer"
    }
  ],
  "strengths": [
    {
      "metric": "coherence",
      "score": 88,
      "reason": "Response is well-structured and logical"
    }
  ],
  "overallAnalysis": "Response has foundation but lacks grounding in provided context..."
}
```

---

## How LLM Uses the Data

### Prompt to LLM for Recommendations

The LLM receives structured analysis:

```
You are a prompt optimization expert. Analyze this RAG evaluation record and provide 
improvement recommendations.

ORIGINAL PROMPT:
What is machine learning?

LLM RESPONSE:
[Full LLM response text]

CONTEXT PROVIDED (sorted by relevance):
Source: Wikipedia (relevance: 0.95)
Machine learning is a subset of artificial intelligence...
---

Source: Research Paper (relevance: 0.87)
Recent advances in ML include transformers...
---

EVALUATION RESULTS:
- Groundedness: 45/100 (CRITICAL - needs context grounding)
- Coherence: 88/100 (GOOD)
- Relevance: 52/100 (HIGH PRIORITY)
- Answer Relevancy: 60/100 (needs alignment)
- Context Recall: 75/100
- Context Precision: 82/100

ISSUES IDENTIFIED:
1. CRITICAL: Response contains unsupported claims not in context
2. HIGH: Answer doesn't directly address the core question
3. MEDIUM: Context not fully utilized in response

TIMING ANALYSIS:
- Context retrieval: 245ms
- LLM generation: 1200ms
- Total latency: 1500ms
- Tokens used: 325

USER FEEDBACK:
Sentiment: negative - "Answer was confusing and not directly helpful"

TASK:
1. Analyze why this response failed specific metrics
2. Suggest improvements to the original PROMPT (not the response)
3. Consider both content issues and context issues
4. Provide 3-5 specific, actionable suggestions

Return JSON with:
{
  "reasoning": "Why the response scored low...",
  "suggestions": [
    {
      "issue": "What's wrong",
      "suggestion": "How to improve the PROMPT",
      "expectedImprovement": "Which metrics should improve"
    }
  ]
}
```

### LLM Response Example

```json
{
  "reasoning": "The response scored low on groundedness because the prompt didn't provide 
    enough constraints about using only provided context. The answer scored low on relevance 
    because the prompt was too open-ended and didn't emphasize the specific aspect the user 
    cared about.",
  "suggestions": [
    {
      "issue": "LLM included unsupported claims",
      "suggestion": "Change 'What is machine learning?' to 'Using ONLY the provided context, 
        explain what machine learning is. If information is not in the context, say 
        \"This information is not available in the provided sources.\"'",
      "expectedImprovement": "groundedness +35, factuality +30"
    },
    {
      "issue": "Answer was tangential to user question",
      "suggestion": "Be more specific: 'Define machine learning in 2-3 sentences. Then provide 
        key examples from the provided sources.'",
      "expectedImprovement": "relevance +30, answerRelevancy +25"
    },
    {
      "issue": "Context wasn't fully utilized",
      "suggestion": "Add: 'Support each point with quotes or citations from the provided sources.'",
      "expectedImprovement": "contextRecall +20, groundedness +25"
    }
  ]
}
```

---

## What Was Just Fixed

### Backend Fix (baReviewRoutes.ts)

**Before (incomplete):**
```javascript
evaluationScores: [
  {
    metricName: metric,        // Only the clicked metric
    value: value,              // Just that one value
    timestamp: record.timestamp,
  },
]
```

**After (complete):**
```javascript
// Build complete evaluation scores from ALL metrics in the record
const allEvaluationScores = record.evaluation || {};
const evaluationScoresArray = Object.entries(allEvaluationScores)
  .map(([metricName, value]) => ({
    metricName,
    value: typeof value === 'number' ? value : 0,
    timestamp: record.timestamp || record.createdAt,
  }));

evaluationScores: evaluationScoresArray.length > 0 ? evaluationScoresArray : [...]
```

**Also added:**
- `userPromptEnteredAt` - When user submitted prompt
- `llmResponseGeneratedAt` - When LLM generated response  
- `contextRetrievalTime` - How long context retrieval took
- `llmGenerationTime` - How long LLM took to generate
- `tokensUsed` - Token count for cost analysis

---

## What Needs to be Built Next

### Phase 1: DeepEval Integration Service

**File:** `backend/src/services/RecommendationService.ts` (NEW)

```typescript
export class RecommendationService {
  async getDeepEvalAnalysis(record: RawDataRecordDetail): Promise<DeepEvalAnalysis> {
    // 1. Extract metrics from record.evaluationScores
    // 2. Compare against industry thresholds
    // 3. Identify issues and strengths
    // 4. Return structured analysis
    
    const analysis = {
      issues: [
        // Issues found
      ],
      strengths: [
        // What worked well
      ],
      overallAnalysis: "Summary of findings"
    };
    
    return analysis;
  }
}
```

### Phase 2: LLM Recommendation Endpoint

**File:** `backend/src/api/baReviewRoutes.ts` (add new route)

```typescript
// POST /api/ba-review/get-recommendations
baReviewRouter.post('/get-recommendations', async (req: Request, res: Response) => {
  try {
    const { 
      userPrompt, 
      llmResponse, 
      evaluationScores, 
      contextRetrieved,
      applicationId 
    } = req.body;
    
    // 1. Get DeepEval analysis
    const deepEvalAnalysis = await recommendationService.getDeepEvalAnalysis({
      userPrompt,
      llmResponse,
      evaluationScores,
      contextRetrieved
    });
    
    // 2. Get LLM from Settings
    const llmConfig = await llmConfigService.getConfig(applicationId);
    if (!llmConfig) throw new Error('LLM not configured');
    
    // 3. Call LLM with recommendation prompt
    const llmResponse = await llmService.generateRecommendations({
      userPrompt,
      llmResponse,
      evaluationScores,
      contextRetrieved,
      deepEvalAnalysis,
      llmConfig
    });
    
    // 4. Return both analyses
    res.json({
      success: true,
      data: {
        deepEval: deepEvalAnalysis,
        llmRecommendations: llmResponse
      }
    });
  } catch (error) {
    // Error handling
  }
});
```

### Phase 3: Modal Enhancement

**File:** `src/components/dashboard/raw-data-detail-modal.tsx`

The modal already exists. Add:

```typescript
const handleGetRecommendations = async (): Promise<void> => {
  setIsGeneratingRecommendations(true);
  
  try {
    const response = await fetch(
      `${apiUrl}/api/ba-review/get-recommendations`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: record.userPrompt,
          llmResponse: record.llmResponse,
          evaluationScores: record.evaluationScores,
          contextRetrieved: record.contextRetrieved,
          applicationId: record.applicationId
        })
      }
    );
    
    const result = await response.json();
    
    // Display DeepEval findings
    setDeepEvalSuggestions(formatDeepEvalResults(result.data.deepEval));
    
    // Display LLM recommendations
    setLlmRecommendations(result.data.llmRecommendations);
    
    setExpandedSections(prev => ({
      ...prev,
      recommendations: true
    }));
  } catch (error) {
    console.error('[v0] Error getting recommendations:', error);
    alert('Failed to generate recommendations');
  } finally {
    setIsGeneratingRecommendations(false);
  }
};
```

---

## Data Flow

```
User clicks "View Recommendations"
    ↓
GET /api/ba-review/raw-data-by-metric?applicationId=...&metric=...&value=...
    ↓
Backend returns RawDataRecordDetail with:
  ✓ userPrompt
  ✓ llmResponse
  ✓ contextRetrieved[]
  ✓ evaluationScores[] (ALL metrics)
  ✓ Timing data
    ↓
Modal displays record
User clicks "Get Recommendations"
    ↓
POST /api/ba-review/get-recommendations
  Payload: {
    userPrompt,
    llmResponse,
    evaluationScores,
    contextRetrieved,
    applicationId
  }
    ↓
Backend:
  1. Analyze metrics → DeepEval issues
  2. Call LLM with prompt + response + context + metrics + issues
  3. Return both analyses
    ↓
Modal displays:
  - DeepEval findings
  - LLM recommendations
  - BA curates/edits
    ↓
BA clicks "Save Recommendation"
    ↓
Stored in baReview.promptImprovements[]
```

---

## Testing Checklist

- [x] Backend returns complete record with ALL evaluation metrics
- [x] Backend includes userPrompt, llmResponse, contextRetrieved
- [x] Backend includes timing data
- [ ] DeepEval service analyzes metrics
- [ ] LLM endpoint generates recommendations
- [ ] Modal receives full record data
- [ ] Modal displays DeepEval findings
- [ ] Modal displays LLM recommendations
- [ ] BA can edit/save improvements

---

## Summary

**What was fixed:**
- Backend now returns COMPLETE record data with ALL metrics, not just one
- Record includes timing information and context
- Frontend defensive code prevents null errors

**What's needed next:**
- DeepEval analysis service to identify issues
- LLM endpoint to generate recommendations based on analysis
- Modal integration to call endpoint and display results

**Key principle:**
DeepEval analyzes the metrics to find issues → LLM uses those issues + full context to suggest prompt improvements
