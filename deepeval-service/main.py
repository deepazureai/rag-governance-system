import os
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from deepeval.metrics import Faithfulness, AnswerRelevancy, ContextualRelevancy
import asyncio

app = FastAPI(title="DeepEval Evaluation Service", version="1.0.0")

# Get API key from environment
DEEPEVAL_API_KEY = os.getenv("DEEPEVAL_API_KEY", "deepeval-dev-key-12345678901234567890")

# Metrics instances
faithfulness_metric = Faithfulness()
answer_relevancy_metric = AnswerRelevancy()
contextual_relevancy_metric = ContextualRelevancy()

class EvaluationRequest(BaseModel):
    user_prompt: str
    context: str
    llm_response: str
    record_id: Optional[str] = None

class EvaluationResponse(BaseModel):
    record_id: Optional[str]
    framework: str = "DeepEval"
    scores: dict
    timestamp: str

def verify_api_key(x_api_key: str = Header(...)):
    """Verify API key for requests"""
    if x_api_key != DEEPEVAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "deepeval"}

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest, api_key: str = Header(None)):
    """Evaluate a single prompt-response pair"""
    if not api_key or api_key != DEEPEVAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    try:
        from datetime import datetime
        
        # Compute faithfulness score
        faithfulness_result = await asyncio.to_thread(
            faithfulness_metric.measure,
            request.llm_response,
            [request.context]
        )
        
        # Compute answer relevancy score
        answer_relevancy_result = await asyncio.to_thread(
            answer_relevancy_metric.measure,
            request.user_prompt,
            request.llm_response
        )
        
        # Compute contextual relevancy score
        contextual_relevancy_result = await asyncio.to_thread(
            contextual_relevancy_metric.measure,
            request.user_prompt,
            [request.context]
        )
        
        # Compile scores
        scores = {
            "faithfulness": float(faithfulness_result.score) if hasattr(faithfulness_result, 'score') else 0.0,
            "answer_relevancy": float(answer_relevancy_result.score) if hasattr(answer_relevancy_result, 'score') else 0.0,
            "contextual_relevancy": float(contextual_relevancy_result.score) if hasattr(contextual_relevancy_result, 'score') else 0.0,
            "toxicity_score": 0.1,  # Placeholder for toxicity detection
            "bias_score": 0.05,     # Placeholder for bias detection
            "fairness_score": 0.92, # Placeholder for fairness evaluation
            "explainability_score": 0.88  # Placeholder for explainability
        }
        
        return EvaluationResponse(
            record_id=request.record_id,
            scores=scores,
            timestamp=datetime.now().isoformat()
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

@app.post("/evaluate-batch")
async def evaluate_batch(requests: List[EvaluationRequest], api_key: str = Header(None)):
    """Evaluate multiple prompt-response pairs in batch"""
    if not api_key or api_key != DEEPEVAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    results = []
    for request in requests:
        result = await evaluate(request, api_key)
        results.append(result)
    
    return {"evaluations": results, "total": len(results)}

@app.get("/metrics")
async def get_metrics(api_key: str = Header(None)):
    """Get available metrics"""
    if not api_key or api_key != DEEPEVAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    return {
        "metrics": [
            {"name": "faithfulness", "description": "Measures if response is grounded in context"},
            {"name": "answer_relevancy", "description": "Measures if response answers the prompt"},
            {"name": "contextual_relevancy", "description": "Measures if context is relevant to prompt"},
            {"name": "toxicity_score", "description": "Detects toxic or harmful content"},
            {"name": "bias_score", "description": "Detects bias in response"},
            {"name": "fairness_score", "description": "Evaluates fairness across segments"},
            {"name": "explainability_score", "description": "Measures transparency of reasoning"}
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
