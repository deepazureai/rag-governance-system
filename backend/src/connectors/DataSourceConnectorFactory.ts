import { IDataSourceConnector } from './IDataSourceConnector.js';
import { LocalFolderConnector } from './LocalFolderConnector.js';
import { DatabaseConnector } from './DatabaseConnector.js';
import { AzureBlobConnector } from './AzureBlobConnector.js';
import { logger } from '../utils/logger.js';

export type DataSourceType = 'local_folder' | 'database' | 'azure_blob' | 'splunk' | 'datadog';

export interface DataSourceConfig {
  type: DataSourceType;
  config: Record<string, any>;
}

export class DataSourceConnectorFactory {
  /**
   * Factory method that creates the appropriate connector based on data source type
   * All connectors implement IDataSourceConnector and return standardized RawDataRecord[]
   */
  static createConnector(dataSourceConfig: DataSourceConfig): IDataSourceConnector {
    logger.info(`[v0] Creating connector for data source type: ${dataSourceConfig.type}`);

    switch (dataSourceConfig.type) {
      case 'local_folder':
        return new LocalFolderConnector(dataSourceConfig.config);

      case 'database':
        return new DatabaseConnector(dataSourceConfig.config as any);

      case 'azure_blob':
        return new AzureBlobConnector(dataSourceConfig.config as any);

      case 'splunk':
        logger.warn(`[v0] Splunk connector not yet implemented, using database fallback`);
        return new DatabaseConnector(dataSourceConfig.config as any);

      case 'datadog':
        logger.warn(`[v0] Datadog connector not yet implemented, using database fallback`);
        return new DatabaseConnector(dataSourceConfig.config as any);

      default:
        throw new Error(`Unsupported data source type: ${dataSourceConfig.type}`);
    }
  }

  /**
   * Get all supported data source types
   */
  static getSupportedTypes(): DataSourceType[] {
    return ['local_folder', 'database', 'azure_blob', 'splunk', 'datadog'];
  }

  /**
   * Validate data source configuration before creating connector
   */
  static validateConfig(dataSourceConfig: DataSourceConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!dataSourceConfig.type) {
      errors.push('Data source type is required');
    }

    if (!this.getSupportedTypes().includes(dataSourceConfig.type)) {
      errors.push(`Data source type "${dataSourceConfig.type}" is not supported`);
    }

    if (!dataSourceConfig.config) {
      errors.push('Data source configuration is required');
    }

    // Type-specific validation
    switch (dataSourceConfig.type) {
      case 'local_folder':
        if (!dataSourceConfig.config.folderPath) {
          errors.push('Local folder path is required');
        }
        break;

      case 'database':
        if (!dataSourceConfig.config.host || !dataSourceConfig.config.database || !dataSourceConfig.config.table) {
          errors.push('Database configuration (host, database, table) is required');
        }
        break;

      case 'azure_blob':
        if (!dataSourceConfig.config.storageAccount || !dataSourceConfig.config.containerName) {
          errors.push('Azure Blob configuration (storageAccount, containerName) is required');
        }
        break;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
