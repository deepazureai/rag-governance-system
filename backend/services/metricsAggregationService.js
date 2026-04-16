// Service to aggregate metrics from different data sources
const { withRetry } = require('../common/retry');
const logger = require('pino')();
const EncryptionService = require('../security/EncryptionService');
const DatabaseConnector = require('../connectors/DatabaseMetricAdapter');
const AzureMonitorAdapter = require('../connectors/AzureMonitorConnector');
const SplunkConnector = require('../connectors/SplunkConnector');
const DatadogConnector = require('../connectors/DatadogConnector');
const AzureBlobConnector = require('../connectors/AzureBlobConnector');

class MetricsAggregationService {
  constructor() {
    this.adapters = {
      'database': new DatabaseConnector(),
      'postgresql': new DatabaseConnector(),
      'mysql': new DatabaseConnector(),
      'mssql': new DatabaseConnector(),
      'azure-logs': new AzureMonitorAdapter(),
      'azure-monitor': new AzureMonitorAdapter(),
      'splunk': new SplunkConnector(),
      'datadog': new DatadogConnector(),
      'azure-blob': new AzureBlobConnector(),
    };
  }

  async fetchMetricsForApplication(application, connection) {
    const sourceType = connection.sourceType.toLowerCase();
    const adapter = this.adapters[sourceType];

    if (!adapter) {
      throw new Error(`Unsupported data source type: ${sourceType}`);
    }

    try {
      logger.info(`[Metrics] Fetching metrics for app ${application.id} from ${sourceType}`);

      // Decrypt credentials
      const credentials = EncryptionService.decrypt(connection.encryptedCredentials);

      // Fetch metrics with retry logic
      const metrics = await withRetry(
        () => adapter.fetchMetrics(connection, credentials, application),
        { maxAttempts: 3, backoffMs: 1000 }
      );

      return {
        success: true,
        metrics: this.normalizeMetrics(metrics, sourceType),
        fetchedAt: new Date(),
      };
    } catch (error) {
      logger.error(`[Metrics] Error fetching metrics: ${error.message}`);
      return {
        success: false,
        error: error.message,
        fetchedAt: new Date(),
      };
    }
  }

  normalizeMetrics(metrics, sourceType) {
    // Normalize metrics from different formats to a standard structure
    const normalized = [];

    switch (sourceType) {
      case 'database':
      case 'postgresql':
      case 'mysql':
      case 'mssql':
        // Database metrics already in standard format
        return metrics.map(m => ({
          name: m.metric_name || m.name,
          value: parseFloat(m.value),
          unit: m.unit || '%',
          category: m.category || 'quality',
          trend: m.trend || 'stable',
          trendPercentage: m.trend_percentage || 0,
          timestamp: m.timestamp || new Date(),
        }));

      case 'azure-logs':
      case 'azure-monitor':
        // Azure Monitor KQL query results
        return metrics.map(m => ({
          name: m.metricName,
          value: m.value,
          unit: m.unit || '%',
          category: m.category || 'quality',
          trend: this.calculateTrend(m.value, m.previousValue),
          trendPercentage: m.percentageChange || 0,
          timestamp: m.timestamp,
        }));

      case 'splunk':
        // Splunk SPL results
        return metrics.map(m => ({
          name: m.metric_name,
          value: parseFloat(m.value),
          unit: m.unit || '%',
          category: m.category,
          trend: m.trend,
          trendPercentage: m.change_percent,
          timestamp: new Date(m.timestamp),
        }));

      case 'datadog':
        // Datadog API response
        return metrics.map(m => ({
          name: m.metric,
          value: m.last_value,
          unit: '%',
          category: this.categorizeDatadogMetric(m.metric),
          trend: this.calculateTrend(m.last_value, m.previous_value),
          trendPercentage: m.change_percent || 0,
          timestamp: new Date(m.timestamp * 1000),
        }));

      case 'azure-blob':
        // Files from Azure Blob Storage (JSON format)
        return metrics.map(m => ({
          name: m.name || m.metric_id,
          value: parseFloat(m.value),
          unit: m.unit || '%',
          category: m.category || 'quality',
          trend: m.trend || 'stable',
          trendPercentage: m.trend_percentage || 0,
          timestamp: m.timestamp || new Date(),
        }));

      default:
        return metrics;
    }
  }

  calculateTrend(currentValue, previousValue) {
    if (!previousValue) return 'stable';
    const change = currentValue - previousValue;
    if (change > 0.5) return 'up';
    if (change < -0.5) return 'down';
    return 'stable';
  }

  categorizeDatadogMetric(metricName) {
    const nameLower = metricName.toLowerCase();
    if (nameLower.includes('safety') || nameLower.includes('harmful')) return 'safety';
    if (nameLower.includes('relevant')) return 'relevance';
    if (nameLower.includes('ground') || nameLower.includes('faithful')) return 'quality';
    return 'quality';
  }
}

module.exports = new MetricsAggregationService();
