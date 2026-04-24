/**
 * Evaluation Service
 * Orchestrates evaluation requests using the selected framework
 */

import { v4 as uuidv4 } from 'uuid';
import { getFrameworkRegistry, FrameworkType } from '../frameworks/registry';
import { IEvaluationFramework, EvaluationRequest, EvaluationResult, BatchEvaluationRequest, BatchEvaluationProgress } from '../frameworks/types';
import { IDatabase } from './database';

export interface EvaluationServiceConfig {
  defaultFramework?: FrameworkType;
  maxBatchSize?: number;
}

export class EvaluationService {
  private database: IDatabase;
  private registry = getFrameworkRegistry();
  private config: Required<EvaluationServiceConfig>;

  constructor(database: IDatabase, config?: EvaluationServiceConfig) {
    this.database = database;
    this.config = {
      defaultFramework: config?.defaultFramework || FrameworkType.RAGAS,
      maxBatchSize: config?.maxBatchSize || 100,
    };
  }

  /**
   * Get list of available frameworks
   */
  getAvailableFrameworks() {
    return this.registry.getAvailableFrameworks();
  }

  /**
   * Evaluate a single query-response pair
   */
  async evaluateQuery(
    appId: string,
    query: string,
    response: string,
    retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>,
    framework?: FrameworkType
  ): Promise<EvaluationResult> {
    const frameworkType = framework || this.config.defaultFramework;

    try {
      console.log(
        `[EvalService] Starting evaluation with ${frameworkType} for app ${appId}`
      );

      const fw = this.registry.getFramework(frameworkType);

      const request: EvaluationRequest = {
        id: uuidv4(),
        query,
        response,
        retrievedDocuments,
      };

      const result = await fw.evaluate(request);

      // Filter out undefined metrics for database storage (strict type requirement)
      const cleanMetrics: Record<string, number> = Object.fromEntries(
        Object.entries(result.metrics).filter(([_, value]) => value !== undefined) as [string, number][]
      );

      // Persist to database
      await this.database.saveEvaluation({
        appId,
        query,
        response,
        frameworkUsed: fw.getMetadata().name,
        frameworkVersion: fw.getMetadata().version,
        metrics: cleanMetrics,
        overallScore: result.overallScore,
        executionTime: result.executionTime,
        documentsCount: retrievedDocuments.length,
        // rawData: JSON.stringify(result.rawData),
      });

      return result;
    } catch (error: any) {
      console.error('[EvalService] Evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Evaluate multiple query-response pairs with progress tracking
   */
  async evaluateBatch(
    appId: string,
    evaluations: Array<{
      query: string;
      response: string;
      retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>;
    }>,
    framework?: FrameworkType,
    onProgress?: (progress: BatchEvaluationProgress) => void
  ): Promise<EvaluationResult[]> {
    const frameworkType = framework || this.config.defaultFramework;

    if (evaluations.length > this.config.maxBatchSize) {
      throw new Error(
        `Batch size ${evaluations.length} exceeds maximum of ${this.config.maxBatchSize}`
      );
    }

    try {
      const batchId = uuidv4();
      console.log(
        `[EvalService] Starting batch evaluation ${batchId} with ${evaluations.length} items using ${frameworkType}`
      );

      // Save batch record
      const batchRecord = await this.database.saveBatchEvaluation({
        appId,
        frameworkUsed: frameworkType,
        totalEvaluations: evaluations.length,
        completedEvaluations: 0,
        status: 'in_progress',
        startedAt: new Date(),
      });

      const fw = this.registry.getFramework(frameworkType);

      const requests: EvaluationRequest[] = evaluations.map((evalItem) => ({
        id: uuidv4(),
        query: evalItem.query,
        response: evalItem.response,
        retrievedDocuments: evalItem.retrievedDocuments,
      }));

      const batchRequest: BatchEvaluationRequest = {
        id: batchId,
        evaluations: requests,
      };

      const results = await fw.evaluateBatch(batchRequest, async (progress) => {
        // Update batch record
        await this.database.updateBatchEvaluation(batchId, {
          completedEvaluations: progress.completed,
        });

        // Notify progress
        onProgress?.(progress);
      });

      // Update batch as completed
      await this.database.updateBatchEvaluation(batchId, {
        status: 'completed',
        completedEvaluations: evaluations.length,
        completedAt: new Date(),
      });

      console.log(
        `[EvalService] Batch evaluation ${batchId} completed with ${results.length} results`
      );

      return results;
    } catch (error) {
      console.error('[EvalService] Batch evaluation failed:', error);
      throw error;
    }
  }

  /**
   * Get evaluation history for an app
   */
  async getAppEvaluationHistory(appId: string, limit?: number, offset?: number) {
    return this.database.getAppEvaluations(appId, limit, offset);
  }

  /**
   * Switch active framework
   */
  async switchFramework(frameworkType: FrameworkType): Promise<void> {
    await this.registry.switchFramework(frameworkType);
  }

  /**
   * Health check
   */
  async healthCheck() {
    return this.registry.healthCheckAll();
  }
}

export function createEvaluationService(
  database: IDatabase,
  config?: EvaluationServiceConfig
): EvaluationService {
  return new EvaluationService(database, config);
}
