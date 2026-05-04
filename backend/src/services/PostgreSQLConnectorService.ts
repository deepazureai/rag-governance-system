import { logger } from '../utils/logger.js';
import { Pool, PoolClient } from 'pg';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * PostgreSQL Connector Service
 * Handles scalable data fetching from external PostgreSQL databases
 * with connection pooling, pagination, and async batch insertion to MongoDB
 */
export class PostgreSQLConnectorService {
  private pool: Pool | null = null;
  private readonly BATCH_SIZE = 1000; // Insert 1000 records at a time
  private readonly FETCH_PAGE_SIZE = 500; // Fetch 500 rows per query
  private readonly CONNECTION_TIMEOUT = 30000; // 30 seconds
  private readonly QUERY_TIMEOUT = 60000; // 60 seconds per query

  /**
   * Create PostgreSQL connection pool from configuration
   */
  private async createConnectionPool(dbConfig: any): Promise<Pool> {
    try {
      logger.info('[PostgreSQLConnectorService] Creating connection pool', {
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
      });

      const pool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.username,
        password: dbConfig.password,
        ssl: dbConfig.ssl || false,
        max: 20, // Maximum connections in pool
        min: 2, // Minimum connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: this.CONNECTION_TIMEOUT,
        query_timeout: this.QUERY_TIMEOUT,
      });

      // Test connection
      const client = await pool.connect();
      const result = await client.query('SELECT 1');
      client.release();

      logger.info('[PostgreSQLConnectorService] Connection pool created and tested successfully');
      return pool;
    } catch (error: any) {
      logger.error('[PostgreSQLConnectorService] Failed to create connection pool:', error.message);
      throw error;
    }
  }

  /**
   * Test database connection with credentials
   */
  async testConnection(dbConfig: any): Promise<{ success: boolean; message: string }> {
    let pool: Pool | null = null;
    try {
      logger.info('[PostgreSQLConnectorService] Testing connection to PostgreSQL');
      pool = await this.createConnectionPool(dbConfig);
      await pool.end();
      return { success: true, message: 'Connection successful' };
    } catch (error: any) {
      const message = `Connection failed: ${error.message}`;
      logger.error('[PostgreSQLConnectorService]', message);
      return { success: false, message };
    } finally {
      if (pool) {
        await pool.end().catch((e) => logger.error('[PostgreSQLConnectorService] Error closing pool:', e));
      }
    }
  }

  /**
   * Fetch data from PostgreSQL table with pagination and insert to MongoDB
   * Designed for scalability - handles millions of records via pagination and batching
   */
  async fetchAndInsertData(
    applicationId: string,
    dataSourceId: string,
    dbConfig: any,
    columnMapping: any
  ): Promise<{ totalRecords: number; insertedRecords: number; failedRecords: number; batchId: string }> {
    const batchId = uuidv4();
    let pool: Pool | null = null;
    let totalRecords = 0;
    let insertedRecords = 0;
    let failedRecords = 0;
    let client: PoolClient | null = null;

    try {
      logger.info('[PostgreSQLConnectorService] Starting data fetch and insert', {
        applicationId,
        dataSourceId,
        batchId,
        table: dbConfig.tableName,
      });

      // 1. Create connection pool
      pool = await this.createConnectionPool(dbConfig);

      // 2. Get record count
      client = await pool.connect();
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${dbConfig.tableName}"`);
      totalRecords = parseInt(countResult.rows[0].count, 10);
      logger.info('[PostgreSQLConnectorService] Total records in source table:', totalRecords);

      if (totalRecords === 0) {
        logger.warn('[PostgreSQLConnectorService] No records found in source table');
        return { totalRecords: 0, insertedRecords: 0, failedRecords: 0, batchId };
      }

      // 3. Fetch and insert data in pages
      let offset = 0;
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');

      while (offset < totalRecords) {
        try {
          logger.info('[PostgreSQLConnectorService] Fetching records', {
            offset,
            limit: this.FETCH_PAGE_SIZE,
            progress: `${offset}/${totalRecords}`,
          });

          // Fetch page of records
          const pageResult = await client.query(
            `SELECT * FROM "${dbConfig.tableName}" LIMIT $1 OFFSET $2`,
            [this.FETCH_PAGE_SIZE, offset]
          );

          const pageRecords = pageResult.rows;
          logger.info(`[PostgreSQLConnectorService] Fetched ${pageRecords.length} records from PostgreSQL`);

          // 4. Transform and batch insert
          const rawDataBatch = pageRecords.map((row: any, index: number) => {
            try {
              const normalizedRecord = this.normalizePostgreSQLRow(row, columnMapping);
              return {
                applicationId,
                connectionId: dataSourceId,
                sourceType: 'database',
                recordData: normalizedRecord,
                lineNumber: offset + index + 1,
                batchId,
                fileName: `${dbConfig.tableName}_batch_${batchId}`,
                processedAt: new Date(),
                status: 'pending',
                createdAt: new Date(),
                updatedAt: new Date(),
              };
            } catch (transformError: any) {
              logger.error('[PostgreSQLConnectorService] Error transforming record', {
                rowIndex: index,
                error: transformError.message,
              });
              failedRecords++;
              return null;
            }
          }).filter((r) => r !== null);

          // Insert batch to MongoDB
          if (rawDataBatch.length > 0) {
            try {
              await RawDataCollection.insertMany(rawDataBatch, { ordered: false });
              insertedRecords += rawDataBatch.length;
              logger.info(`[PostgreSQLConnectorService] Inserted ${rawDataBatch.length} records to MongoDB`, {
                total: insertedRecords,
                progress: `${insertedRecords}/${totalRecords}`,
              });
            } catch (insertError: any) {
              logger.error('[PostgreSQLConnectorService] Error inserting batch to MongoDB:', insertError.message);
              failedRecords += rawDataBatch.length;
            }
          }

          offset += this.FETCH_PAGE_SIZE;

          // Yield to event loop
          await new Promise((resolve) => setImmediate(resolve));
        } catch (pageError: any) {
          logger.error('[PostgreSQLConnectorService] Error processing page:', pageError.message);
          failedRecords += Math.min(this.FETCH_PAGE_SIZE, totalRecords - offset);
          offset += this.FETCH_PAGE_SIZE; // Continue to next page
        }
      }

      logger.info('[PostgreSQLConnectorService] Data fetch and insert completed', {
        batchId,
        totalRecords,
        insertedRecords,
        failedRecords,
        successRate: `${((insertedRecords / totalRecords) * 100).toFixed(2)}%`,
      });

      return {
        totalRecords,
        insertedRecords,
        failedRecords,
        batchId,
      };
    } catch (error: any) {
      logger.error('[PostgreSQLConnectorService] Fatal error during fetch and insert:', error.message);
      throw error;
    } finally {
      // Cleanup
      if (client) {
        try {
          client.release();
        } catch (e) {
          logger.error('[PostgreSQLConnectorService] Error releasing client:', e);
        }
      }
      if (pool) {
        try {
          await pool.end();
          logger.info('[PostgreSQLConnectorService] Connection pool closed');
        } catch (e) {
          logger.error('[PostgreSQLConnectorService] Error closing pool:', e);
        }
      }
    }
  }

  /**
   * Normalize PostgreSQL row to match evaluation data structure using column mapping
   */
  private normalizePostgreSQLRow(row: Record<string, any>, columnMapping: any): Record<string, any> {
    const normalized: Record<string, any> = {
      ...row, // Include all original fields
    };

    // Map PostgreSQL columns to standard evaluation fields using provided mapping
    if (columnMapping.userIdColumn && row[columnMapping.userIdColumn]) {
      normalized.userId = row[columnMapping.userIdColumn];
    }

    if (columnMapping.sessionIdColumn && row[columnMapping.sessionIdColumn]) {
      normalized.sessionId = row[columnMapping.sessionIdColumn];
    }

    if (columnMapping.promptColumn && row[columnMapping.promptColumn]) {
      normalized.userPrompt = row[columnMapping.promptColumn];
      normalized.query = row[columnMapping.promptColumn];
    }

    if (columnMapping.contextColumn && row[columnMapping.contextColumn]) {
      normalized.context = row[columnMapping.contextColumn];
    }

    if (columnMapping.responseColumn && row[columnMapping.responseColumn]) {
      normalized.llmResponse = row[columnMapping.responseColumn];
      normalized.response = row[columnMapping.responseColumn];
    }

    if (columnMapping.promptTimestampColumn && row[columnMapping.promptTimestampColumn]) {
      normalized.promptTimestamp = row[columnMapping.promptTimestampColumn];
    }

    if (columnMapping.contextRetrievalStartTimeColumn && row[columnMapping.contextRetrievalStartTimeColumn]) {
      normalized.contextRetrievalStartTime = row[columnMapping.contextRetrievalStartTimeColumn];
    }

    if (columnMapping.contextRetrievalEndTimeColumn && row[columnMapping.contextRetrievalEndTimeColumn]) {
      normalized.contextRetrievalEndTime = row[columnMapping.contextRetrievalEndTimeColumn];
    }

    if (columnMapping.llmRequestStartTimeColumn && row[columnMapping.llmRequestStartTimeColumn]) {
      normalized.llmRequestStartTime = row[columnMapping.llmRequestStartTimeColumn];
    }

    if (columnMapping.llmResponseEndTimeColumn && row[columnMapping.llmResponseEndTimeColumn]) {
      normalized.llmResponseEndTime = row[columnMapping.llmResponseEndTimeColumn];
    }

    if (columnMapping.contextChunkCountColumn && row[columnMapping.contextChunkCountColumn]) {
      normalized.contextChunkCount = row[columnMapping.contextChunkCountColumn];
    }

    if (columnMapping.contextTotalLengthWordsColumn && row[columnMapping.contextTotalLengthWordsColumn]) {
      normalized.contextTotalLengthWords = row[columnMapping.contextTotalLengthWordsColumn];
    }

    if (columnMapping.promptLengthWordsColumn && row[columnMapping.promptLengthWordsColumn]) {
      normalized.promptLengthWords = row[columnMapping.promptLengthWordsColumn];
    }

    if (columnMapping.responseLengthWordsColumn && row[columnMapping.responseLengthWordsColumn]) {
      normalized.responseLengthWords = row[columnMapping.responseLengthWordsColumn];
    }

    if (columnMapping.statusColumn && row[columnMapping.statusColumn]) {
      normalized.status = row[columnMapping.statusColumn];
    }

    return normalized;
  }

  /**
   * Get table schema from PostgreSQL
   */
  async getTableSchema(dbConfig: any): Promise<Array<{ name: string; type: string }>> {
    let pool: Pool | null = null;

    try {
      pool = await this.createConnectionPool(dbConfig);
      const client = await pool.connect();

      const result = await client.query(
        `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`,
        [dbConfig.tableName]
      );
      client.release();

      return result.rows.map((row) => ({
        name: row.column_name,
        type: row.data_type,
      }));
    } catch (error: any) {
      logger.error('[PostgreSQLConnectorService] Error getting table schema:', error.message);
      throw error;
    } finally {
      if (pool) {
        await pool.end().catch((e) => logger.error('[PostgreSQLConnectorService] Error closing pool:', e));
      }
    }
  }
}

// Export singleton instance
export const postgreSQLConnectorService = new PostgreSQLConnectorService();
