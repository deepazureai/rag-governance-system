import { Alert, AlertThresholdConfig, INDUSTRY_STANDARD_THRESHOLDS, MetricThreshold } from '../types';
import { NotificationService } from './NotificationService';
import { logger } from '../utils/logger';

/**
 * AlertCalculationEngine
 * Analyzes metrics against thresholds and generates alerts
 * Supports per-app and collective alert aggregation
 */
export class AlertCalculationEngine {
  /**
   * Calculate severity status for a single metric value
   */
  static calculateSeverity(
    value: number,
    threshold: MetricThreshold,
    isLowerBetter: boolean = true
  ): 'critical' | 'warning' | 'healthy' {
    if (isLowerBetter) {
      // For metrics where lower is better (latency, error rate, etc.)
      if (value >= threshold.critical) return 'critical';
      if (value >= threshold.warning) return 'warning';
      return 'healthy';
    } else {
      // For metrics where higher is better (accuracy, relevance, etc.)
      if (value <= threshold.critical) return 'critical';
      if (value <= threshold.warning) return 'warning';
      return 'healthy';
    }
  }

  /**
   * Generate alerts for a single application based on its metrics
   */
  static generateAlertsForApp(
    appId: string,
    metrics: Record<string, number>,
    thresholdConfig: AlertThresholdConfig
  ): Alert[] {
    const alerts: Alert[] = [];
    const metricMap = [
      // Quality metrics (higher is better)
      { name: 'groundedness', key: 'groundedness', lowerBetter: false },
      { name: 'relevance', key: 'relevance', lowerBetter: false },
      { name: 'contextPrecision', key: 'contextPrecision', lowerBetter: false },
      { name: 'contextRecall', key: 'contextRecall', lowerBetter: false },
      { name: 'answerRelevancy', key: 'answerRelevancy', lowerBetter: false },
      { name: 'coherence', key: 'coherence', lowerBetter: false },
      { name: 'faithfulness', key: 'faithfulness', lowerBetter: false },
      // Performance metrics (lower is better for latency/errors, higher for success)
      { name: 'successRate', key: 'successRate', lowerBetter: false },
      { name: 'latency', key: 'latency', lowerBetter: true },
      { name: 'tokenEfficiency', key: 'tokenEfficiency', lowerBetter: true },
      { name: 'errorRate', key: 'errorRate', lowerBetter: true },
    ];

    for (const metric of metricMap) {
      const value = metrics[metric.key];
      if (value === undefined || value === null) continue;

      const thresholdConfig_value = thresholdConfig[metric.key as keyof AlertThresholdConfig];
      if (!thresholdConfig_value || typeof thresholdConfig_value === 'string' || typeof thresholdConfig_value === 'boolean') {
        continue;
      }

      const threshold = thresholdConfig_value as MetricThreshold;
      const severity = this.calculateSeverity(value, threshold, metric.lowerBetter);

      // Only create alerts for non-healthy states
      if (severity !== 'healthy') {
        const alert: Alert = {
          id: `${appId}-${metric.name}-${Date.now()}`,
          appId,
          metricName: metric.name,
          message: this.generateAlertMessage(metric.name, value, severity),
          severity,
          timestamp: new Date().toISOString(),
          resolved: false,
          metricValue: value,
          threshold: severity === 'critical' ? threshold.critical : threshold.warning,
        };
        alerts.push(alert);
      }
    }

    return alerts;
  }

  /**
   * Generate human-readable alert message
   */
  private static generateAlertMessage(
    metricName: string,
    value: number,
    severity: 'critical' | 'warning' | 'healthy'
  ): string {
    const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
    const displayName = this.getMetricDisplayName(metricName);
    const formattedValue = this.formatMetricValue(metricName, value);

    return `${severityLabel}: ${displayName} is at ${formattedValue}`;
  }

  /**
   * Get user-friendly metric name
   */
  private static getMetricDisplayName(key: string): string {
    const names: Record<string, string> = {
      groundedness: 'Groundedness Score',
      relevance: 'Relevance Score',
      contextPrecision: 'Context Precision',
      contextRecall: 'Context Recall',
      answerRelevancy: 'Answer Relevancy',
      coherence: 'Coherence Score',
      faithfulness: 'Faithfulness Score',
      successRate: 'Success Rate',
      latency: 'Response Latency',
      tokenEfficiency: 'Token Efficiency',
      errorRate: 'Error Rate',
    };
    return names[key] || key;
  }

  /**
   * Format metric value for display
   */
  private static formatMetricValue(metricName: string, value: number): string {
    if (metricName.includes('Rate') && !metricName.includes('Token')) {
      return `${value.toFixed(1)}%`;
    }
    if (metricName === 'latency') {
      return `${value.toFixed(0)}ms`;
    }
    if (metricName === 'tokenEfficiency') {
      return `${value.toFixed(0)} tokens`;
    }
    return `${value.toFixed(2)}`;
  }

  /**
   * Calculate collective severity across multiple applications
   * CRITICAL if ANY app is critical, else WARNING if ANY warning, else HEALTHY
   */
  static calculateCollectiveSeverity(alerts: Alert[]): 'critical' | 'warning' | 'healthy' {
    const hasCritical = alerts.some((a) => a.severity === 'critical');
    if (hasCritical) return 'critical';

    const hasWarning = alerts.some((a) => a.severity === 'warning');
    if (hasWarning) return 'warning';

    return 'healthy';
  }

  /**
   * Get aggregated stats across all applications
   */
  static getAggregatedStats(alerts: Alert[]) {
    const unresolvedAlerts = alerts.filter((a) => !a.resolved);
    return {
      total: alerts.length,
      unresolved: unresolvedAlerts.length,
      critical: unresolvedAlerts.filter((a) => a.severity === 'critical').length,
      warning: unresolvedAlerts.filter((a) => a.severity === 'warning').length,
      healthy: unresolvedAlerts.filter((a) => a.severity === 'healthy').length,
      byCriticalityDesc: unresolvedAlerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, healthy: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      }),
    };
  }

  /**
   * Get per-application alert summary
   */
  static getPerAppAlertSummary(alerts: Alert[]) {
    const byApp: Record<string, { alerts: Alert[]; severity: 'critical' | 'warning' | 'healthy' }> = {};

    for (const alert of alerts) {
      if (!byApp[alert.appId]) {
        byApp[alert.appId] = { alerts: [], severity: 'healthy' };
      }
      byApp[alert.appId].alerts.push(alert);
    }

    // Calculate per-app severity
    for (const appId in byApp) {
      byApp[appId].severity = this.calculateCollectiveSeverity(byApp[appId].alerts);
    }

    return byApp;
  }

  /**
   * Handle alert notifications - dispatch to configured channels
   * Called when new alerts are generated
   */
  static async handleAlertNotifications(
    alerts: Alert[],
    channels: any[],
    rules: any[],
    notificationService: NotificationService
  ): Promise<void> {
    if (!alerts || alerts.length === 0) {
      return;
    }

    try {
      // Group alerts by severity to handle critical alerts first
      const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
      const warningAlerts = alerts.filter((a) => a.severity === 'warning');

      // Send critical alerts immediately
      for (const alert of criticalAlerts) {
        logger.info('[AlertCalculationEngine] Processing critical alert for notifications', {
          alertId: alert.id,
          appId: alert.appId,
        });

        await notificationService.handleAlert(alert, channels, rules);
      }

      // Queue warning alerts for batch processing
      for (const alert of warningAlerts) {
        logger.info('[AlertCalculationEngine] Processing warning alert for notifications', {
          alertId: alert.id,
          appId: alert.appId,
        });

        // TODO: Implement batch queuing for warning alerts
        // await notificationService.queueAlert(alert);
      }

      logger.info('[AlertCalculationEngine] Alert notifications processed', {
        totalAlerts: alerts.length,
        critical: criticalAlerts.length,
        warnings: warningAlerts.length,
      });
    } catch (error) {
      logger.error('[AlertCalculationEngine] Error handling alert notifications:', error);
    }
  }
}
