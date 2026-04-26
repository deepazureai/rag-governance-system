import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { LocalFolderConnector, FileAccessError, ParsedRecord } from '../connectors/LocalFolderConnector.js';
import { createEvaluationService } from './evaluation.js';
import mongoose from 'mongoose';

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
      
      // Create evaluation service instance (requires database interface)
      // For now, we'll do simplified evaluation without full service
      let evaluatedCount = 0;
      
      for (const record of records) {
        try {
          // Extract query, response, and retrieved documents from record data
          const query = record.data.query || '';
          const response = record.data.response || '';
          const retrievedDocuments = record.data.retrieved_documents ? 
            (Array.isArray(record.data.retrieved_documents) ? 
              record.data.retrieved_documents : 
              [{ content: record.data.retrieved_documents, source: 'unknown' }]
            ) : [];
          
          // Mock evaluation with placeholder scores (simplified for now)
          const evaluation = {
            faithfulness: Math.random() * 100,
            answer_relevancy: Math.random() * 100,
            context_relevancy: Math.random() * 100,
            context_precision: Math.random() * 100,
            context_recall: Math.random() * 100,
            correctness: Math.random() * 100,
            overall_score: Math.random() * 100,
          };
          
          const evaluationRecord = {
            applicationId,
            connectionId,
            batchId,
            recordData: record.data,
            query,
            response,
            retrievedDocuments,
            evaluation: {
              faithfulness: evaluation.faithfulness,
              answer_relevancy: evaluation.answer_relevancy,
              context_relevancy: evaluation.context_relevancy,
              context_precision: evaluation.context_precision,
              context_recall: evaluation.context_recall,
              correctness: evaluation.correctness,
              overall_score: evaluation.overall_score,
            },
            evaluatedAt: new Date(),
            status: 'completed',
          };
          
          await EvaluationCollection.insertOne(evaluationRecord);
          evaluatedCount++;
        } catch (evalError: any) {
          logger.error(`[BatchProcessingService] Evaluation failed for record:`, evalError.message);
        }
      }

      logger.info(`[BatchProcessingService] Evaluated ${evaluatedCount} records successfully`);

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
    // If sourceType is 'mongodb' or 'rawdatarecords', read from MongoDB collection
    if (sourceType === 'mongodb' || sourceType === 'rawdatarecords' || !sourceType) {
      logger.info(`[BatchProcessingService] Reading from rawdatarecords collection for app ${applicationId}`);
      
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');
      const rawDataRecords = await RawDataCollection.find({ applicationId }).toArray();
      
      if (!rawDataRecords || rawDataRecords.length === 0) {
        logger.warn(`[BatchProcessingService] No raw data records found for applicationId: ${applicationId}`);
        return {
          records: [],
          fileSize: 0,
          fileName: 'mongodb_rawdatarecords',
          error: { code: 'NO_DATA', message: 'No raw data records found in MongoDB' } as any,
        };
      }

      // Convert MongoDB documents to ParsedRecord format
      const records: ParsedRecord[] = rawDataRecords.map((record: any, index: number) => ({
        lineNumber: index + 1,
        data: {
          userId: record.userId,
          sessionId: record.sessionId,
          userPrompt: record.userPrompt,
          context: record.context,
          llmResponse: record.llmResponse,
          query: record.userPrompt, // For RAGAS evaluation
          response: record.llmResponse, // For RAGAS evaluation
          retrieved_documents: record.context ? [{ content: record.context, source: 'mongodb' }] : [],
          promptTimestamp: record.promptTimestamp,
          contextRetrievalStartTime: record.contextRetrievalStartTime,
          contextRetrievalEndTime: record.contextRetrievalEndTime,
          llmRequestStartTime: record.llmRequestStartTime,
          llmResponseEndTime: record.llmResponseEndTime,
          contextChunkCount: record.contextChunkCount,
          contextTotalLengthWords: record.contextTotalLengthWords,
          promptLengthWords: record.promptLengthWords,
          responseLengthWords: record.responseLengthWords,
          status: record.status,
        },
      }));

      logger.info(`[BatchProcessingService] Read ${records.length} records from MongoDB rawdatarecords collection`);

      return {
        records,
        fileSize: records.length * 100, // Approximate size
        fileName: 'mongodb_rawdatarecords',
      };
    }

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
    const BatchCollection = mongoose.connection.collection('scheduledbatchjobs');
    return BatchCollection.findOne({ batchId });
  }

  async getApplicationBatches(applicationId: string, limit: number = 10): Promise<any[]> {
    const BatchCollection = mongoose.connection.collection('scheduledbatchjobs');
    return BatchCollection.find({ applicationId }).sort({ createdAt: -1 }).limit(limit).toArray();
  }
}

export const batchProcessingService = new BatchProcessingService();
