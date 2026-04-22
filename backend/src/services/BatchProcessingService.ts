import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { LocalFolderConnector, FileAccessError, ParsedRecord } from '../connectors/LocalFolderConnector';
import { evaluateWithRagas } from './evaluation';

export class BatchProcessingService {
  /**
   * Execute complete batch process: read file → evaluate → save results
   */
  async executeBatchProcess(
    applicationId: string,
    connectionId: string,
    sourceType: string,
    sourceConfig: any
  ): Promise<any> {
    const batchId = uuidv4();
    const startTime = new Date();
    const mongoose = require('mongoose');

    logger.info(`[BatchProcessingService] Starting batch process ${batchId} for app ${applicationId}`);

    try {
      // Phase 1: Read Data
      logger.info(`[BatchProcessingService] Phase 1: Reading data from ${sourceType}`);
      const { records, fileSize, fileName, error: readError } = await this.readDataFromSource(
        sourceType,
        sourceConfig,
        applicationId
      );

      if (readError || !records || records.length === 0) {
        logger.error(`[BatchProcessingService] Failed to read data:`, readError?.message || 'No records found');
        throw new Error(`File read failed: ${readError?.message || 'No records found'}`);
      }

      logger.info(`[BatchProcessingService] Read ${records.length} records from ${fileName}`);

      // Phase 2: Save raw data records
      logger.info(`[BatchProcessingService] Phase 2: Saving raw data records`);
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');
      const rawRecords = records.map((record: ParsedRecord, index: number) => ({
        applicationId,
        connectionId,
        sourceType,
        batchId,
        recordData: record.data,
        lineNumber: record.lineNumber,
        fileName,
        processedAt: new Date(),
        status: 'processed',
      }));

      const insertedRaw = await RawDataCollection.insertMany(rawRecords);
      logger.info(`[BatchProcessingService] Inserted ${insertedRaw.insertedCount} raw records`);

      // Phase 3: Evaluate with RAGAS
      logger.info(`[BatchProcessingService] Phase 3: Evaluating records with RAGAS`);
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      
      for (const record of records) {
        try {
          const evaluation = await evaluateWithRagas(record.data);
          
          const evaluationRecord = {
            applicationId,
            connectionId,
            batchId,
            recordData: record.data,
            evaluation: {
              faithfulness: evaluation.faithfulness || 0,
              answer_relevancy: evaluation.answer_relevancy || 0,
              context_relevancy: evaluation.context_relevancy || 0,
              context_precision: evaluation.context_precision || 0,
              context_recall: evaluation.context_recall || 0,
              correctness: evaluation.correctness || 0,
              overall_score: evaluation.overall_score || 0,
            },
            evaluatedAt: new Date(),
            status: 'completed',
          };
          
          await EvaluationCollection.insertOne(evaluationRecord);
        } catch (evalError: any) {
          logger.error(`[BatchProcessingService] Evaluation failed for record:`, evalError.message);
        }
      }

      logger.info(`[BatchProcessingService] Batch ${batchId} completed successfully`);

      // Update application status
      const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
      await ApplicationMasterCollection.updateOne(
        { id: applicationId },
        { 
          $set: { 
            initialDataProcessingStatus: 'completed',
            metricsCount: records.length,
            updatedAt: new Date(),
          } 
        }
      );

      return {
        batchId,
        status: 'completed',
        recordsProcessed: records.length,
        completedAt: new Date(),
      };
    } catch (error: any) {
      logger.error(`[BatchProcessingService] Batch process failed:`, error);

      // Update application status to failed
      const mongoose = require('mongoose');
      const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
      await ApplicationMasterCollection.updateOne(
        { id: applicationId },
        { 
          $set: { 
            initialDataProcessingStatus: 'failed',
            error: error.message,
            updatedAt: new Date(),
          } 
        }
      ).catch((err: any) => logger.error('Failed to update app status:', err));

      throw error;
    }
  }

  private async readDataFromSource(
    sourceType: string,
    sourceConfig: any,
    applicationId: string
  ): Promise<{
    records: ParsedRecord[];
    fileSize: number;
    fileName: string;
    error?: FileAccessError;
  }> {
    if (sourceType === 'local_folder') {
      const { folderPath, fileName } = sourceConfig;
      const connector = new LocalFolderConnector({ folderPath });
      
      const result = await connector.readDataFile(folderPath, fileName, applicationId);

      if (result.error) {
        return {
          records: [],
          fileSize: 0,
          fileName,
          error: result.error,
        };
      }

      const fileSize = connector.getFileSize(folderPath, fileName) || 0;
      return {
        records: result.records,
        fileSize,
        fileName,
      };
    }

    throw new Error(`Unsupported source type: ${sourceType}`);
  }

  async getBatchStatus(batchId: string): Promise<any> {
    const mongoose = require('mongoose');
    const BatchCollection = mongoose.connection.collection('scheduledbatchjobs');
    return BatchCollection.findOne({ batchId });
  }

  async getApplicationBatches(applicationId: string, limit: number = 10): Promise<any[]> {
    const mongoose = require('mongoose');
    const BatchCollection = mongoose.connection.collection('scheduledbatchjobs');
    return BatchCollection.find({ applicationId }).sort({ createdAt: -1 }).limit(limit).toArray();
  }
}

export const batchProcessingService = new BatchProcessingService();
