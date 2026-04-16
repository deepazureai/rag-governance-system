// Repository for storing and retrieving metrics
const ApplicationMetric = require('../models/ApplicationMetric');
const logger = require('pino')();

class MetricsRepository {
  async saveMetrics(applicationId, connectionId, metrics, fetchStatus, fetchError = null) {
    try {
      const applicationMetric = new ApplicationMetric({
        applicationId,
        connectionId,
        metrics,
        lastFetchedAt: new Date(),
        fetchStatus,
        fetchError,
      });

      const saved = await applicationMetric.save();
      logger.info(`[MetricsRepository] Saved metrics for app ${applicationId}`);
      return saved;
    } catch (error) {
      logger.error(`[MetricsRepository] Error saving metrics: ${error.message}`);
      throw error;
    }
  }

  async getLatestMetrics(applicationId, limit = 1) {
    return ApplicationMetric.find({ applicationId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async getMetricsForDateRange(applicationId, startDate, endDate) {
    return ApplicationMetric.find({
      applicationId,
      createdAt: { $gte: startDate, $lte: endDate },
    })
      .sort({ createdAt: -1 })
      .lean();
  }

  async getMetricsForMultipleApps(applicationIds, limit = 1) {
    return ApplicationMetric.find({ applicationId: { $in: applicationIds } })
      .sort({ createdAt: -1 })
      .limit(limit * applicationIds.length)
      .lean();
  }

  async getAggregatedMetrics(applicationId, hours = 24) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const metrics = await this.getMetricsForDateRange(applicationId, startDate, new Date());

    if (!metrics.length) return [];

    // Aggregate metrics over time
    const aggregated = {};
    metrics.forEach(record => {
      record.metrics.forEach(metric => {
        if (!aggregated[metric.name]) {
          aggregated[metric.name] = {
            name: metric.name,
            values: [],
            unit: metric.unit,
            category: metric.category,
          };
        }
        aggregated[metric.name].values.push({
          value: metric.value,
          timestamp: metric.timestamp,
        });
      });
    });

    // Calculate statistics
    return Object.values(aggregated).map(metric => ({
      name: metric.name,
      unit: metric.unit,
      category: metric.category,
      latest: metric.values[0]?.value,
      average: metric.values.reduce((sum, v) => sum + v.value, 0) / metric.values.length,
      min: Math.min(...metric.values.map(v => v.value)),
      max: Math.max(...metric.values.map(v => v.value)),
      trend: this.calculateTrend(metric.values),
      history: metric.values.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)),
    }));
  }

  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    const latest = values[0].value;
    const previous = values[values.length - 1].value;
    const change = latest - previous;
    if (change > 0.5) return 'up';
    if (change < -0.5) return 'down';
    return 'stable';
  }
}

module.exports = new MetricsRepository();
