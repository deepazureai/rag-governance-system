import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

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
  static async generateAlertsForBatch(
    applicationId: string,
    records: any[],
    applicationSLA: any,
    alertsCollection: any
  ): Promise<any[]> {
    try {
      if (!applicationSLA || !applicationSLA.metrics) {
        logger.warn(`[AlertService] No SLA metrics found for app ${applicationId}`);
        return [];
      }

      const createdAlerts: any[] = [];
      const currentTime = new Date();

      // Process each record
      for (const record of records) {
        if (!record.evaluation || !record.evaluation.metrics) {
          continue; // Skip records without evaluation data
        }

        const metrics = record.evaluation.metrics;
        const userId = record.userId || 'unknown';

        // Check each metric in SLA against record value
        for (const [metricName, slaThreshold] of Object.entries(applicationSLA.metrics)) {
          const metricValue = metrics[metricName as string];

          // Only create alert if metric exists and is numeric
          if (typeof metricValue === 'number' && typeof slaThreshold === 'number') {
            // Alert if metric falls below threshold (threshold = "good" value)
            if (metricValue < slaThreshold) {
              const deviation = ((slaThreshold - metricValue) / slaThreshold) * 100;

              const alert = {
                alertId: uuidv4(),
                applicationId,
                alertLevel: 'row',
                sourceRecordId: record._id || record.id,
                metricName,
                actualValue: Number((metricValue as number).toFixed(2)),
                slaThreshold: Number((slaThreshold as number).toFixed(2)),
                deviation: Math.round(deviation * 100) / 100,
                status: 'open',
                createdAt: currentTime,
                updatedAt: currentTime,
              };

              // Upsert to avoid duplicates (idempotent)
              await alertsCollection.updateOne(
                { sourceRecordId: record._id || record.id, metricName },
                { $set: alert },
                { upsert: true }
              );

              createdAlerts.push(alert);

              logger.debug(
                `[AlertService] Alert: app=${applicationId}, metric=${metricName}, value=${metricValue}, sla=${slaThreshold}, user=${userId}`
              );
            }
          }
        }
      }

      if (createdAlerts.length > 0) {
        logger.info(
          `[AlertService] Created ${createdAlerts.length} alerts for app ${applicationId}`
        );
      }

      return createdAlerts;
    } catch (error: any) {
      logger.error(`[AlertService] Error generating alerts for app ${applicationId}:`, error);
      throw error;
    }
  }

  /**
   * Generate aggregated alerts for entire application
   * Called periodically to create app-level alerts based on aggregated metrics
   */
  static async generateAggregatedAlerts(
    applicationId: string,
    period: 'daily' | 'weekly' | 'monthly',
    governanceMetrics: any,
    applicationSLA: any,
    alertsCollection: any
  ): Promise<any[]> {
    try {
      if (!governanceMetrics || !applicationSLA) {
        return [];
      }

      const createdAlerts: any[] = [];
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

        const alert = {
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

        const alert = {
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
