import express, { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { batchProcessingService } from '../services/BatchProcessingService';
import { scheduledBatchJobService } from '../services/ScheduledBatchJobService';
import { archiveService } from '../services/ArchiveService';
import { logger } from '../utils/logger';

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
          message: 'Missing folderPath or fileName',
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
   * POST /api/batch/execute
   * Manually execute batch processing for an application
   */
  router.post('/execute', async (req: Request, res: Response) => {
    try {
      const { applicationId, connectionId, sourceType, sourceConfig } = req.body;

      if (!applicationId || !connectionId || !sourceType || !sourceConfig) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
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
   * Get status of a batch process
   */
  router.get('/:batchId/status', async (req: Request, res: Response) => {
    try {
      const { batchId } = req.params;

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
   * GET /api/batch/application/:applicationId/history
   * Get batch history for an application
   */
  router.get('/application/:applicationId/history', async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;
      const limitParam = req.query.limit;
      const limit = typeof limitParam === 'string' ? parseInt(limitParam, 10) || 10 : 10;

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
   * POST /api/batch/schedule
   * Create a scheduled batch job
   */
  router.post('/schedule', async (req: Request, res: Response) => {
    try {
      const { applicationId, connectionId, schedule, sourceConfig } = req.body;

      if (!applicationId || !connectionId || !schedule) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
        });
      }

      const job = await scheduledBatchJobService.createScheduledJob(
        applicationId,
        connectionId,
        schedule,
        sourceConfig
      );

      res.json({
        success: true,
        job,
      });
    } catch (error: any) {
      logger.error(`[BatchAPI] Schedule creation error:`, error);
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
      const { jobId } = req.params;

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
   * GET /api/batch/schedule/application/:applicationId
   * Get all scheduled jobs for an application
   */
  router.get('/schedule/application/:applicationId', async (req: Request, res: Response) => {
    try {
      const { applicationId } = req.params;

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
   * PUT /api/batch/schedule/:jobId
   * Update a scheduled job
   */
  router.put('/schedule/:jobId', async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
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
      const { archiveId } = req.params;

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
      const { applicationId } = req.params;
      const limitParam = req.query.limit;
      const limit = typeof limitParam === 'string' ? parseInt(limitParam, 10) || 30 : 30;

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
