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
  private calculateAverageMetrics(evaluations: any[]): Omit<ApplicationMetrics, 'applicationId' | 'applicationName' | 'timestamp'> {
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

    const aggregated: any = {};

    // Average each metric across all evaluations
    for (const key of metricKeys) {
      const validValues = evaluations
        .map((evaluation: any) => {
          // Try top-level metric first (new structure)
          let value = evaluation[key];
          
          // If not found, try under evaluation object (backward compatibility)
          if (value === undefined || value === null) {
            value = evaluation.evaluation?.[key];
          }
          
          return value;
        })
        .filter(v => v !== undefined && v !== null && !isNaN(v));
      
      aggregated[key] = validValues.length > 0 ? validValues.reduce((a: number, b: number) => a + b, 0) / validValues.length : 0;
    }

    logger.debug(`[v0] Calculated average metrics:`, aggregated);
    return aggregated;
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

  /**
   * Extract frameworks used from evaluation records
   */
  private extractFrameworksUsed(evaluations: any[]): string[] {
    const frameworksSet = new Set<string>();
    
    for (const evaluation of evaluations) {
      if (Array.isArray(evaluation.frameworksUsed)) {
        evaluation.frameworksUsed.forEach((f: string) => frameworksSet.add(f));
      }
    }
    
    return Array.from(frameworksSet).sort();
  }

  /**
   * Calculate SLA compliance percentage based on metric thresholds
   * SLA Compliance: percentage of metrics that meet or exceed their SLA thresholds
   */
  private calculateSLACompliance(metrics: any): number {
    // Define SLA thresholds for each metric (0-100 scale)
    const slaThresholds = {
      groundedness: 70,
      coherence: 70,
      relevance: 70,
      faithfulness: 75,
      answerRelevancy: 75,
      contextPrecision: 80,
      contextRecall: 70,
    };

    let meetsThreshold = 0;
    let totalMetrics = 0;

    for (const [metricName, threshold] of Object.entries(slaThresholds)) {
      const metricValue = metrics[metricName];
      if (metricValue !== undefined && metricValue !== null) {
        totalMetrics++;
        if (metricValue >= threshold) {
          meetsThreshold++;
        }
      }
    }

    if (totalMetrics === 0) return 0;
    return (meetsThreshold / totalMetrics) * 100;
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
        .map(m => m[key as keyof ApplicationMetrics] as number)
        .filter(v => v !== undefined && v !== null && !isNaN(v));
      
      aggregated[key as keyof AggregatedMetrics] = validValues.length > 0 
        ? validValues.reduce((a, b) => a + b, 0) / validValues.length 
        : 0 as any;
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
}
