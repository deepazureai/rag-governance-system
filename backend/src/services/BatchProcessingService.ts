import { v4 as uuidv4 } from 'uuid';
import { BatchProcess, IBatchProcess } from '../models/BatchProcess';
import { RawDataRecord } from '../models/RawDataRecord';
import { Archive } from '../models/Archive';
import { localFolderConnector, FileAccessError, ParsedRecord } from '../connectors/LocalFolderConnector';
import { archiveService } from './ArchiveService';
import { logger } from '../utils/logger';
import * as crypto from 'crypto';

export class BatchProcessingService {
  /**
   * Execute complete batch process: read file → archive → delete old → insert new
   */
  async executeBatchProcess(
    applicationId: string,
    connectionId: string,
    sourceType: 'local-folder' | 'azure-blob',
    sourceConfig: any
  ): Promise<IBatchProcess> {
    const batchId = uuidv4();
    const startTime = new Date();

    logger.info(`[BatchProcessingService] Starting batch process ${batchId} for app ${applicationId}`);

    let batchProcess = await this.createBatchProcess(
      applicationId,
      connectionId,
      batchId,
      sourceType,
      sourceConfig
    );

    try {
      // Phase 1: Read Data
      batchProcess = await this.updateBatchStatus(batchId, 'reading', 'Reading raw data file');
      const { records, fileSize, fileName, error: readError } = await this.readDataFromSource(
        sourceType,
        sourceConfig,
        applicationId
      );

      if (readError) {
        throw new Error(`File read failed: ${readError.message}`);
      }

      batchProcess.metadata.fileSize = fileSize;
      batchProcess.metadata.fileName = fileName;
      batchProcess.metadata.recordCount = records.length;
      batchProcess.progress.totalRecords = records.length;

      // Phase 2: Archive existing data
      batchProcess = await this.updateBatchStatus(batchId, 'archiving', 'Archiving existing records');
      const archiveId = await archiveService.archiveExistingRecords(applicationId, batchId);
      batchProcess.archiveFileId = archiveId;

      // Phase 3: Delete old records
      batchProcess = await this.updateBatchStatus(
        batchId,
        'deleting',
        'Deleting old records from database'
      );
      const deletedCount = await RawDataRecord.deleteMany({ applicationId });
      logger.info(
        `[BatchProcessingService] Deleted ${deletedCount.deletedCount} old records for app ${applicationId}`
      );

      // Phase 4: Insert new records with validation
      batchProcess = await this.updateBatchStatus(batchId, 'inserting', 'Inserting new records');
      const insertedCount = await this.insertRecordsWithValidation(
        applicationId,
        connectionId,
        batchId,
        records,
        sourceType
      );

      // Complete
      batchProcess.progress.processedRecords = insertedCount;
      batchProcess.timestamps.completedAt = new Date();
      batchProcess.status = 'completed';
      await batchProcess.save();

      logger.info(
        `[BatchProcessingService] Batch ${batchId} completed successfully. Inserted ${insertedCount} records`
      );

      return batchProcess;
    } catch (error: any) {
      logger.error(`[BatchProcessingService] Batch process failed:`, error);

      // Mark as failed and save error details
      batchProcess.status = 'failed';
      batchProcess.errorDetails = {
        phase: 'batch_execution',
        message: error.message,
        code: 'BATCH_FAILED',
        timestamp: new Date(),
      };
      batchProcess.timestamps.completedAt = new Date();
      await batchProcess.save();

      throw error;
    }
  }

  private async readDataFromSource(
    sourceType: 'local-folder' | 'azure-blob',
    sourceConfig: any,
    applicationId: string
  ): Promise<{
    records: ParsedRecord[];
    fileSize: number;
    fileName: string;
    error?: FileAccessError;
  }> {
    if (sourceType === 'local-folder') {
      const { folderPath, fileName } = sourceConfig;
      const result = await localFolderConnector.readDataFile(folderPath, fileName, applicationId);

      if (result.error) {
        return {
          records: [],
          fileSize: 0,
          fileName,
          error: result.error,
        };
      }

      const fileSize = localFolderConnector.getFileSize(folderPath, fileName) || 0;
      return {
        records: result.records,
        fileSize,
        fileName,
      };
    } else if (sourceType === 'azure-blob') {
      // TODO: Implement Azure Blob reading
      const fileName = sourceConfig.blobName;
      return {
        records: [],
        fileSize: 0,
        fileName,
      };
    }

    throw new Error(`Unsupported source type: ${sourceType}`);
  }

  private async insertRecordsWithValidation(
    applicationId: string,
    connectionId: string,
    batchId: string,
    records: ParsedRecord[],
    sourceType: string
  ): Promise<number> {
    const validationErrors: string[] = [];
    const recordsToInsert: any[] = [];

    for (const record of records) {
      try {
        const processedRecord = {
          applicationId,
          connectionId,
          sourceType,
          recordData: record.data,
          lineNumber: record.lineNumber,
          batchId,
          fileName: '', // Will be set from batch context
          processedAt: new Date(),
          status: 'processed',
        };

        recordsToInsert.push(processedRecord);
      } catch (error: any) {
        validationErrors.push(`Line ${record.lineNumber}: ${error.message}`);
      }
    }

    if (recordsToInsert.length === 0) {
      throw new Error('No valid records to insert after validation');
    }

    // Batch insert with retry logic
    const inserted = await RawDataRecord.insertMany(recordsToInsert, { ordered: false });

    logger.info(
      `[BatchProcessingService] Successfully inserted ${inserted.length} records for batch ${batchId}`
    );

    return inserted.length;
  }

  private async createBatchProcess(
    applicationId: string,
    connectionId: string,
    batchId: string,
    sourceType: 'local-folder' | 'azure-blob',
    sourceConfig: any
  ): Promise<IBatchProcess> {
    const batchProcess = new BatchProcess({
      applicationId,
      connectionId,
      batchId,
      sourceType,
      status: 'pending',
      progress: {
        totalRecords: 0,
        processedRecords: 0,
        failedRecords: 0,
        currentStep: 'Initializing',
      },
      metadata: {
        fileName: sourceConfig.fileName || sourceConfig.blobName || '',
        recordCount: 0,
        duplicateRecordsRemoved: 0,
        validationErrors: [],
        ...(sourceType === 'local-folder' && { folderPath: sourceConfig.folderPath }),
        ...(sourceType === 'azure-blob' && { containerName: sourceConfig.containerName }),
      },
      timestamps: {
        startedAt: new Date(),
      },
    });

    await batchProcess.save();
    logger.info(`[BatchProcessingService] Created batch process ${batchId}`);
    return batchProcess;
  }

  private async updateBatchStatus(
    batchId: string,
    status: string,
    currentStep: string
  ): Promise<IBatchProcess> {
    const updated = await BatchProcess.findOneAndUpdate(
      { batchId },
      {
        status,
        'progress.currentStep': currentStep,
      },
      { new: true }
    );

    if (!updated) {
      throw new Error(`Batch ${batchId} not found`);
    }

    return updated;
  }

  async getBatchStatus(batchId: string): Promise<IBatchProcess | null> {
    return BatchProcess.findOne({ batchId });
  }

  async getApplicationBatches(applicationId: string, limit: number = 10): Promise<IBatchProcess[]> {
    return BatchProcess.find({ applicationId }).sort({ createdAt: -1 }).limit(limit);
  }
}

export const batchProcessingService = new BatchProcessingService();
