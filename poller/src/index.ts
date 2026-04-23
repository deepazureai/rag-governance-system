import { logger } from './src/utils';
import { config } from './src/config';
import * as mongodb from './src/mongodb';
import * as poller from './src/poller';

let isShuttingDown = false;

async function main() {
  logger.info('Starting Data Polling Service');
  logger.info('Configuration loaded', {
    mongoDbUrl: config.mongoDbUrl.replace(/\/\/.*@/, '//***:***@'),
    pollIntervalMinutes: config.pollIntervalMinutes,
    batchSize: config.batchSize,
  });

  try {
    // Connect to MongoDB
    await mongodb.connectMongoDB();

    // Get all schema mappings and start polling
    const applicationFilter = config.filterApplicationId;
    const schemaMappings = await mongodb.getSchemaMappings(applicationFilter);

    if (schemaMappings.length === 0) {
      logger.warn('No schema mappings found. Polling will continue checking for new mappings.');
    } else {
      logger.info(`Found ${schemaMappings.length} schema mappings to poll`);
    }

    // Start polling loop
    await startPollingLoop();
  } catch (error) {
    logger.error('Fatal error in main', { error });
    process.exit(1);
  }
}

async function startPollingLoop(): Promise<void> {
  logger.info('Starting polling loop', { 
    intervalMinutes: config.pollIntervalMinutes 
  });

  const pollIntervalMs = config.pollIntervalMinutes * 60 * 1000;

  const pollCycle = async () => {
    if (isShuttingDown) return;

    try {
      const applicationFilter = config.filterApplicationId;
      const schemaMappings = await mongodb.getSchemaMappings(applicationFilter);

      if (schemaMappings.length === 0) {
        logger.debug('No schema mappings found in this cycle');
        return;
      }

      logger.info(`Running polling cycle for ${schemaMappings.length} mappings`);

      for (const schemaMapping of schemaMappings) {
        if (isShuttingDown) break;

        try {
          // Get the connection for this mapping
          const connections = await mongodb.getConnections(schemaMapping.applicationId);
          const connection = connections.find(c => c.connectionId === schemaMapping.connectionId);

          if (!connection) {
            logger.warn('Connection not found for schema mapping', {
              applicationId: schemaMapping.applicationId,
              connectionId: schemaMapping.connectionId,
            });
            continue;
          }

          // Check if polling is enabled
          if (!schemaMapping.pollingConfig.isEnabled) {
            logger.debug('Polling disabled for mapping', {
              mappingId: schemaMapping.mappingId,
            });
            continue;
          }

          // Run polling
          const result = await poller.pollApplicationData(connection, schemaMapping);

          if (result.errors.length > 0) {
            logger.warn('Polling completed with errors', {
              applicationId: result.applicationId,
              errors: result.errors,
            });
          }
        } catch (error) {
          logger.error('Error polling schema mapping', {
            error,
            mappingId: schemaMapping.mappingId,
          });
        }
      }

      logger.info('Polling cycle completed');
    } catch (error) {
      logger.error('Error in polling cycle', { error });
    }

    // Schedule next cycle
    if (!isShuttingDown) {
      setTimeout(pollCycle, pollIntervalMs);
    }
  };

  // Start first cycle immediately
  await pollCycle();
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  if (isShuttingDown) return;

  isShuttingDown = true;
  logger.info('Initiating graceful shutdown');

  try {
    const shutdownTimeout = config.shutdownTimeoutSeconds * 1000;
    const shutdownPromise = (async () => {
      // Close all active connections
      await poller.closeAllPools();

      // Close MongoDB connection
      await mongodb.disconnectMongoDB();

      logger.info('Shutdown completed successfully');
    })();

    // Set timeout for forced exit
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error('Shutdown timeout exceeded')),
        shutdownTimeout
      )
    );

    await Promise.race([shutdownPromise, timeoutPromise]);
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
}

// Handle signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  shutdown();
});
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  shutdown();
});

// Start the service
main().catch((error) => {
  logger.error('Failed to start service', { error });
  process.exit(1);
});
