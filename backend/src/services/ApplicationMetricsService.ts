import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

// Type definitions
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
  bleuScore?: number;
  rougeL?: number;
  llamaCorrectness?: number;
  llamaRelevancy?: number;
  llamaFaithfulness?: number;
  overallScore?: number;
  frameworksUsed?: string[];
  slaCompliance?: number;
  timestamp: string;
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
  ): Omit<ApplicationMetrics, 'applicationId' | 'applicationName' | 'timestamp' | 'frameworksUsed' | 'slaCompliance'> {
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

  /**
   * Extract frameworks used from evaluations
   */
  private extractFrameworksUsed(evaluations: Array<Record<string, unknown>>): string[] {
    const frameworks = new Set<string>();
    
    for (const evaluation of evaluations) {
      const fw = evaluation.frameworksUsed as string[] | undefined;
      if (Array.isArray(fw)) {
        fw.forEach(f => frameworks.add(f));
      }
    }
    
    return Array.from(frameworks);
  }

  /**
   * Calculate SLA compliance score
   */
  private calculateSLACompliance(
    metrics: Omit<ApplicationMetrics, 'applicationId' | 'applicationName' | 'timestamp' | 'frameworksUsed' | 'slaCompliance'>
  ): number {
    // SLA compliance is based on metric thresholds
    const thresholds = {
      groundedness: 70,
      coherence: 70,
      relevance: 70,
      faithfulness: 70,
    };

    let compliantCount = 0;
    let totalMetrics = 0;

    for (const [metric, threshold] of Object.entries(thresholds)) {
      const value = metrics[metric as keyof typeof metrics];
      if (typeof value === 'number') {
        totalMetrics++;
        if (value >= threshold) {
          compliantCount++;
        }
      }
    }

    return totalMetrics > 0 ? (compliantCount / totalMetrics) * 100 : 0;
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
      'bleuScore',
      'rougeL',
      'llamaCorrectness',
      'llamaRelevancy',
      'llamaFaithfulness',
      'overallScore',
    ] as const;

    const aggregated: Partial<AggregatedMetrics> = {
      applicationCount: metricsArray.length,
      timestamp: new Date().toISOString(),
    };

    // Average each metric across all applications
    for (const key of metricKeys) {
      const validValues = metricsArray
        .map(m => {
          const value = m[key as keyof ApplicationMetrics];
          return typeof value === 'number' ? value : undefined;
        })
        .filter((v): v is number => v !== undefined && !isNaN(v));
      
      const avgValue = validValues.length > 0 
        ? validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length 
        : undefined;
      
      // Only set if value exists or is a required field
      if (avgValue !== undefined || ['groundedness', 'coherence', 'relevance', 'faithfulness', 'answerRelevancy', 'contextPrecision', 'contextRecall'].includes(key)) {
        (aggregated as any)[key as keyof AggregatedMetrics] = avgValue ?? 0;
      }
    }

    // Aggregate frameworks used (collect all unique frameworks)
    const allFrameworks = new Set<string>();
    metricsArray.forEach(m => {
      m.frameworksUsed?.forEach(f => allFrameworks.add(f));
    });
    aggregated.frameworksUsed = Array.from(allFrameworks);

    // Aggregate SLA compliance (average SLA across apps)
    const slaComplianceValues = metricsArray
      .filter(m => m.slaCompliance !== undefined)
      .map(m => m.slaCompliance!);
    if (slaComplianceValues.length > 0) {
      aggregated.slaCompliance = slaComplianceValues.reduce((a, b) => a + b, 0) / slaComplianceValues.length;
    }

    logger.info(`[v0] Aggregated metrics for ${metricsArray.length} applications`, {
      groundedness: (aggregated.groundedness as number)?.toFixed(2),
      coherence: (aggregated.coherence as number)?.toFixed(2),
      relevance: (aggregated.relevance as number)?.toFixed(2),
      bleuScore: (aggregated.bleuScore as number)?.toFixed(2),
      rougeL: (aggregated.rougeL as number)?.toFixed(2),
      llamaCorrectness: (aggregated.llamaCorrectness as number)?.toFixed(2),
    });
    return aggregated as AggregatedMetrics;
  }

  /**
   * Map metric names from camelCase to snake_case (and vice versa if needed)
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
      bleuScore: 'bleu_score',
      rougeL: 'rouge_l',
      llamaCorrectness: 'llama_correctness',
      llamaRelevancy: 'llama_relevancy',
      llamaFaithfulness: 'llama_faithfulness',
      overallScore: 'overall_score',
    };
    return keyMap[key] || key;
  }
}
