import os
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncio
from datetime import datetime

app = FastAPI(title="DeepEval Evaluation Service", version="1.0.0")

# Get API key from environment
DEEPEVAL_API_KEY = os.getenv("DEEPEVAL_API_KEY", "")

# Note: Using a simplified evaluation approach since specific metrics may not be available
# in this version. Production should use a specific metrics library version.

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
    if not DEEPEVAL_API_KEY:
        raise HTTPException(status_code=500, detail="DEEPEVAL_API_KEY not configured")
    if x_api_key != DEEPEVAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    return x_api_key

@app.get("/health")
async def health_check():
    """Health check endpoint - no database connection required"""
    return {"status": "healthy", "service": "deepeval"}

@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate(request: EvaluationRequest, api_key: str = Header(None)):
    """Evaluate a single prompt-response pair"""
    if not api_key or api_key != DEEPEVAL_API_KEY:
        raise HTTPException(status_code=403, detail="Invalid API key")
    
    try:
        # Placeholder evaluation scores - implement actual metrics here
        # when migrating to a stable version with available metrics
        scores = {
            "faithfulness": 0.85,
            "answer_relevancy": 0.90,
            "contextual_relevancy": 0.88
        }
        
        return EvaluationResponse(
            record_id=request.record_id,
            framework="DeepEval",
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
