// Scheduled job to collect metrics periodically
const logger = require('pino')();
const cron = require('node-cron');
const Application = require('../models/Application');
const Connection = require('../models/Connection');
const MetricsAggregationService = require('../services/metricsAggregationService');
const MetricsRepository = require('../services/metricsRepository');

class MetricsCollectionJob {
  static startScheduledCollection(intervalMinutes = 5) {
    // Run every N minutes
    const schedule = `*/${intervalMinutes} * * * *`;

    logger.info(`[MetricsCollectionJob] Starting scheduled metrics collection every ${intervalMinutes} minutes`);

    cron.schedule(schedule, async () => {
      try {
        await this.collectAllMetrics();
      } catch (error) {
        logger.error(`[MetricsCollectionJob] Error in scheduled collection: ${error.message}`);
      }
    });
  }

  static async collectAllMetrics() {
    try {
      logger.info('[MetricsCollectionJob] Starting metrics collection for all applications');

      const applications = await Application.find({ status: 'active' });

      for (const application of applications) {
        try {
          const connection = await Connection.findById(application.connectionId);
          if (!connection) {
            logger.warn(`[MetricsCollectionJob] No connection found for app ${application._id}`);
            continue;
          }

          const result = await MetricsAggregationService.fetchMetricsForApplication(
            application,
            connection
          );

          if (result.success) {
            await MetricsRepository.saveMetrics(
              application._id,
              connection._id,
              result.metrics,
              'success'
            );
            logger.info(`[MetricsCollectionJob] Successfully collected metrics for ${application.name}`);
          } else {
            await MetricsRepository.saveMetrics(
              application._id,
              connection._id,
              [],
              'failed',
              result.error
            );
            logger.error(`[MetricsCollectionJob] Failed to collect metrics for ${application.name}: ${result.error}`);
          }
        } catch (error) {
          logger.error(`[MetricsCollectionJob] Error collecting metrics for app ${application._id}: ${error.message}`);
        }
      }

      logger.info('[MetricsCollectionJob] Metrics collection completed');
    } catch (error) {
      logger.error(`[MetricsCollectionJob] Error in collection process: ${error.message}`);
    }
  }

  static async collectMetricsForApplication(applicationId) {
    try {
      const application = await Application.findById(applicationId);
      if (!application) {
        throw new Error('Application not found');
      }

      const connection = await Connection.findById(application.connectionId);
      if (!connection) {
        throw new Error('Connection not found');
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

      return result;
    } catch (error) {
      logger.error(`[MetricsCollectionJob] Error: ${error.message}`);
      throw error;
    }
  }
}

module.exports = MetricsCollectionJob;
