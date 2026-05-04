import express, { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { batchProcessingService } from '../services/BatchProcessingService.js';
import { scheduledBatchJobService } from '../services/ScheduledBatchJobService.js';
import { archiveService } from '../services/ArchiveService.js';
import { postgreSQLConnectorService } from '../services/PostgreSQLConnectorService.js';
import { logger } from '../utils/logger.js';
import { getStringParam, getNumberParam } from '../utils/paramParser.js';
import mongoose from 'mongoose';

export function createBatchProcessingRouter(): Router {
  const router = express.Router();

  /**
   * POST /api/batch/validate-file
   * Validate that a file exists at the given path
   */
  router.post('/validate-file', async (req: Request, res: Response) => {
    try {
      const { folderPath, fileName } = req.body;

      if (!folderPath || !fileName) {
        return res.status(400).json({
          success: false,
          message: 'folderPath and fileName are required',
        });
      }

      logger.info(`[BatchAPI] Validating file: ${folderPath}/${fileName}`);

      // Just validate the input format for now
      // Full validation will happen during batch execution
      if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
        return res.status(400).json({
          success: false,
          message: 'File must be .csv or .txt format',
        });
      }

      res.json({
        success: true,
        message: 'File path validated successfully',
        path: `${folderPath}/${fileName}`,
      });
    } catch (error: any) {
      logger.error(`[BatchAPI] File validation error:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'File validation failed',
      });
    }
  });

  /**
   * POST /api/batch/database/execute
   * Execute batch processing from a database source (PostgreSQL)
   * Body: { applicationId, dataSourceId, sourceType }
   */
  router.post('/database/execute', async (req: Request, res: Response) => {
    try {
      const { applicationId, dataSourceId, sourceType } = req.body;

      if (!applicationId || !dataSourceId) {
        return res.status(400).json({
          success: false,
          message: 'applicationId and dataSourceId are required',
        });
      }

      logger.info('[BatchAPI-Database] Starting database batch process', {
        applicationId,
        dataSourceId,
        sourceType,
      });

      // 1. Fetch database connection config from dbconnections collection
      const DBConnectionsCollection = mongoose.connection.collection('dbconnections');
      const dbConnection: any = await DBConnectionsCollection.findOne({ id: dataSourceId });

      if (!dbConnection) {
        return res.status(404).json({
          success: false,
          message: `Database connection not found: ${dataSourceId}`,
        });
      }

      logger.info('[BatchAPI-Database] Database connection found', {
        connectionName: dbConnection.connectionName,
        sourceType: dbConnection.sourceType,
      });

      // 2. Verify source type is database
      if (dbConnection.sourceType !== 'postgresql' && dbConnection.sourceType !== 'mysql' && dbConnection.sourceType !== 'sql_server') {
        return res.status(400).json({
          success: false,
          message: `Unsupported database type: ${dbConnection.sourceType}`,
        });
      }

      // 3. For now, only support PostgreSQL
      if (dbConnection.sourceType !== 'postgresql') {
        return res.status(400).json({
          success: false,
          message: `Database type ${dbConnection.sourceType} not yet supported. Currently supporting PostgreSQL.`,
        });
      }

      // 4. Execute database batch process (returns immediately, runs async)
      const result = await postgreSQLConnectorService.fetchAndInsertData(
        applicationId,
        dataSourceId,
        dbConnection.config,
        dbConnection.columnMapping
      );

      logger.info('[BatchAPI-Database] Database batch process completed', result);

      // 5. Trigger evaluation pipeline
      logger.info('[BatchAPI-Database] Triggering evaluation pipeline for batchId:', result.batchId);
      try {
        await batchProcessingService.triggerEvaluationPipeline(applicationId, result.batchId);
      } catch (pipelineError: any) {
        logger.error('[BatchAPI-Database] Error triggering evaluation pipeline:', pipelineError.message);
        // Don't fail the response - data was successfully fetched and inserted
      }

      res.json({
        success: true,
        message: 'Database batch processing started',
        batchId: result.batchId,
        stats: {
          totalRecords: result.totalRecords,
          insertedRecords: result.insertedRecords,
          failedRecords: result.failedRecords,
          successRate: `${((result.insertedRecords / result.totalRecords) * 100).toFixed(2)}%`,
        },
      });
    } catch (error: any) {
      logger.error('[BatchAPI-Database] Batch processing error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Database batch processing failed',
      });
    }
  });

  /**
   * POST /api/batch/database/test-connection
   * Test PostgreSQL connection before batch processing
   * Body: { dataSourceId }
   */
  router.post('/database/test-connection', async (req: Request, res: Response) => {
    try {
      const { dataSourceId } = req.body;

      if (!dataSourceId) {
        return res.status(400).json({
          success: false,
          message: 'dataSourceId is required',
        });
      }

      // Fetch database connection config
      const DBConnectionsCollection = mongoose.connection.collection('dbconnections');
      const dbConnection: any = await DBConnectionsCollection.findOne({ id: dataSourceId });

      if (!dbConnection) {
        return res.status(404).json({
          success: false,
          message: `Database connection not found: ${dataSourceId}`,
        });
      }

      if (dbConnection.sourceType !== 'postgresql') {
        return res.status(400).json({
          success: false,
          message: `Database type ${dbConnection.sourceType} not yet supported`,
        });
      }

      // Test connection
      const testResult = await postgreSQLConnectorService.testConnection(dbConnection.config);

      if (!testResult.success) {
        return res.status(400).json({
          success: false,
          message: testResult.message,
        });
      }

      res.json({
        success: true,
        message: testResult.message,
      });
    } catch (error: any) {
      logger.error('[BatchAPI-Database] Connection test error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Connection test failed',
      });
    }
  });
  router.get('/application/:applicationId/history', async (req: Request, res: Response) => {
    try {
      const applicationId = getStringParam(req.params.applicationId);
      if (!applicationId) {
        return res.status(400).json({
          success: false,
          message: 'applicationId is required',
        });
      }
      const limit = getNumberParam(req.query.limit, 10);

      const batches = await batchProcessingService.getApplicationBatches(applicationId, limit);

      res.json({
        success: true,
        batches,
        count: batches.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /api/batch/schedule/application/:applicationId
   * Get all scheduled jobs for an application - MUST come BEFORE /schedule/:jobId routes
   */
  router.get('/schedule/application/:applicationId', async (req: Request, res: Response) => {
    try {
      const applicationId = getStringParam(req.params.applicationId);

      if (!applicationId) {
        return res.status(400).json({
          success: false,
          message: 'applicationId is required',
        });
      }

      const jobs = await scheduledBatchJobService.getApplicationScheduledJobs(applicationId);

      res.json({
        success: true,
        jobs,
        count: jobs.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * POST /api/batch/execute
   * Manually execute batch processing for an application
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { applicationId, connectionId, sourceType, sourceConfig } = req.body;

      if (!applicationId) {
        return res.status(400).json({
          success: false,
          message: 'applicationId is required',
        });
      }

      logger.info(`[BatchAPI] Starting batch execution for app ${applicationId}`);

      const batchProcess = await batchProcessingService.executeBatchProcess(
        applicationId,
        connectionId,
        sourceType,
        sourceConfig
      );

      res.json({
        success: true,
        batchProcess,
      });
    } catch (error: any) {
      logger.error(`[BatchAPI] Batch execution error:`, error);
      res.status(500).json({
        success: false,
        message: error.message || 'Batch execution failed',
        code: 'BATCH_EXECUTION_ERROR',
      });
    }
  });

  /**
   * GET /api/batch/:batchId/status
   * Get status of a batch process - LESS SPECIFIC, comes after /application/... routes
   */
  router.get('/:batchId/status', async (req: Request, res: Response) => {
    try {
      const batchId = getStringParam(req.params.batchId);

      if (!batchId) {
        return res.status(400).json({
          success: false,
          message: 'batchId is required',
        });
      }

      const batch = await batchProcessingService.getBatchStatus(batchId);

      if (!batch) {
        return res.status(404).json({
          success: false,
          message: `Batch ${batchId} not found`,
        });
      }

      res.json({
        success: true,
        batch,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /api/batch/schedule/:jobId
   * Get a scheduled job
   */
  router.get('/schedule/:jobId', async (req: Request, res: Response) => {
    try {
      const jobId = getStringParam(req.params.jobId);

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const job = await scheduledBatchJobService.getScheduledJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          message: `Job ${jobId} not found`,
        });
      }

      res.json({
        success: true,
        job,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /api/batch/schedule/application/:applicationId (DUPLICATE - removed)
   * This route was moved to the top to prevent conflicts with /schedule/:jobId
   */

  /**
   * PUT /api/batch/schedule/:jobId
   * Update a scheduled job
   */
  router.put('/schedule/:jobId', async (req: Request, res: Response) => {
    try {
      const jobId = getStringParam(req.params.jobId);

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const updates = req.body;

      const job = await scheduledBatchJobService.updateScheduledJob(jobId, updates);

      res.json({
        success: true,
        job,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * PATCH /api/batch/schedule/:jobId/toggle
   * Enable/disable a scheduled job
   */
  router.patch('/schedule/:jobId/toggle', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const { isEnabled } = req.body;

      const job = await scheduledBatchJobService.toggleScheduledJob(jobId, isEnabled);

      res.json({
        success: true,
        job,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * DELETE /api/batch/schedule/:jobId
   * Delete a scheduled job
   */
  router.delete('/schedule/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const deleted = await scheduledBatchJobService.deleteScheduledJob(jobId);

      res.json({
        success: deleted,
        message: deleted ? 'Job deleted' : 'Job not found',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * POST /api/batch/schedule/:jobId/trigger
   * Manually trigger a scheduled job
   */
  router.post('/schedule/:jobId/trigger', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      if (!jobId) {
        return res.status(400).json({
          success: false,
          message: 'jobId is required',
        });
      }

      const success = await scheduledBatchJobService.triggerBatchJobNow(jobId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: `Job ${jobId} not found or trigger failed`,
        });
      }

      res.json({
        success: true,
        message: 'Batch job triggered successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /api/batch/archive/:archiveId
   * Get archive data
   */
  router.get('/archive/:archiveId', async (req: Request, res: Response) => {
    try {
      const archiveId = getStringParam(req.params.archiveId);

      if (!archiveId) {
        return res.status(400).json({
          success: false,
          message: 'archiveId is required',
        });
      }

      const data = await archiveService.getArchiveData(archiveId);

      if (!data) {
        return res.status(404).json({
          success: false,
          message: `Archive ${archiveId} not found`,
        });
      }

      res.json({
        success: true,
        data,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * GET /api/batch/archive/application/:applicationId
   * Get archives for an application
   */
  router.get('/archive/application/:applicationId', async (req: Request, res: Response) => {
    try {
      const applicationId = getStringParam(req.params.applicationId);
      if (!applicationId) {
        return res.status(400).json({
          success: false,
          message: 'applicationId is required',
        });
      }
      const limit = getNumberParam(req.query.limit, 30);

      const archives = await archiveService.getApplicationArchives(applicationId, limit);

      res.json({
        success: true,
        archives,
        count: archives.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  /**
   * POST /api/batch/cleanup
   * Cleanup expired archives
   */
  router.post('/cleanup', async (req: Request, res: Response) => {
    try {
      const deleted = await archiveService.cleanupExpiredArchives();

      res.json({
        success: true,
        message: `Cleaned up ${deleted} expired archives`,
        deletedCount: deleted,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  return router;
}

export const batchProcessingRouter = createBatchProcessingRouter();
