import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export interface ApplicationMetrics {
  applicationId: string;
  applicationName: string;
  // RAGAS metrics
  groundedness: number;
  coherence: number;
  relevance: number;
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  // BLEU/ROUGE metrics
  bleuScore?: number;
  rougeL?: number;
  // LLamaIndex metrics
  llamaCorrectness?: number;
  llamaRelevancy?: number;
  llamaFaithfulness?: number;
  overallScore?: number;
  timestamp: string;
  frameworksUsed?: string[];
  slaCompliance?: number;
}

export interface AggregatedMetrics {
  // RAGAS metrics
  groundedness: number;
  coherence: number;
  relevance: number;
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  // BLEU/ROUGE metrics
  bleuScore?: number;
  rougeL?: number;
  // LLamaIndex metrics
  llamaCorrectness?: number;
  llamaRelevancy?: number;
  llamaFaithfulness?: number;
  overallScore?: number;
  applicationCount: number;
  timestamp: string;
  frameworksUsed?: string[];
  slaCompliance?: number;
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

      // Extract frameworks used from evaluations
      const frameworksUsed = this.extractFrameworksUsed(evaluations);

      // Calculate SLA compliance
      const slaCompliance = this.calculateSLACompliance(avgMetrics);

      // Get application name
      const ApplicationCollection = mongoose.connection.collection('applicationmasters');
      const appRecord = await ApplicationCollection.findOne({ id: applicationId });
      const appName = appRecord?.name || 'Unknown Application';

      const metrics: ApplicationMetrics = {
        applicationId,
        applicationName: appName,
        ...avgMetrics,
        frameworksUsed,
        slaCompliance,
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
  private calculateAverageMetrics(
    evaluations: Array<Record<string, unknown>>
  ): Omit<ApplicationMetrics, 'applicationId' | 'applicationName' | 'timestamp'> {
    const metricKeys = [
      'groundedness',
      'coherence',
      'relevance',
      'faithfulness',
      'answerRelevancy',
      'contextPrecision',
      'contextRecall',
      'bleuScore',
      'rougeL',
      'llamaCorrectness',
      'llamaRelevancy',
      'llamaFaithfulness',
      'overallScore',
    ] as const;

    // Initialize all metrics with 0
    const aggregated: Record<string, number> = {};
    for (const key of metricKeys) {
      aggregated[key] = 0;
    }

    // Average each metric across all evaluations
    for (const key of metricKeys) {
      const validValues = evaluations
        .map((evaluation: Record<string, unknown>) => {
          // Try top-level metric first (new structure)
          let value = evaluation[key];
          
          // If not found, try under evaluation object (backward compatibility)
          if (value === undefined || value === null) {
            const evalObj = evaluation.evaluation as Record<string, unknown> | undefined;
            value = evalObj?.[key];
          }
          
          return typeof value === 'number' ? value : undefined;
        })
        .filter((v): v is number => v !== undefined && !isNaN(v));
      
      aggregated[key] = validValues.length > 0 
        ? validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length 
        : 0;
    }

    logger.debug(`[v0] Calculated average metrics:`, aggregated);
    
    // Build the properly typed return object
    return {
      groundedness: aggregated.groundedness ?? 0,
      coherence: aggregated.coherence ?? 0,
      relevance: aggregated.relevance ?? 0,
      faithfulness: aggregated.faithfulness ?? 0,
      answerRelevancy: aggregated.answerRelevancy ?? 0,
      contextPrecision: aggregated.contextPrecision ?? 0,
      contextRecall: aggregated.contextRecall ?? 0,
      bleuScore: aggregated.bleuScore,
      rougeL: aggregated.rougeL,
      llamaCorrectness: aggregated.llamaCorrectness,
      llamaRelevancy: aggregated.llamaRelevancy,
      llamaFaithfulness: aggregated.llamaFaithfulness,
      overallScore: aggregated.overallScore,
    };
  }

  