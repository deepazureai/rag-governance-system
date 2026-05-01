import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { LocalFolderConnector, FileAccessError, ParsedRecord } from '../connectors/LocalFolderConnector.js';
import { createEvaluationService } from './evaluation.js';
import MultiFrameworkEvaluator, { FrameworkResult, EvaluationMetrics } from './MultiFrameworkEvaluator.js';
import AIActivityGovernanceService from './AIActivityGovernanceService.js';
import { AlertGenerationService } from './AlertGenerationService.js';
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
      logger.info(`[BatchProcessingService] Phase 2: Saving raw data records with timing and token metrics`);
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');
      
      const rawRecords = records.map((record: ParsedRecord) => {
        const promptTimestamp = record.data.promptTimestamp ? new Date(record.data.promptTimestamp) : new Date();
        const contextRetrievalStartTime = record.data.contextRetrievalStartTime ? new Date(record.data.contextRetrievalStartTime) : null;
        const contextRetrievalEndTime = record.data.contextRetrievalEndTime ? new Date(record.data.contextRetrievalEndTime) : null;
        const llmRequestStartTime = record.data.llmRequestStartTime ? new Date(record.data.llmRequestStartTime) : null;
        const llmResponseEndTime = record.data.llmResponseEndTime ? new Date(record.data.llmResponseEndTime) : null;

        let retrievalLatencyMs = 0;
        if (contextRetrievalStartTime && contextRetrievalEndTime) {
          retrievalLatencyMs = contextRetrievalEndTime.getTime() - contextRetrievalStartTime.getTime();
        }

        let llmLatencyMs = 0;
        if (llmRequestStartTime && llmResponseEndTime) {
          llmLatencyMs = llmResponseEndTime.getTime() - llmRequestStartTime.getTime();
        }

        let totalLatencyMs = 0;
        if (llmResponseEndTime) {
          totalLatencyMs = llmResponseEndTime.getTime() - promptTimestamp.getTime();
        }

        let promptTokenCount = record.data.promptTokenCount;
        let responseTokenCount = record.data.responseTokenCount;
        let totalTokenCount = record.data.totalTokenCount;

        if (!promptTokenCount && record.data.promptLengthWords) {
          promptTokenCount = Math.ceil(record.data.promptLengthWords / 0.75);
        }
        if (!responseTokenCount && record.data.responseLengthWords) {
          responseTokenCount = Math.ceil(record.data.responseLengthWords / 0.75);
        }
        if (!totalTokenCount && promptTokenCount && responseTokenCount) {
          totalTokenCount = (promptTokenCount as number) + (responseTokenCount as number);
        }

        return {
          applicationId,
          connectionId,
          sourceType,
          batchId,
          recordData: record.data,
          lineNumber: record.lineNumber,
          fileName,
          query: record.data.query || record.data.userPrompt || '',
          response: record.data.response || record.data.llmResponse || '',
          context: record.data.context || '',
          promptTimestamp,
          contextRetrievalStartTime,
          contextRetrievalEndTime,
          llmRequestStartTime,
          llmResponseEndTime,
          retrievalLatencyMs,
          llmLatencyMs,
          totalLatencyMs,
          promptTokenCount,
          responseTokenCount,
          totalTokenCount,
          status: 'processed',
          processedAt: new Date(),
        };
      });

      await RawDataCollection.insertMany(rawRecords);

      // Phase 3: Evaluate
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      let evaluatedCount = 0;
      
      for (const record of records) {
        try {
          const query = (record.data.userPrompt || record.data.query || '') as string;
          const response = (record.data.llmResponse || record.data.response || '') as string;
          
          let retrievedDocuments: Array<{ content: string; source: string; relevance?: number }> = [];
          
          if (record.data.retrieved_documents && Array.isArray(record.data.retrieved_documents)) {
            retrievedDocuments = record.data.retrieved_documents;
          } else if (record.data.context) {
            retrievedDocuments = [{ content: record.data.context, source: 'query_context', relevance: 85 }];
          }
          
          const { frameworkResults, mappedMetrics } = await MultiFrameworkEvaluator.evaluateMultiFramework(
            query,
            response,
            retrievedDocuments
          );
          
          const evaluationRecord = {
            applicationId,
            connectionId,
            batchId,
            recordData: record.data,
            query,
            response,
            retrievedDocuments,
            frameworksUsed: frameworkResults.map(r => r.framework),
            rawFrameworkResults: frameworkResults,
            ...mappedMetrics,
            evaluation: { ...mappedMetrics, rawMetrics: mappedMetrics },
            evaluatedAt: new Date(),
            status: 'completed',
          };
          
          await EvaluationCollection.insertOne(evaluationRecord);
          evaluatedCount++;
        } catch (evalError: unknown) {
          logger.error(`[BatchProcessingService] Evaluation failed:`, evalError instanceof Error ? evalError.message : String(evalError));
        }
      }

      // Phase 4: Governance
      try {
        const governanceMetrics = await AIActivityGovernanceService.calculateAIActivityMetrics(applicationId);
        const GovernanceCollection = mongoose.connection.collection('governancemetrics');
        await GovernanceCollection.updateOne(
          { applicationId, batchId },
          { $set: { ...governanceMetrics, applicationId, batchId, calculatedAt: new Date() } },
          { upsert: true }
        );
      } catch (govError: unknown) {
        logger.warn(`[BatchProcessingService] Governance metrics failed:`, govError instanceof Error ? govError.message : String(govError));
      }

      // Phase 5: Generate Alerts from Batch Evaluation
      try {
        logger.info(`[BatchProcessingService] Phase 5: Generating alerts for batch ${batchId}`);
        const { AlertIntegrationLayerService } = await import('./AlertIntegrationLayerService.js');
        
        // Fetch evaluated records from the collection
        const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
        const evaluations = await EvaluationCollection.find({ applicationId, batchId }).toArray();
        
        if (evaluations.length > 0) {
          const alertResult = await AlertIntegrationLayerService.generateAlertsFromBatchEvaluation(
            applicationId,
            evaluations
          );
          logger.info(`[BatchProcessingService] Batch alerts generated - Total: ${alertResult.alertsGenerated}, Critical: ${alertResult.criticalAlerts}`);
        } else {
          logger.info(`[BatchProcessingService] No evaluations found for batch ${batchId}`);
        }
      } catch (alertError: unknown) {
        const alertErrorMsg = alertError instanceof Error ? alertError.message : String(alertError);
        logger.error(`[BatchProcessingService] Error generating batch alerts: ${alertErrorMsg}`);
        // Don't fail the batch processing if alerts fail - this is non-critical
      }

      // Update Application Master Status
      const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
      await ApplicationMasterCollection.updateOne(
        { id: applicationId },
        { $set: { initialDataProcessingStatus: 'completed', metricsCount: records.length, updatedAt: new Date() } }
      );

      return { batchId, status: 'completed', recordsProcessed: records.length, completedAt: new Date() };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[BatchProcessingService] Batch process failed:`, errorMessage);

      const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
      await ApplicationMasterCollection.updateOne(
        { id: applicationId },
        { $set: { initialDataProcessingStatus: 'failed', error: errorMessage, updatedAt: new Date() } }
      ).catch(() => {});

      throw error;
    }
  }

  private async readDataFromSource(
    sourceType: string,
    sourceConfig: Record<string, any>,
    applicationId: string
  ): Promise<{ records: ParsedRecord[]; fileSize: number; fileName: string; error?: FileAccessError; }> {
    
    const folderPath = sourceConfig?.folderPath as string | undefined;
    const fileName = sourceConfig?.fileName as string | undefined;
    
    if ((sourceType === 'local_folder' || sourceType === 'local-folder') && folderPath) {
      const connector = new LocalFolderConnector({ folderPath });
      const result = await connector.readDataFile(folderPath, fileName || '', applicationId);

      if (!result.error) {
        return {
          records: result.records,
          fileSize: connector.getFileSize(folderPath, fileName || '') || 0,
          fileName: fileName || 'local_file',
        };
      }
      logger.warn(`[BatchProcessingService] Local folder read failed, falling back to MongoDB`);
    }

    // Default Fallback: MongoDB Read
    const RawDataCollection = mongoose.connection.collection('rawdatarecords');
    const rawDataRecords = await RawDataCollection.find({ applicationId }).toArray();
    
    if (!rawDataRecords || rawDataRecords.length === 0) {
      return {
        records: [], fileSize: 0, fileName: 'mongodb_rawdatarecords',
        error: { code: 'NO_DATA', message: 'No records found', phase: 'data_read', timestamp: new Date() }
      };
    }

    const records: ParsedRecord[] = rawDataRecords.map((record, index) => {
      const userPrompt = (record.userPrompt || record.query || '') as string;
      const llmResponse = (record.llmResponse || record.response || '') as string;
      const context = (record.context || '') as string;
      
      return {
        lineNumber: index + 1,
        validationErrors: [],
        data: {
          ...record,
          userPrompt, context, llmResponse, query: userPrompt, response: llmResponse,
          retrieved_documents: context ? [{ content: context, source: 'mongodb' }] : [],
          promptTimestamp: record.promptTimestamp || new Date(),
        },
      };
    });

    return { records, fileSize: records.length * 100, fileName: 'mongodb_rawdatarecords' };
  }

  async getBatchStatus(batchId: string): Promise<any | null> {
    return mongoose.connection.collection('scheduledbatchjobs').findOne({ batchId });
  }

  async getApplicationBatches(applicationId: string, limit: number = 10): Promise<any[]> {
    return mongoose.connection.collection('scheduledbatchjobs').find({ applicationId }).sort({ createdAt: -1 }).limit(limit).toArray();
  }
}

export const batchProcessingService = new BatchProcessingService();
