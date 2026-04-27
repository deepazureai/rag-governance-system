import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { Alert } from '../models/database.js';

// Type definitions for service parameters
interface RawDataRecord {
  _id?: string;
  id?: string;
  userId?: string;
  applicationId?: string;
  
  // Core Data
  query?: string;
  response?: string;
  context?: string;
  
  // Timing Fields (ISO 8601 timestamps)
  promptTimestamp?: string;
  contextRetrievalStartTime?: string;
  contextRetrievalEndTime?: string;
  llmRequestStartTime?: string;
  llmResponseEndTime?: string;
  
  // Calculated Latencies (milliseconds)
  retrievalLatencyMs?: number;
  llmLatencyMs?: number;
  totalLatencyMs?: number;
  
  // Token & Content Metrics
  contextChunkCount?: number;
  contextTotalLengthWords?: number;
  promptLengthWords?: number;
  responseLengthWords?: number;
  promptTokenCount?: number;
  responseTokenCount?: number;
  totalTokenCount?: number;
  
  // Status
  status?: 'success' | 'error' | 'timeout' | 'partial';
  
  // Evaluation Metrics
  evaluation?: {
    metrics: Record<string, number>;
  };
}

interface ApplicationSLAConfig {
  metrics: Record<string, number>;
  overallScoreThresholds?: {
    good?: number;
    excellent?: number;
  };
}

interface GovernanceMetricsData {
  complianceRate: number;
  errorRate: number;
}

interface AlertCollection {
  updateOne(filter: Record<string, any>, update: Record<string, any>, options: Record<string, any>): Promise<void>;
}

/**
 * Alert Generation Service
 * Creates row-level and aggregated alerts when data is ingested
 * Called by polling service after successful data upsert
 */
export class AlertGenerationService {
  /**
   * Generate alerts for a batch of ingested records
   * Compares each record's metrics against application SLA thresholds
   * Creates row-level alerts for violations
   */
  /**
   * Generate evaluation quality alerts for batch records
   * Triggers on low groundedness, coherence, relevance scores
   */
  static async generateAlertsForBatch(
    applicationId: string,
    evaluations: any[],
    alertsCollection: AlertCollection
  ): Promise<Alert[]> {
    try {
      const createdAlerts: Alert[] = [];
      const currentTime = new Date();

      // Define quality metric thresholds (0-100 scale)
      const qualityThresholds = {
        groundedness: 60, // Below 60 is poor groundedness
        coherence: 60,
        relevance: 60,
        faithfulness: 65,
        answerRelevancy: 65,
        contextPrecision: 70,
        contextRecall: 65,
        overallScore: 65,
      };

      // Process each evaluation record
      for (const evaluation of evaluations) {
        if (!evaluation.evaluation || !evaluation.evaluation.groundedness) {
          continue; // Skip records without evaluation data
        }

        const metrics = evaluation.evaluation;

        // Check each quality metric
        for (const [metricName, threshold] of Object.entries(qualityThresholds)) {
          const metricValue = metrics[metricName as keyof typeof metrics];

          // Only create alert if metric exists and is below threshold
          if (typeof metricValue === 'number' && metricValue < (threshold as number)) {
            const deviation = (((threshold as number) - metricValue) / (threshold as number)) * 100;

            const alert: Alert = {
              alertId: uuidv4(),
              applicationId,
              alertLevel: 'row',
              sourceRecordId: evaluation._id?.toString() || evaluation.id,
              metricName: `evaluation_${metricName}`, // Prefix to distinguish from performance metrics
              actualValue: Number(metricValue.toFixed(2)),
              slaThreshold: threshold as number,
              deviation: Math.round(deviation * 100) / 100,
              status: 'open',
              createdAt: currentTime,
              updatedAt: currentTime,
            };

            // Upsert to avoid duplicates
            await alertsCollection.updateOne(
              { sourceRecordId: evaluation._id?.toString() || evaluation.id, metricName: alert.metricName },
              { $set: alert },
              { upsert: true }
            );

            createdAlerts.push(alert);

            logger.debug(
              `[AlertService] Quality Alert: app=${applicationId}, metric=${metricName}, value=${metricValue}, threshold=${threshold}`
            );
          }
        }
      }

      if (createdAlerts.length > 0) {
        logger.info(
          `[AlertService] Created ${createdAlerts.length} evaluation quality alerts for app ${applicationId}`
        );
      }

      return createdAlerts;
    } catch (error: any) {
      logger.error(`[AlertService] Error generating evaluation alerts:`, error);
      throw error;
    }
  }

  /**
   * Generate performance-based alerts for AI activity governance
   * Triggers on latency degradation, token usage spikes, error rate increases
   */
  static async generatePerformanceAlerts(
    applicationId: string,
    governanceMetrics: any,
    applicationSLA: ApplicationSLAConfig,
    alertsCollection: AlertCollection
  ): Promise<Alert[]> {
    try {
      const createdAlerts: Alert[] = [];
      const currentTime = new Date();

      // Define performance SLA thresholds (can be extended to config)
      const performanceThresholds = {
        p95LatencyMs: 5000, // 5 seconds
        p99LatencyMs: 10000, // 10 seconds
        errorRatePercent: 2, // 2% error rate
        costPerQuery: 0.05, // $0.05 per query
      };

      // Alert: High P95 Latency (retrieval + LLM combined)
      if (governanceMetrics.latency?.total?.p95 > performanceThresholds.p95LatencyMs) {
        const latencyAlert: Alert = {
          alertId: uuidv4(),
          applicationId,
          alertLevel: 'aggregated',
          metricName: 'p95Latency',
          actualValue: Math.round(governanceMetrics.latency.total.p95),
          slaThreshold: performanceThresholds.p95LatencyMs,
          deviation: ((governanceMetrics.latency.total.p95 - performanceThresholds.p95LatencyMs) / performanceThresholds.p95LatencyMs) * 100,
          status: 'open',
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        createdAlerts.push(latencyAlert);
        logger.warn(`[AlertService] High P95 latency detected: ${governanceMetrics.latency.total.p95}ms`);
      }

      // Alert: High P99 Latency
      if (governanceMetrics.latency?.total?.p99 > performanceThresholds.p99LatencyMs) {
        const p99Alert: Alert = {
          alertId: uuidv4(),
          applicationId,
          alertLevel: 'aggregated',
          metricName: 'p99Latency',
          actualValue: Math.round(governanceMetrics.latency.total.p99),
          slaThreshold: performanceThresholds.p99LatencyMs,
          deviation: ((governanceMetrics.latency.total.p99 - performanceThresholds.p99LatencyMs) / performanceThresholds.p99LatencyMs) * 100,
          status: 'open',
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        createdAlerts.push(p99Alert);
      }

      // Alert: High Error Rate
      if (governanceMetrics.errors?.errorRate > performanceThresholds.errorRatePercent) {
        const errorAlert: Alert = {
          alertId: uuidv4(),
          applicationId,
          alertLevel: 'aggregated',
          metricName: 'errorRate',
          actualValue: Math.round(governanceMetrics.errors.errorRate * 100) / 100,
          slaThreshold: performanceThresholds.errorRatePercent,
          deviation: ((governanceMetrics.errors.errorRate - performanceThresholds.errorRatePercent) / performanceThresholds.errorRatePercent) * 100,
          status: 'open',
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        createdAlerts.push(errorAlert);
        logger.warn(`[AlertService] High error rate detected: ${governanceMetrics.errors.errorRate}%`);
      }

      // Alert: Latency Degradation Trend
      if (governanceMetrics.trends?.latencyTrend === 'degrading' && 
          governanceMetrics.trends?.latencyChangePercent > 20) {
        const trendAlert: Alert = {
          alertId: uuidv4(),
          applicationId,
          alertLevel: 'aggregated',
          metricName: 'latencyDegradation',
          actualValue: Math.round(governanceMetrics.trends.latencyChangePercent * 100) / 100,
          slaThreshold: 20, // Allow 20% increase before alerting
          deviation: governanceMetrics.trends.latencyChangePercent - 20,
          status: 'open',
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        createdAlerts.push(trendAlert);
        logger.warn(`[AlertService] Latency degradation detected: +${governanceMetrics.trends.latencyChangePercent}%`);
      }

      // Alert: Cost Spike
      if (governanceMetrics.cost?.costPerQuery?.avg > performanceThresholds.costPerQuery) {
        const costAlert: Alert = {
          alertId: uuidv4(),
          applicationId,
          alertLevel: 'aggregated',
          metricName: 'costPerQuery',
          actualValue: Math.round(governanceMetrics.cost.costPerQuery.avg * 10000) / 10000,
          slaThreshold: performanceThresholds.costPerQuery,
          deviation: ((governanceMetrics.cost.costPerQuery.avg - performanceThresholds.costPerQuery) / performanceThresholds.costPerQuery) * 100,
          status: 'open',
          createdAt: currentTime,
          updatedAt: currentTime,
        };
        createdAlerts.push(costAlert);
        logger.warn(`[AlertService] High cost per query detected: $${governanceMetrics.cost.costPerQuery.avg}`);
      }

      // Upsert alerts to collection
      for (const alert of createdAlerts) {
        await alertsCollection.updateOne(
          { applicationId, metricName: alert.metricName, alertLevel: 'aggregated' },
          { $set: alert },
          { upsert: true }
        );
      }

      return createdAlerts;
    } catch (error: any) {
      logger.error(`[AlertService] Error generating performance alerts:`, error);
      return [];
    }
  }

  /**
   * Generate aggregated alerts for entire application
   * Called periodically to create app-level alerts based on aggregated metrics
   */
  static async generateAggregatedAlerts(
    applicationId: string,
    period: 'daily' | 'weekly' | 'monthly',
    governanceMetrics: GovernanceMetricsData,
    applicationSLA: ApplicationSLAConfig,
    alertsCollection: AlertCollection
  ): Promise<Alert[]> {
    try {
      if (!governanceMetrics || !applicationSLA) {
        return [];
      }

      const createdAlerts: Alert[] = [];
      const currentTime = new Date();

      // Define aggregate metric thresholds
      const aggregateThresholds = {
        complianceRate: applicationSLA.overallScoreThresholds?.good || 75,
        errorRate: 5, // Max 5% error rate acceptable
      };

      // Check compliance rate
      if (governanceMetrics.complianceRate < aggregateThresholds.complianceRate) {
        const deviation =
          ((aggregateThresholds.complianceRate - governanceMetrics.complianceRate) /
            aggregateThresholds.complianceRate) *
          100;

        const alert: Alert = {
          alertId: uuidv4(),
          applicationId,
          alertLevel: 'aggregated',
          metricName: 'complianceRate',
          actualValue: Number((governanceMetrics.complianceRate as number).toFixed(2)),
          slaThreshold: aggregateThresholds.complianceRate,
          deviation: Math.round(deviation * 100) / 100,
          status: 'open',
          createdAt: currentTime,
          updatedAt: currentTime,
        };

        await alertsCollection.updateOne(
          { applicationId, alertLevel: 'aggregated', metricName: 'complianceRate', period },
          { $set: { ...alert, period } },
          { upsert: true }
        );

        createdAlerts.push(alert);
      }

      // Check error rate
      if (governanceMetrics.errorRate > aggregateThresholds.errorRate) {
        const deviation =
          ((governanceMetrics.errorRate - aggregateThresholds.errorRate) /
            aggregateThresholds.errorRate) *
          100;

        const alert: Alert = {
          alertId: uuidv4(),
          applicationId,
          alertLevel: 'aggregated',
          metricName: 'errorRate',
          actualValue: Number((governanceMetrics.errorRate as number).toFixed(2)),
          slaThreshold: aggregateThresholds.errorRate,
          deviation: Math.round(deviation * 100) / 100,
          status: 'open',
          createdAt: currentTime,
          updatedAt: currentTime,
        };

        await alertsCollection.updateOne(
          { applicationId, alertLevel: 'aggregated', metricName: 'errorRate', period },
          { $set: { ...alert, period } },
          { upsert: true }
        );

        createdAlerts.push(alert);
      }

      if (createdAlerts.length > 0) {
        logger.info(
          `[AlertService] Created ${createdAlerts.length} aggregated alerts for app ${applicationId}`
        );
      }

      return createdAlerts;
    } catch (error: any) {
      logger.error(`[AlertService] Error generating aggregated alerts:`, error);
      throw error;
    }
  }
}
