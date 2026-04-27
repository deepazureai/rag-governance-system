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

      // Phase 2: Save raw data records with timing fields
      logger.info(`[BatchProcessingService] Phase 2: Saving raw data records with timing and token metrics`);
      const RawDataCollection = mongoose.connection.collection('rawdatarecords');
      
      logger.info(`[BatchProcessingService] Processing ${records.length} records for batch ${batchId}`);
      logger.info(`[BatchProcessingService] First record data keys:`, Object.keys(records[0]?.data || {}));
      
      const rawRecords = records.map((record: ParsedRecord, index: number) => {
        // Extract timing fields from record data
        const promptTimestamp = record.data.promptTimestamp ? new Date(record.data.promptTimestamp) : new Date();
        const contextRetrievalStartTime = record.data.contextRetrievalStartTime ? new Date(record.data.contextRetrievalStartTime) : null;
        const contextRetrievalEndTime = record.data.contextRetrievalEndTime ? new Date(record.data.contextRetrievalEndTime) : null;
        const llmRequestStartTime = record.data.llmRequestStartTime ? new Date(record.data.llmRequestStartTime) : null;
        const llmResponseEndTime = record.data.llmResponseEndTime ? new Date(record.data.llmResponseEndTime) : null;

        // Calculate latencies in milliseconds
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

        // Extract token counts (from CSV or estimate from word count)
        let promptTokenCount = record.data.promptTokenCount;
        let responseTokenCount = record.data.responseTokenCount;
        let totalTokenCount = record.data.totalTokenCount;

        // If token counts not provided, estimate from word count (average 1.3 tokens per word)
        if (!promptTokenCount && record.data.promptLengthWords) {
          promptTokenCount = Math.ceil(record.data.promptLengthWords / 0.75);
        }
        if (!responseTokenCount && record.data.responseLengthWords) {
          responseTokenCount = Math.ceil(record.data.responseLengthWords / 0.75);
        }
        if (!totalTokenCount && promptTokenCount && responseTokenCount) {
          totalTokenCount = promptTokenCount + responseTokenCount;
        }

        return {
          applicationId,
          connectionId,
          sourceType,
          batchId,
          recordData: record.data,
          lineNumber: record.lineNumber,
          fileName,
          
          // Core data
          query: record.data.query,
          response: record.data.response,
          context: record.data.context,
          
          // Timing fields
          promptTimestamp,
          contextRetrievalStartTime,
          contextRetrievalEndTime,
          llmRequestStartTime,
          llmResponseEndTime,
          
          // Calculated latencies (milliseconds)
          retrievalLatencyMs,
          llmLatencyMs,
          totalLatencyMs,
          
          // Token metrics
          promptTokenCount,
          responseTokenCount,
          totalTokenCount,
          
          // Status
          status: 'processed',
          processedAt: new Date(),
        };
      });

      const insertedRaw = await RawDataCollection.insertMany(rawRecords);
      logger.info(`[BatchProcessingService] Inserted ${insertedRaw.insertedCount} raw records with timing and token data`);

      // Phase 3: Evaluate with Multi-Framework Approach
      logger.info(`[BatchProcessingService] Phase 3: Evaluating records with multi-framework approach (RAGAS, BLEU/ROUGE, LlamaIndex)`);
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      
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
          
          // Evaluate with multi-framework approach
          logger.info(`[BatchProcessingService] Evaluating record ${evaluatedCount + 1}/${records.length}`);
          const { frameworkResults, mappedMetrics } = await MultiFrameworkEvaluator.evaluateMultiFramework(
            query,
            response,
            retrievedDocuments
          );
          
          // Create evaluation record with framework results and mapped metrics
          const evaluationRecord = {
            applicationId,
            connectionId,
            batchId,
            recordData: record.data,
            query,
            response,
            retrievedDocuments,
            
            // Store raw framework results for transparency
            frameworksUsed: frameworkResults.map(r => r.framework),
            rawFrameworkResults: frameworkResults,
            
            // Store final mapped metrics
            evaluation: {
              // Dashboard metrics (what's shown in dashboard)
              groundedness: mappedMetrics.groundedness,
              coherence: mappedMetrics.coherence,
              relevance: mappedMetrics.relevance,
              faithfulness: mappedMetrics.faithfulness,
              answerRelevancy: mappedMetrics.answerRelevancy,
              contextPrecision: mappedMetrics.contextPrecision,
              contextRecall: mappedMetrics.contextRecall,
              overallScore: mappedMetrics.overallScore,
              
              // Raw metrics from each framework for governance page
              rawMetrics: mappedMetrics,
            },
            
            evaluatedAt: new Date(),
            status: 'completed',
          };
          
          await EvaluationCollection.insertOne(evaluationRecord);
          evaluatedCount++;
          
          logger.info(`[BatchProcessingService] Record ${evaluatedCount} evaluated successfully`);
        } catch (evalError: any) {
          logger.error(`[BatchProcessingService] Evaluation failed for record:`, evalError.message);
          // Continue with next record even if one fails
        }
      }

      logger.info(`[BatchProcessingService] Evaluated ${evaluatedCount}/${records.length} records successfully`);

      // Phase 4: Calculate AI Activity Governance Metrics
      logger.info(`[BatchProcessingService] Phase 4: Calculating AI Activity Governance metrics (latency, tokens, cost, errors)`);
      try {
        const governanceMetrics = await AIActivityGovernanceService.calculateAIActivityMetrics(applicationId);
        
        // Store governance metrics in governancemetrics collection
        const GovernanceCollection = mongoose.connection.collection('governancemetrics');
        await GovernanceCollection.updateOne(
          { applicationId, batchId },
          {
            $set: {
              ...governanceMetrics,
              applicationId,
              batchId,
              calculatedAt: new Date(),
            }
          },
          { upsert: true }
        );

      logger.info(`[BatchProcessingService] Governance metrics calculated and stored`, {
        p95Latency: governanceMetrics.latency.total.p95,
        avgTokens: governanceMetrics.tokens.totalTokens.avg,
        errorRate: governanceMetrics.errors.errorRate,
      });
    } catch (govError: any) {
      logger.warn(`[BatchProcessingService] Governance metrics calculation failed (non-critical):`, govError.message);
      // Don't fail the batch if governance calculation fails
    }

    // Phase 5: Generate Alerts (Both Evaluation Quality and Performance Alerts)
    logger.info(`[BatchProcessingService] Phase 5: Generating alerts from evaluation and governance metrics`);
    try {
      const AlertsCollection = mongoose.connection.collection('alerts');
      
      // Get all evaluations for this batch to generate quality alerts
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      const evaluations = await EvaluationCollection.find({ batchId }).toArray();

      // Generate evaluation quality alerts (groundedness, coherence, relevance, etc.)
      if (evaluations.length > 0) {
        logger.info(`[BatchProcessingService] Generating evaluation quality alerts for ${evaluations.length} records`);
        const qualityAlerts = await AlertGenerationService.generateAlertsForBatch(
          applicationId,
          evaluations,
          AlertsCollection as any
        );
        logger.info(`[BatchProcessingService] Generated ${qualityAlerts.length} evaluation quality alerts`);
      }

      // Generate performance alerts (latency, cost, errors, trends)
      try {
        const governanceMetrics = await AIActivityGovernanceService.calculateAIActivityMetrics(applicationId);
        logger.info(`[BatchProcessingService] Generating performance alerts based on governance metrics`);
        const performanceAlerts = await AlertGenerationService.generatePerformanceAlerts(
          applicationId,
          governanceMetrics,
          {
            metrics: {},
            overallScoreThresholds: { good: 70, excellent: 85 }
          },
          AlertsCollection as any
        );
        logger.info(`[BatchProcessingService] Generated ${performanceAlerts.length} performance alerts`);
      } catch (perfError: any) {
        logger.warn(`[BatchProcessingService] Performance alerts generation failed (non-critical):`, perfError.message);
      }

      logger.info(`[BatchProcessingService] Alert generation completed`);
    } catch (alertError: any) {
      logger.error(`[BatchProcessingService] Error generating alerts:`, alertError.message);
      // Don't fail the batch if alert generation fails
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
    // Try local folder first if sourceConfig is provided
    if ((sourceType === 'local_folder' || sourceType === 'local-folder') && sourceConfig?.folderPath) {
      logger.info(`[BatchProcessingService] Reading from local folder: ${sourceConfig.folderPath}`);
      const connector = new LocalFolderConnector({ folderPath: sourceConfig.folderPath });
      
      const result = await connector.readDataFile(sourceConfig.folderPath, sourceConfig.fileName, applicationId);

      if (result.error) {
        logger.warn(`[BatchProcessingService] Local folder read failed, falling back to MongoDB`);
        // Fall through to MongoDB if local file doesn't exist
      } else {
        const fileSize = connector.getFileSize(sourceConfig.folderPath, sourceConfig.fileName) || 0;
        return {
          records: result.records,
          fileSize,
          fileName: sourceConfig.fileName,
        };
      }
    }

    // Default: Read from MongoDB rawdatarecords collection
    logger.info(`[BatchProcessingService] Reading from MongoDB rawdatarecords collection for app ${applicationId}`);
    
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
    const records: ParsedRecord[] = rawDataRecords.map((record: any, index: number) => {
      // Extract core data fields - support multiple naming conventions
      const userPrompt = record.userPrompt || record.user_prompt || record.prompt || record.query || '';
      const llmResponse = record.llmResponse || record.llm_response || record.response || '';
      const context = record.context || record.retrieved_context || record.retrieved_documents || '';
      
      return {
        lineNumber: index + 1,
        validationErrors: [],
        data: {
          // User/Session data
          userId: record.userId || record.user_id || record.user || '',
          sessionId: record.sessionId || record.session_id || record.session || '',
          
          // Core content fields
          userPrompt,
          context,
          llmResponse,
          
          // Aliases for evaluation frameworks
          query: userPrompt,
          response: llmResponse,
          retrieved_documents: context ? 
            (Array.isArray(context) ? context : [{ content: context, source: 'mongodb' }]) 
            : [],
          
          // Timing fields
          promptTimestamp: record.promptTimestamp || new Date(),
          contextRetrievalStartTime: record.contextRetrievalStartTime,
          contextRetrievalEndTime: record.contextRetrievalEndTime,
          llmRequestStartTime: record.llmRequestStartTime,
          llmResponseEndTime: record.llmResponseEndTime,
          
          // Token/Length metrics
          contextChunkCount: record.contextChunkCount || 1,
          contextTotalLengthWords: record.contextTotalLengthWords || 0,
          promptLengthWords: record.promptLengthWords || 0,
          responseLengthWords: record.responseLengthWords || 0,
          promptTokenCount: record.promptTokenCount,
          responseTokenCount: record.responseTokenCount,
          totalTokenCount: record.totalTokenCount,
          
          // Status
          status: record.status || 'processed',
          
          // Include all original fields for flexibility
          ...record,
        },
      };
    });

    logger.info(`[BatchProcessingService] Read ${records.length} records from MongoDB rawdatarecords collection`);

    return {
      records,
      fileSize: records.length * 100, // Approximate size
      fileName: 'mongodb_rawdatarecords',
    };
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
