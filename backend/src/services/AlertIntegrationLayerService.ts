import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Alert Integration Layer Service
 * Bridges data ingestion to alert generation with per-application thresholds
 * Completely independent from BatchProcessingService and AlertGenerationService
 * Handles: threshold fetching, threshold application, and real-time alert creation
 */
export class AlertIntegrationLayerService {
  /**
   * Get per-application thresholds or fallback to industry standards
   */
  static async getApplicationThresholds(applicationId: string): Promise<Record<string, number>> {
    try {
      const AppThresholdsCollection = mongoose.connection.collection('alertthresholds');
      
      // Try to find custom thresholds for this application
      const customThresholds = await AppThresholdsCollection.findOne({ applicationId });
      
      if (customThresholds) {
        logger.info(`[AlertIntegrationLayer] Using custom thresholds for app: ${applicationId}`);
        return customThresholds.thresholds || this.getIndustryStandardThresholds();
      }
      
      logger.info(`[AlertIntegrationLayer] Using industry standard thresholds for app: ${applicationId}`);
      return this.getIndustryStandardThresholds();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.warn(`[AlertIntegrationLayer] Error fetching thresholds, using defaults: ${errorMessage}`);
      return this.getIndustryStandardThresholds();
    }
  }

  /**
   * Industry standard thresholds for quality metrics
   */
  static getIndustryStandardThresholds(): Record<string, number> {
    return {
      groundedness: 60,
      coherence: 60,
      relevance: 60,
      faithfulness: 65,
      answerRelevancy: 65,
      contextPrecision: 70,
      contextRecall: 65,
      overallScore: 65,
      // Performance thresholds (in milliseconds and percentages)
      latencyP50Ms: 500,
      latencyP95Ms: 1000,
      latencyP99Ms: 2000,
      errorRatePercent: 5,
      timeoutRatePercent: 2,
    };
  }

  /**
   * Generate and store alerts - handles both ingestion and batch evaluation
   * Called immediately after records are processed
   * Uses per-application thresholds for alert severity calculation
   */
  static async generateAndStoreAlerts(
    applicationId: string,
    records: Array<Record<string, any>>,
    dataSourceType: 'ingestion' | 'batch' = 'ingestion'
  ): Promise<void> {
    try {
      logger.info(`[AlertIntegrationLayer] Generating and storing ${dataSourceType} alerts for ${records.length} records, app: ${applicationId}`);

      // Step 1: Fetch per-application thresholds
      const thresholds = await this.getApplicationThresholds(applicationId);
      logger.info(`[AlertIntegrationLayer] Thresholds fetched for app ${applicationId}:`, thresholds);

      // Step 2: Process each record and create alerts for violations
      const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');
      const createdAlerts: Array<Record<string, any>> = [];

      for (const record of records) {
        const recordId = record._id || record.id || uuidv4();
        const metrics = record.evaluation?.metrics || {};

        // Quality Metric Alerts
        const qualityMetrics = ['groundedness', 'coherence', 'relevance', 'faithfulness', 'answerRelevancy', 'contextPrecision', 'contextRecall', 'overallScore'];
        
        for (const metricName of qualityMetrics) {
          const metricValue = metrics[metricName];
          const threshold = thresholds[metricName];

          if (typeof metricValue === 'number' && typeof threshold === 'number' && metricValue < threshold) {
            const alertSeverity = this.calculateAlertSeverity(metricValue, threshold);
            
            const alert = {
              _id: uuidv4(),
              applicationId,
              recordId,
              alertType: 'quality_metric',
              metricName,
              metricValue,
              threshold,
              severity: alertSeverity,
              message: `${metricName} score (${metricValue.toFixed(2)}) below threshold (${threshold})`,
              dataSourceType,
              createdAt: new Date(),
              acknowledged: false,
              acknowledgedAt: null,
              acknowledgedBy: null,
            };

            await AlertsCollection.updateOne(
              { applicationId, recordId, metricName },
              { $set: alert },
              { upsert: true }
            );

            createdAlerts.push(alert);
          }
        }

        // Performance Alerts
        const latencies = {
          'latencyP50Ms': record.retrievalLatencyMs || 0,
          'latencyP95Ms': record.llmLatencyMs || 0,
          'latencyP99Ms': record.totalLatencyMs || 0,
        };

        for (const [latencyMetric, latencyValue] of Object.entries(latencies)) {
          const threshold = thresholds[latencyMetric];
          if (typeof latencyValue === 'number' && typeof threshold === 'number' && latencyValue > threshold) {
            const alert = {
              _id: uuidv4(),
              applicationId,
              recordId,
              alertType: 'performance',
              metricName: latencyMetric,
              metricValue: latencyValue,
              threshold,
              severity: latencyValue > threshold * 2 ? 'critical' : 'warning',
              message: `${latencyMetric} (${latencyValue}ms) exceeded threshold (${threshold}ms)`,
              dataSourceType,
              createdAt: new Date(),
              acknowledged: false,
              acknowledgedAt: null,
              acknowledgedBy: null,
            };

            await AlertsCollection.updateOne(
              { applicationId, recordId, metricName: latencyMetric },
              { $set: alert },
              { upsert: true }
            );

            createdAlerts.push(alert);
          }
        }
      }

      logger.info(`[AlertIntegrationLayer] Created ${createdAlerts.length} alerts during ingestion for app: ${applicationId}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[AlertIntegrationLayer] Error generating ingestion-time alerts: ${errorMessage}`);
      // Don't throw - alerts are non-critical
    }
  }

  /**
   * Calculate alert severity based on metric deviation from threshold
   */
  private static calculateAlertSeverity(metricValue: number, threshold: number): 'critical' | 'warning' | 'info' {
    const deviation = threshold - metricValue;
    const deviationPercent = (deviation / threshold) * 100;

    if (deviationPercent > 40) return 'critical';
    if (deviationPercent > 20) return 'warning';
    return 'info';
  }

  /**
   * Save custom thresholds for an application
   */
  static async saveApplicationThresholds(applicationId: string, thresholds: Record<string, number>): Promise<void> {
    try {
      const AppThresholdsCollection = mongoose.connection.collection('alertthresholds');

      await AppThresholdsCollection.updateOne(
        { applicationId },
        {
          $set: {
            applicationId,
            thresholds,
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      );

      logger.info(`[AlertIntegrationLayer] Saved custom thresholds for app: ${applicationId}`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[AlertIntegrationLayer] Error saving thresholds: ${errorMessage}`);
      throw err;
    }
  }

  /**
   * Get application SLA compliance based on alerts
   */
  static async getApplicationSLACompliance(applicationId: string): Promise<{ compliance: number; totalRecords: number; alertedRecords: number }> {
    try {
      const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');
      const EvaluationsCollection = mongoose.connection.collection('evaluationrecords');

      const totalRecords = await EvaluationsCollection.countDocuments({ applicationId });
      const alertedRecords = await GeneratedAlertsCollection.countDocuments({ applicationId });

      const compliance = totalRecords > 0 ? ((totalRecords - alertedRecords) / totalRecords) * 100 : 100;

      return {
        compliance: Math.max(0, Math.min(100, compliance)),
        totalRecords,
        alertedRecords,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[AlertIntegrationLayer] Error calculating SLA compliance: ${errorMessage}`);
      return { compliance: 0, totalRecords: 0, alertedRecords: 0 };
    }
  }

  /**
   * Backward compatibility: old method name
   * Deprecated: Use generateAndStoreAlerts() instead
   */
  static async generateIngestionTimeAlerts(
    applicationId: string,
    records: Array<Record<string, any>>,
    dataSourceType: 'ingestion' | 'batch' = 'ingestion'
  ): Promise<void> {
    return this.generateAndStoreAlerts(applicationId, records, dataSourceType);
  }

  /**
   * Generate alerts from batch evaluation results
   * Called from BatchProcessingService after evaluation completes
   * Reuses existing generateAndStoreAlerts() logic
   */
  static async generateAlertsFromBatchEvaluation(
    applicationId: string,
    evaluatedRecords: Array<Record<string, any>>
  ): Promise<{ alertsGenerated: number; criticalAlerts: number }> {
    try {
      logger.info(
        `[AlertIntegrationLayer] Generating alerts from batch evaluation for app: ${applicationId}`
      );

      // Reuse existing method with 'batch' dataSourceType
      await this.generateAndStoreAlerts(applicationId, evaluatedRecords, 'batch');

      // Get alert summary
      const GeneratedAlertsCollection = mongoose.connection.collection('generatedalerts');
      const totalAlerts = await GeneratedAlertsCollection.countDocuments({
        applicationId,
        dataSourceType: 'batch',
      });

      const criticalAlerts = await GeneratedAlertsCollection.countDocuments({
        applicationId,
        severity: 'critical',
        dataSourceType: 'batch',
      });

      logger.info(
        `[AlertIntegrationLayer] Batch alerts generated - Total: ${totalAlerts}, Critical: ${criticalAlerts}`
      );

      return {
        alertsGenerated: totalAlerts,
        criticalAlerts,
      };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error(`[AlertIntegrationLayer] Error generating batch alerts: ${errorMessage}`);
      throw err;
    }
  }
}
