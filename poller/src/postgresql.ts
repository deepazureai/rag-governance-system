import { Pool, PoolClient } from 'pg';
import { logger } from './utils';
import { config } from './config';
import { RawDataRecord, ColumnMappings, DatabaseConnection } from './types';

let pool: Pool;

export async function initializePostgresPool(connection: DatabaseConnection): Promise<Pool> {
  const pgPool = new Pool({
    host: connection.server,
    port: connection.port,
    database: connection.database,
    user: connection.credentials.keyVaultReference.split(':')[0] || config.postgresUser,
    password: connection.credentials.keyVaultReference.split(':')[1] || config.postgresPassword,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5001,
  });

  pgPool.on('error', (err) => {
    logger.error('Unexpected pool error', { error: err, connection: connection.connectionName });
  });

  try {
    const client = await pgPool.connect();
    client.release();
    logger.info('PostgreSQL pool initialized successfully', { 
      connection: connection.connectionName 
    });
  } catch (error) {
    logger.error('Failed to initialize PostgreSQL pool', { error });
    throw error;
  }

  return pgPool;
}

export async function testConnection(connection: DatabaseConnection): Promise<boolean> {
  const testPool = new Pool({
    host: connection.server,
    port: connection.port,
    database: connection.database,
    user: connection.credentials.keyVaultReference.split(':')[0],
    password: connection.credentials.keyVaultReference.split(':')[1],
    connectionTimeoutMillis: 5001,
  });

  try {
    const client = await testPool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Connection test successful', { connection: connection.connectionName });
    return true;
  } catch (error) {
    logger.error('Connection test failed', { error, connection: connection.connectionName });
    return false;
  } finally {
    await testPool.end();
  }
}

export async function fetchNewRecords(
  pool: Pool,
  tableName: string,
  columnMappings: ColumnMappings,
  lastSeenId: number,
  batchSize: number
): Promise<any[]> {
  try {
    const client = await pool.connect();
    const columns = Object.values(columnMappings).filter(col => col) as string[];
    const selectClause = ['id', ...columns].join(', ');
    
    const query = `
      SELECT ${selectClause}
      FROM ${tableName}
      WHERE id > $1
      ORDER BY id ASC
      LIMIT $2
    `;

    logger.debug('Fetching records from PostgreSQL', {
      table: tableName,
      lastSeenId,
      batchSize,
      query: query.substring(0, 100),
    });

    const result = await client.query(query, [lastSeenId, batchSize]);
    client.release();

    logger.info('Fetched records from PostgreSQL', {
      table: tableName,
      recordCount: result.rows.length,
    });

    return result.rows;
  } catch (error) {
    logger.error('Error fetching records from PostgreSQL', { error, tableName });
    throw error;
  }
}

export async function transformToRawDataRecords(
  rows: any[],
  applicationId: string,
  connectionId: string,
  mappingId: string,
  columnMappings: ColumnMappings
): Promise<RawDataRecord[]> {
  return rows.map((row) => ({
    applicationId,
    connectionId,
    mappingId,
    sourceId: row.id,
    prompt: row[columnMappings.prompt],
    context: columnMappings.context ? row[columnMappings.context] : undefined,
    response: row[columnMappings.response],
    userId: columnMappings.userId ? row[columnMappings.userId] : undefined,
    timestamp: columnMappings.timestamp ? new Date(row[columnMappings.timestamp]) : undefined,
    fetchedAt: new Date(),
    updatedAt: new Date(),
  }));
}

export async function closePool(pgPool: Pool): Promise<void> {
  if (pgPool) {
    try {
      await pgPool.end();
      logger.info('PostgreSQL pool closed');
    } catch (error) {
      logger.error('Error closing PostgreSQL pool', { error });
    }
  }
}
