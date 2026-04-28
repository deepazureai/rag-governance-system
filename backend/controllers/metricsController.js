// API Controller for metrics endpoints
const logger = require('pino')();
const MetricsAggregationService = require('../services/metricsAggregationService');
const MetricsRepository = require('../services/metricsRepository');
const Connection = require('../models/Connection');
const Application = require('../models/Application');

class MetricsController {
  async getApplicationMetrics(req, res) {
    try {
      const { applicationId } = req.params;
      const { hours = 24 } = req.query;

      const metrics = await MetricsRepository.getAggregatedMetrics(applicationId, parseInt(hours));

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error(`[MetricsController] Error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getMultipleAppMetrics(req, res) {
    try {
      const { applicationIds } = req.body; // Array of app IDs

      const metricsMap = {};
      for (const appId of applicationIds) {
        const metrics = await MetricsRepository.getLatestMetrics(appId);
        metricsMap[appId] = metrics[0]?.metrics || [];
      }

      res.json({
        success: true,
        data: metricsMap,
      });
    } catch (error) {
      logger.error(`[MetricsController] Error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async triggerMetricsFetch(req, res) {
    try {
      const { applicationId } = req.params;

      const application = await Application.findById(applicationId);
      if (!application) {
        return res.status(404).json({
          success: false,
          error: 'Application not found',
        });
      }

      const connection = await Connection.findById(application.connectionId);
      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Connection not found',
        });
      }

      const result = await MetricsAggregationService.fetchMetricsForApplication(
        application,
        connection
      );

      if (result.success) {
        await MetricsRepository.saveMetrics(
          applicationId,
          connection._id,
          result.metrics,
          'success'
        );
      } else {
        await MetricsRepository.saveMetrics(
          applicationId,
          connection._id,
          [],
          'failed',
          result.error
        );
      }

      res.json(result);
    } catch (error) {
      logger.error(`[MetricsController] Error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }

  async getMetricsHistory(req, res) {
    try {
      const { applicationId } = req.params;
      const { startDate, endDate } = req.query;

      const metrics = await MetricsRepository.getMetricsForDateRange(
        applicationId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error(`[MetricsController] Error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}

module.exports = new MetricsController();
