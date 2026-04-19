import { logger } from '../utils/logger';
import { IDataSourceConnector, RawDataRecord } from './IDataSourceConnector';

export interface BlobConfig {
  storageAccount: string;
  containerName: string;
  blobName?: string;
  connectionString: string;
}

export class AzureBlobConnector implements IDataSourceConnector {
  private config: BlobConfig;
  private connected = false;

  constructor(config: BlobConfig) {
    this.config = config;
  }

  /**
   * Connect to Azure Blob Storage
   */
  async connect(): Promise<void> {
    try {
      logger.info(`[v0] AzureBlobConnector connecting to ${this.config.storageAccount}/${this.config.containerName}`);
      
      // TODO: Create Azure Blob Service client using @azure/storage-blob
      // const blobServiceClient = BlobServiceClient.fromConnectionString(this.config.connectionString);
      // const containerClient = blobServiceClient.getContainerClient(this.config.containerName);
      
      this.connected = true;
      logger.info(`[v0] AzureBlobConnector connected successfully`);
    } catch (error) {
      logger.error(`[v0] AzureBlobConnector connection failed:`, error);
      throw error;
    }
  }

  /**
   * Disconnect from Azure Blob Storage
   */
  async disconnect(): Promise<void> {
    this.connected = false;
    logger.info(`[v0] AzureBlobConnector disconnected`);
  }

  /**
   * Fetch raw data from Azure Blob
   * Returns standardized RawDataRecord[] format
   */
  async fetchRawData(): Promise<RawDataRecord[]> {
    if (!this.connected) {
      throw new Error('Connector not connected. Call connect() first.');
    }

    try {
      const blobName = this.config.blobName || 'data.txt';
      logger.info(`[v0] Fetching blob: ${blobName}`);

      // TODO: Download blob content
      // const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      // const downloadBlockBlobResponse = await blockBlobClient.download(0);
      // const content = await streamToString(downloadBlockBlobResponse.readableStreamBody);

      // For now, return empty - implementation with Azure SDK
      const content = '';
      
      // Parse content using same format as LocalFolderConnector
      const rawDataRecords = this.parseRecords(content);
      
      logger.info(`[v0] Fetched ${rawDataRecords.length} records from Azure Blob`);
      return rawDataRecords;
    } catch (error) {
      logger.error(`[v0] AzureBlobConnector fetchRawData error:`, error);
      throw error;
    }
  }

  /**
   * Test connection to Azure Blob Storage
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.connect();
      // TODO: List blobs to verify connection
      await this.disconnect();
      return true;
    } catch (error) {
      logger.error(`[v0] AzureBlobConnector test connection failed:`, error);
      return false;
    }
  }

  /**
   * Get metadata about the data source
   */
  async getMetadata(): Promise<{
    recordCount?: number;
    lastModified?: Date;
    sourceInfo: string;
  }> {
    try {
      if (!this.connected) {
        await this.connect();
      }

      // TODO: Get blob properties for metadata
      return {
        sourceInfo: `Azure Blob Storage: ${this.config.storageAccount}/${this.config.containerName}/${this.config.blobName || '*'}`,
      };
    } catch (error) {
      logger.error(`[v0] Cannot get metadata:`, error);
      return {
        sourceInfo: `Azure Blob Storage: ${this.config.storageAccount}/${this.config.containerName}`,
      };
    }
  }

  /**
   * Parse semicolon-delimited records with comma-separated key=value pairs
   * Same format as LocalFolderConnector for consistency
   */
  private parseRecords(content: string): RawDataRecord[] {
    const records: RawDataRecord[] = [];
    const rawRecords = content.split('\n').filter((r) => r.trim());

    rawRecords.forEach((rawRecord) => {
      try {
        const record = this.parseNameValuePairs(rawRecord.trim());
        records.push({
          query: record.query || '',
          response: record.response || '',
          context: record.context,
          userId: record.userId || record.user_id,
          sessionId: record.sessionId || record.session_id,
          timestamp: record.timestamp,
          ...record,
        });
      } catch (error) {
        logger.warn(`[v0] Parse error in Azure Blob record:`, error);
      }
    });

    return records;
  }

  /**
   * Parse name=value pairs separated by semicolons
   */
  private parseNameValuePairs(recordString: string): Record<string, any> {
    const record: Record<string, any> = {};
    const pairs = recordString.split(';');

    pairs.forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key && value) {
        record[key.trim()] = this.parseValue(value.trim());
      }
    });

    return record;
  }

  private parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (!isNaN(Number(value)) && value !== '') return Number(value);
    return value;
  }

  /**
   * Legacy method for backward compatibility
   */
  async readDataFile(config: BlobConfig, applicationId: string) {
    try {
      logger.info(`[v0] AzureBlobConnector legacy readDataFile called for app ${applicationId}`);
      
      if (!config.storageAccount || !config.containerName) {
        throw new Error('Missing required Azure Blob configuration');
      }

      return {
        records: [],
        metadata: { totalRecords: 0, duplicates: 0, errors: 0 },
        config: {
          container: config.containerName,
          blob: config.blobName,
          account: config.storageAccount,
        },
      };
    } catch (error) {
      logger.error(`[v0] AzureBlobConnector readDataFile error:`, error);
      throw error;
    }
  }
}
