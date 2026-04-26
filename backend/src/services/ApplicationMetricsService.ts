import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export interface ApplicationMetrics {
  applicationId: string;
  applicationName: string;
  groundedness: number;
  coherence: number;
  relevance: number;
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  timestamp: string;
}

export interface AggregatedMetrics {
  groundedness: number;
  coherence: number;
  relevance: number;
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  applicationCount: number;
  timestamp: string;
}

export class ApplicationMetricsService {
  /**
   * Fetch metrics for a single application
   */
  async fetchMetricsForApp(applicationId: string): Promise<ApplicationMetrics | null> {
    try {
      logger.info(`[v0] Fetching metrics for app: ${applicationId}`);
      
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      const evaluations = await EvaluationCollection.find({ applicationId }).toArray();
      
      if (!evaluations || evaluations.length === 0) {
        logger.info(`[v0] No evaluations found for app ${applicationId}`);
        return null;
      }

      // Calculate average metrics from all evaluations
      const avgMetrics = this.calculateAverageMetrics(evaluations);

      // Get application name
      const ApplicationCollection = mongoose.connection.collection('applicationmasters');
      const appRecord = await ApplicationCollection.findOne({ id: applicationId });
      const appName = appRecord?.name || 'Unknown Application';

      const metrics: ApplicationMetrics = {
        applicationId,
        applicationName: appName,
        ...avgMetrics,
        timestamp: new Date().toISOString(),
      };

      return metrics;
    } catch (error) {
      logger.error(`[v0] Error fetching metrics for app:`, error);
      throw error;
    }
  }

  /**
   * Fetch metrics for multiple applications
   */
  async fetchMetricsForApps(applicationIds: string[]): Promise<ApplicationMetrics[]> {
    try {
      logger.info(`[v0] Fetching metrics for ${applicationIds.length} applications`);
      
      const metricsPromises = applicationIds.map(appId => this.fetchMetricsForApp(appId));
      const metricsResults = await Promise.all(metricsPromises);
      
      // Filter out null results
      const metrics = metricsResults.filter((m): m is ApplicationMetrics => m !== null);
      
      logger.info(`[v0] Fetched metrics for ${metrics.length} applications`);
      return metrics;
    } catch (error) {
      logger.error(`[v0] Error fetching metrics:`, error);
      throw error;
    }
  }

  /**
   * Calculate average metrics from evaluation records
   */
  private calculateAverageMetrics(evaluations: any[]): Omit<ApplicationMetrics, 'applicationId' | 'applicationName' | 'timestamp'> {
    const metricKeys = [
      'groundedness',
      'coherence',
      'relevance',
      'faithfulness',
      'answerRelevancy',
      'contextPrecision',
      'contextRecall',
    ] as const;

    const aggregated: any = {};

    // Average each metric across all evaluations
    for (const key of metricKeys) {
      const sum = evaluations.reduce((acc: number, eval: any) => {
        const mapKey = this.mapMetricKey(key);
        const value = eval.evaluation?.[mapKey] || 0;
        return acc + value;
      }, 0);
      aggregated[key] = sum / evaluations.length;
    }

    return aggregated;
  }

  /**
   * Map metric names from evaluation format to ApplicationMetrics format
   */
  private mapMetricKey(key: string): string {
    const keyMap: { [k: string]: string } = {
      groundedness: 'groundedness',
      coherence: 'coherence',
      relevance: 'relevance',
      faithfulness: 'faithfulness',
      answerRelevancy: 'answer_relevancy',
      contextPrecision: 'context_precision',
      contextRecall: 'context_recall',
    };
    return keyMap[key] || key;
  }

  /**
   * Aggregate metrics across multiple applications by averaging
   */
  aggregateMetrics(metricsArray: ApplicationMetrics[]): AggregatedMetrics {
    if (metricsArray.length === 0) {
      throw new Error('Cannot aggregate empty metrics array');
    }

    const metricKeys = [
      'groundedness',
      'coherence',
      'relevance',
      'faithfulness',
      'answerRelevancy',
      'contextPrecision',
      'contextRecall',
    ] as const;

    const aggregated: Partial<AggregatedMetrics> = {
      applicationCount: metricsArray.length,
      timestamp: new Date().toISOString(),
    };

    // Average each metric across all applications
    for (const key of metricKeys) {
      const sum = metricsArray.reduce((acc, m) => acc + (m[key] || 0), 0);
      aggregated[key] = sum / metricsArray.length;
    }

    logger.info(`[v0] Aggregated metrics for ${metricsArray.length} applications`);
    return aggregated as AggregatedMetrics;
  }
}
