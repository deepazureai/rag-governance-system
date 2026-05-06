import axios, { AxiosInstance } from 'axios';

export interface EvaluationRequest {
  user_prompt: string;
  context: string;
  llm_response: string;
  record_id?: string;
}

export interface EvaluationScore {
  faithfulness: number;
  answer_relevancy: number;
  contextual_relevancy: number;
  toxicity_score: number;
  bias_score: number;
  fairness_score: number;
  explainability_score: number;
}

export interface EvaluationResponse {
  record_id?: string;
  framework: string;
  scores: EvaluationScore;
  timestamp: string;
}

export class DeepEvalClient {
  private client: AxiosInstance;
  private apiKey: string;
  private serviceUrl: string;

  constructor(serviceUrl: string = 'http://localhost:8000', apiKey: string = 'deepeval-dev-key-12345678901234567890') {
    this.serviceUrl = serviceUrl;
    this.apiKey = apiKey;
    
    this.client = axios.create({
      baseURL: this.serviceUrl,
      timeout: 30000,
      headers: {
        'x-api-key': this.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data?.status === 'healthy';
    } catch (error) {
      console.error('[DeepEvalClient] Health check failed:', error);
      return false;
    }
  }

  async evaluate(request: EvaluationRequest): Promise<EvaluationResponse> {
    try {
      const response = await this.client.post('/evaluate', request);
      return response.data;
    } catch (error: any) {
      console.error('[DeepEvalClient] Evaluation failed:', error.response?.data || error.message);
      throw new Error(`DeepEval evaluation failed: ${error.message}`);
    }
  }

  async evaluateBatch(requests: EvaluationRequest[]): Promise<EvaluationResponse[]> {
    try {
      const response = await this.client.post('/evaluate-batch', requests);
      return response.data?.evaluations || [];
    } catch (error: any) {
      console.error('[DeepEvalClient] Batch evaluation failed:', error.response?.data || error.message);
      throw new Error(`DeepEval batch evaluation failed: ${error.message}`);
    }
  }

  async getMetrics(): Promise<any[]> {
    try {
      const response = await this.client.get('/metrics');
      return response.data?.metrics || [];
    } catch (error: any) {
      console.error('[DeepEvalClient] Failed to get metrics:', error.response?.data || error.message);
      throw new Error(`Failed to get DeepEval metrics: ${error.message}`);
    }
  }
}

export default DeepEvalClient;
