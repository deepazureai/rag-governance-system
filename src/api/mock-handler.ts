import { 
  MOCK_FRAMEWORKS, 
  generateRagasEvaluation, 
  generateMicrosoftEvaluation,
  MOCK_EVALUATION_HISTORY,
  generateBatchEvaluationResponse 
} from './mock-data';

const ENABLE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export interface MockApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Mock API Handler
 * Simulates backend responses for development and testing
 */
export class MockApiHandler {
  static isEnabled(): boolean {
    return ENABLE_MOCK_API;
  }

  static async getFrameworks(): Promise<MockApiResponse<any>> {
    await this.delay(500); // Simulate network latency
    return {
      success: true,
      data: {
        frameworks: MOCK_FRAMEWORKS.available,
        currentFramework: 'ragas',
      },
    };
  }

  static async evaluateQuery(payload: {
    appId: string;
    query: string;
    response: string;
    retrievedDocuments: any[];
    framework?: string;
  }): Promise<MockApiResponse<any>> {
    await this.delay(1500); // Simulate evaluation processing
    
    const framework = payload.framework || 'ragas';
    const metrics = framework === 'microsoft' 
      ? generateMicrosoftEvaluation(payload.query)
      : generateRagasEvaluation(payload.query);

    return {
      success: true,
      data: {
        evaluationId: `eval-${Date.now()}`,
        appId: payload.appId,
        query: payload.query,
        response: payload.response,
        framework,
        metrics,
        tokensUsed: Math.floor(300 + Math.random() * 300),
        costEstimate: Number((0.015 + Math.random() * 0.035).toFixed(3)),
        timestamp: new Date().toISOString(),
        retrievedDocuments: payload.retrievedDocuments,
      },
    };
  }

  static async evaluateBatch(payload: {
    appId: string;
    evaluations: any[];
    framework?: string;
  }): Promise<MockApiResponse<any>> {
    await this.delay(1000);
    
    const batchId = `batch-${Date.now()}`;
    const framework = payload.framework || 'ragas';
    
    return {
      success: true,
      data: {
        batchId,
        appId: payload.appId,
        framework,
        totalEvaluations: payload.evaluations.length,
        startedAt: new Date().toISOString(),
        estimatedCompletionTime: new Date(Date.now() + payload.evaluations.length * 1000).toISOString(),
        status: 'processing',
        wsEndpoint: `/ws/evaluations/${batchId}`,
      },
    };
  }

  static async getEvaluationHistory(appId?: string): Promise<MockApiResponse<any>> {
    await this.delay(300);
    
    const history = appId 
      ? MOCK_EVALUATION_HISTORY.filter(e => e.appId === appId)
      : MOCK_EVALUATION_HISTORY;

    return {
      success: true,
      data: {
        evaluations: history,
        totalCount: history.length,
      },
    };
  }

  static async switchFramework(framework: string): Promise<MockApiResponse<any>> {
    await this.delay(200);
    
    if (!['ragas', 'microsoft'].includes(framework)) {
      return {
        success: false,
        error: 'Invalid framework',
      };
    }

    return {
      success: true,
      data: {
        currentFramework: framework,
        message: `Switched to ${framework} framework`,
      },
    };
  }

  static async healthCheck(): Promise<MockApiResponse<any>> {
    await this.delay(100);
    
    return {
      success: true,
      data: {
        status: 'healthy',
        frameworks: MOCK_FRAMEWORKS.available.map(f => ({
          name: f.name,
          enabled: f.enabled,
        })),
        timestamp: new Date().toISOString(),
      },
    };
  }

  // Utility to simulate network delay
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
