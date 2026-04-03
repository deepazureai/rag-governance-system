/**
 * Evaluation Framework Interface
 * This is the core abstraction that all evaluation frameworks must implement
 * Enables seamless switching between RAGAS, Microsoft SDK, and other frameworks
 */

export interface DetailedMetrics {
  groundedness?: number;
  relevance?: number;
  coherence?: number;
  fluency?: number;
  factuality?: number;
  harmfulness?: number;
  safety?: number;
  completeness?: number;
  [key: string]: number | undefined;
}

export interface EvaluationRequest {
  id: string;
  query: string;
  response: string;
  retrievedDocuments: {
    content: string;
    source: string;
    relevance?: number;
  }[];
  groundTruth?: string;
  metadata?: Record<string, unknown>;
}

export interface EvaluationResult {
  id: string;
  frameworkName: string;
  frameworkVersion: string;
  query: string;
  response: string;
  metrics: DetailedMetrics;
  overallScore: number;
  executionTime: number; // milliseconds
  timestamp: string;
  rawData?: Record<string, unknown>;
  errors?: string[];
}

export interface BatchEvaluationRequest {
  id: string;
  evaluations: EvaluationRequest[];
  metadata?: Record<string, unknown>;
}

export interface BatchEvaluationProgress {
  batchId: string;
  completed: number;
  total: number;
  currentIndex: number;
  percentComplete: number;
  estimatedSecondsRemaining: number;
  results?: EvaluationResult[];
}

export interface IEvaluationFramework {
  /**
   * Get framework metadata
   */
  getMetadata(): {
    name: string;
    version: string;
    description: string;
    supportedMetrics: string[];
  };

  /**
   * Initialize framework with configuration
   */
  initialize(): Promise<void>;

  /**
   * Evaluate a single query-response pair
   */
  evaluate(request: EvaluationRequest): Promise<EvaluationResult>;

  /**
   * Evaluate multiple pairs with progress tracking
   */
  evaluateBatch(
    request: BatchEvaluationRequest,
    onProgress?: (progress: BatchEvaluationProgress) => void
  ): Promise<EvaluationResult[]>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;

  /**
   * Cleanup resources
   */
  shutdown(): Promise<void>;
}

export abstract class BaseEvaluationFramework implements IEvaluationFramework {
  protected initialized = false;

  abstract getMetadata(): {
    name: string;
    version: string;
    description: string;
    supportedMetrics: string[];
  };

  abstract initialize(): Promise<void>;

  abstract evaluate(request: EvaluationRequest): Promise<EvaluationResult>;

  async evaluateBatch(
    request: BatchEvaluationRequest,
    onProgress?: (progress: BatchEvaluationProgress) => void
  ): Promise<EvaluationResult[]> {
    const results: EvaluationResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < request.evaluations.length; i++) {
      const evaluation = request.evaluations[i];
      const result = await this.evaluate(evaluation);
      results.push(result);

      // Calculate progress
      const completed = i + 1;
      const totalTime = Date.now() - startTime;
      const avgTimePerItem = totalTime / completed;
      const remainingItems = request.evaluations.length - completed;
      const estimatedSecondsRemaining = Math.round(
        (avgTimePerItem * remainingItems) / 1000
      );

      onProgress?.({
        batchId: request.id,
        completed,
        total: request.evaluations.length,
        currentIndex: i,
        percentComplete: Math.round((completed / request.evaluations.length) * 100),
        estimatedSecondsRemaining,
        results,
      });
    }

    return results;
  }

  abstract healthCheck(): Promise<boolean>;

  async shutdown(): Promise<void> {
    this.initialized = false;
  }

  protected ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error(
        `${this.getMetadata().name} framework not initialized. Call initialize() first.`
      );
    }
  }

  protected calculateOverallScore(metrics: DetailedMetrics): number {
    const values = Object.values(metrics).filter(
      (v) => typeof v === 'number' && v !== undefined
    ) as number[];

    if (values.length === 0) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / values.length) * 100) / 100;
  }
}
