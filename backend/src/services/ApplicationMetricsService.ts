import { logger } from '../utils/logger.js';

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
      
      // TODO: Query MongoDB ApplicationMetrics collection
      // const metrics = await db.collection('ApplicationMetrics').findOne({ applicationId });
      
      return null; // Placeholder
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
      
      // TODO: Query MongoDB ApplicationMetrics collection
      // const metrics = await db.collection('ApplicationMetrics')
      //   .find({ applicationId: { $in: applicationIds } })
      //   .toArray();
      
      return []; // Placeholder
    } catch (error) {
      logger.error(`[v0] Error fetching metrics:`, error);
      throw error;
    }
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
