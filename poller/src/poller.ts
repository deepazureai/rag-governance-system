import { Pool } from 'pg';
import { logger } from './utils';
import * as mongodb from './mongodb';
import * as postgresql from './postgresql';
import * as keyvault from './keyvault';
import { 
  DatabaseConnection, 
  DatabaseSchemaMapping, 
  PollingState,
  PollingResult 
} from './types';

interface PollerInstance {
  applicationId: string;
  connectionId: string;
  mappingId: string;
  pgPool: Pool;
  retryCount: number;
  nextRetryAt?: Date;
}

const activePollersMap = new Map<string, PollerInstance>();
const backoffMultiplier: number = parseFloat(process.env.BACKOFF_MULTIPLIER || '2');
const initialBackoffMs: number = parseInt(process.env.INITIAL_BACKOFF_MS || '1000', 10);
const maxRetries: number = parseInt(process.env.MAX_RETRIES || '3', 10);
const batchSize: number = parseInt(process.env.BATCH_SIZE || '1000', 10);

export async function pollApplicationData(
  connection: DatabaseConnection,
  schemaMapping: DatabaseSchemaMapping,
  batchSizeOverride?: number
): Promise<PollingResult> {
  const pollerId = `${connection.applicationId}-${connection.connectionId}`;
  const startTime = Date.now();

  try {
    logger.info('Starting polling cycle', {
      pollerId,
      application: connection.applicationId,
      connection: connection.connectionName,
    });

    // Initialize or retrieve polling state
    let pollingState = await mongodb.getPollingState(
      connection.applicationId,
      connection.connectionId,
      schemaMapping.mappingId
    );

    if (!pollingState) {
      pollingState = await mongodb.initializePollingState(
        connection.applicationId,
        connection.connectionId,
        schemaMapping.mappingId
      );
      logger.info('Initialized new polling state', { 
        pollerId, 
        lastSeenId: pollingState.lastSeenId 
      });
    }

    // Check if we should retry or wait
    if (pollingState.nextRetryAt && new Date() < pollingState.nextRetryAt) {
      logger.info('Skipping polling cycle - in backoff period', {
        pollerId,
        nextRetryAt: pollingState.nextRetryAt,
      });
      return {
        applicationId: connection.applicationId,
        recordsFetched: 0,
        recordsUpserted: 0,
        errors: [],
        lastSeenId: pollingState.lastSeenId,
        durationMs: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Get or create PostgreSQL connection pool
    let pgPool = activePollersMap.get(pollerId)?.pgPool;
    if (!pgPool) {
      pgPool = await postgresql.initializePostgresPool(connection);
      activePollersMap.set(pollerId, {
        applicationId: connection.applicationId,
        connectionId: connection.connectionId,
        mappingId: schemaMapping.mappingId,
        pgPool,
        retryCount: 0,
      });
    }

    // Fetch new records from PostgreSQL
    const lastSeenId = pollingState.lastSeenId || 0;
    const limit = batchSizeOverride || batchSize;

    const pgRecords = await postgresql.fetchNewRecords(
      pgPool,
      schemaMapping.tableName,
      schemaMapping.columnMappings,
      lastSeenId,
      limit
    );

    if (pgRecords.length === 0) {
      logger.info('No new records to fetch', { pollerId, lastSeenId });
      await mongodb.updatePollingState(
        connection.applicationId,
        connection.connectionId,
        schemaMapping.mappingId,
        lastSeenId,
        0
      );

      return {
        applicationId: connection.applicationId,
        recordsFetched: 0,
        recordsUpserted: 0,
        errors: [],
        lastSeenId,
        durationMs: Date.now() - startTime,
        timestamp: new Date(),
      };
    }

    // Transform records to MongoDB format
    const mongoRecords = await postgresql.transformToRawDataRecords(
      pgRecords,
      connection.applicationId,
      connection.connectionId,
      schemaMapping.mappingId,
      schemaMapping.columnMappings
    );

    // Upsert records into MongoDB
    const upsertedCount = await mongodb.upsertRawDataRecords(mongoRecords);

    // Generate alerts for upserted records (call backend alert creation endpoint)
    try {
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5001';
      const alertResponse = await fetch(`${backendUrl}/api/alerts/batch-create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: connection.applicationId,
          records: mongoRecords.slice(0, 100), // Send first 100 records to avoid payload size issues
        }),
      });

      if (!alertResponse.ok) {
        const errorText = await alertResponse.text();
        throw new Error(
          `Alert creation failed: HTTP ${alertResponse.status} - ${errorText}`
        );
      }

      const alertResult = await alertResponse.json();
      logger.info('Alerts created successfully', {
        pollerId,
        alertsCreated: alertResult.data?.alertsCreated || 0,
      });
    } catch (alertError: any) {
      // Log alert creation error but don't fail the polling cycle
      logger.warn('Failed to create alerts, continuing with polling', {
        pollerId,
        error: alertError.message,
      });
    }

    // Get the highest ID from fetched records
    const maxId = Math.max(...pgRecords.map((r) => r.id));

    // Update polling state only after successful upsert
    await mongodb.updatePollingState(
      connection.applicationId,
      connection.connectionId,
      schemaMapping.mappingId,
      maxId,
      pgRecords.length
    );

    logger.info('Polling cycle completed successfully', {
      pollerId,
      recordsFetched: pgRecords.length,
      recordsUpserted: upsertedCount,
      newLastSeenId: maxId,
      durationMs: Date.now() - startTime,
    });

    // Reset retry count on success
    const poller = activePollersMap.get(pollerId);
    if (poller) {
      poller.retryCount = 0;
    }

    return {
      applicationId: connection.applicationId,
      recordsFetched: pgRecords.length,
      recordsUpserted: upsertedCount,
      errors: [],
      lastSeenId: maxId,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    };
  } catch (error: any) {
    logger.error('Error during polling cycle', {
      pollerId,
      error: error.message,
      errorStack: error.stack,
    });

    // Handle backoff and retries
    const poller = activePollersMap.get(pollerId);
    if (poller && poller.retryCount < maxRetries) {
      poller.retryCount++;
      const backoffMs = initialBackoffMs * Math.pow(backoffMultiplier, poller.retryCount - 1);
      const nextRetryAt = new Date(Date.now() + backoffMs);
      poller.nextRetryAt = nextRetryAt;

      logger.info('Scheduling retry', {
        pollerId,
        retryCount: poller.retryCount,
        nextRetryAt,
      });

      await mongodb.updatePollingState(
        connection.applicationId,
        connection.connectionId,
        schemaMapping.mappingId,
        0,
        0,
        error.message
      );
    }

    return {
      applicationId: connection.applicationId,
      recordsFetched: 0,
      recordsUpserted: 0,
      errors: [error.message],
      lastSeenId: 0,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    };
  }
}

export function getActivePollers(): Map<string, PollerInstance> {
  return activePollersMap;
}

export async function closeAllPools(): Promise<void> {
  logger.info('Closing all PostgreSQL pools');
  for (const [pollerId, poller] of activePollersMap.entries()) {
    try {
      await postgresql.closePool(poller.pgPool);
      logger.info('Closed pool', { pollerId });
    } catch (error) {
      logger.error('Error closing pool', { pollerId, error });
    }
  }
  activePollersMap.clear();
}
