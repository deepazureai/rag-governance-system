import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { DataSourceConnectorFactory, DataSourceConfig } from '../connectors/DataSourceConnectorFactory';
import { IDataSourceConnector, RawDataRecord } from '../connectors/IDataSourceConnector';

export class DataIngestionService {
  /**
   * Universal ingestion method using factory pattern
   * Works with ANY data source (local folder, database, Azure Blob)
   * All sources normalized to RawDataRecord format before processing
   */
  async ingestFromDataSource(applicationId: string, dataSourceConfig: DataSourceConfig) {
    try {
      logger.info(`[v0] Starting universal data ingestion for app: ${applicationId} from source: ${dataSourceConfig.type}`);

      // Validate configuration
      const validation = DataSourceConnectorFactory.validateConfig(dataSourceConfig);
      if (!validation.valid) {
        throw new Error(`Invalid data source configuration: ${validation.errors.join(', ')}`);
      }

      // Create connector using factory pattern
      const connector: IDataSourceConnector = DataSourceConnectorFactory.createConnector(dataSourceConfig);

      // Connect to data source
      await connector.connect();
      logger.info(`[v0] Connected to ${dataSourceConfig.type} source`);

      // Fetch raw data - all sources return standardized RawDataRecord[] format
      const rawData: RawDataRecord[] = await connector.fetchRawData();
      logger.info(`[v0] Fetched ${rawData.length} raw records from ${dataSourceConfig.type}`);

      // Get metadata
      const metadata = await connector.getMetadata();

      // Disconnect
      await connector.disconnect();

      return {
        applicationId,
        sourceType: dataSourceConfig.type,
        totalRecords: rawData.length,
        rawData, // Standardized format ready for DataProcessingService
        metadata,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`[v0] Universal data ingestion error:`, error);
      throw error;
    }
  }

  /**
   * Test data source connection
   */
  async testDataSourceConnection(dataSourceConfig: DataSourceConfig): Promise<boolean> {
    try {
      const validation = DataSourceConnectorFactory.validateConfig(dataSourceConfig);
      if (!validation.valid) {
        logger.error(`[v0] Invalid configuration:`, validation.errors);
        return false;
      }

      const connector = DataSourceConnectorFactory.createConnector(dataSourceConfig);
      const isConnected = await connector.testConnection();
      
      logger.info(`[v0] Data source connection test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      return isConnected;
    } catch (error) {
      logger.error(`[v0] Data source connection test error:`, error);
      return false;
    }
  }

  /**
   * Legacy method for backward compatibility with local folder
   */
  async ingestFromLocalFolder(applicationId: string, folderPath: string, fileName: string) {
    try {
      logger.info(`[v0] DataIngestionService: ingestFromLocalFolder (legacy) for app: ${applicationId}`);
      
      const dataSourceConfig: DataSourceConfig = {
        type: 'local_folder',
        config: {
          folderPath,
          fileName,
        },
      };

      const result = await this.ingestFromDataSource(applicationId, dataSourceConfig);
      
      return {
        totalRecords: result.totalRecords,
        records: result.rawData,
        fileName,
        fileSize: result.metadata.recordCount || 0,
      };
    } catch (error) {
      logger.error(`[v0] Legacy ingestFromLocalFolder error:`, error);
      throw error;
    }
  }

  /**
   * Private helper - parse semicolon delimited records (for legacy support)
   */
  private parseSemicolonDelimitedRecords(content: string): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];
    const recordStrings = content.split(';').filter((r) => r.trim());

    for (const recordStr of recordStrings) {
      try {
        const record: Record<string, unknown> = {};
        const pairs = recordStr.split(',');

        for (const pair of pairs) {
          const [key, value] = pair.split('=').map((s) => s.trim());
          if (key && value) {
            record[key] = this.parseValue(value);
          }
        }

        if (Object.keys(record).length > 0) {
          records.push(record);
        }
      } catch (error) {
        logger.error(`[v0] Error parsing record:`, error);
      }
    }

    return records;
  }

  private parseValue(value: string): unknown {
    const cleaned = value.replace(/^["']|["']$/g, '');
    if (cleaned === 'true') return true;
    if (cleaned === 'false') return false;
    if (!isNaN(Number(cleaned)) && cleaned !== '') return Number(cleaned);
    return cleaned;
  }
}
