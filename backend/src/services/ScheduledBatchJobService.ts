import { v4 as uuidv4 } from 'uuid';
import cron from 'node-cron';
import { ScheduledBatchJob, IScheduledBatchJob } from '../models/ScheduledBatchJob';
import { batchProcessingService } from './BatchProcessingService';
import { logger } from '../utils/logger';

export class ScheduledBatchJobService {
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Create a new scheduled batch job for an application
   */
  async createScheduledJob(
    applicationId: string,
    connectionId: string,
    schedule: {
      type: 'daily' | 'weekly' | 'monthly';
      time: string; // HH:mm format
      dayOfWeek?: number;
      dayOfMonth?: number;
      timezone: string;
    },
    sourceConfig: any
  ): Promise<IScheduledBatchJob> {
    const jobId = uuidv4();
    const nextRun = this.calculateNextRun(schedule);

    const job = new ScheduledBatchJob({
      applicationId,
      connectionId,
      jobId,
      isEnabled: true,
      schedule: {
        type: schedule.type,
        time: schedule.time,
        dayOfWeek: schedule.dayOfWeek,
        dayOfMonth: schedule.dayOfMonth,
        timezone: schedule.timezone,
      },
      retention: {
        archiveRetentionDays: 90,
        autoDeleteAfterDays: 365,
      },
      nextScheduledRun: nextRun,
    });

    await job.save();

    logger.info(
      `[ScheduledBatchJobService] Created scheduled job ${jobId} for app ${applicationId}`
    );

    // Register cron job if enabled
    if (job.isEnabled) {
      this.registerCronJob(jobId, job, sourceConfig);
    }

    return job;
  }

  /**
   * Get all scheduled jobs for an application
   */
  async getApplicationScheduledJobs(applicationId: string): Promise<IScheduledBatchJob[]> {
    return ScheduledBatchJob.find({ applicationId }).sort({ createdAt: -1 });
  }

  /**
   * Get a specific scheduled job
   */
  async getScheduledJob(jobId: string): Promise<IScheduledBatchJob | null> {
    return ScheduledBatchJob.findOne({ jobId });
  }

  /**
   * Update a scheduled job
   */
  async updateScheduledJob(
    jobId: string,
    updates: Partial<IScheduledBatchJob>
  ): Promise<IScheduledBatchJob | null> {
    const job = await ScheduledBatchJob.findOneAndUpdate({ jobId }, updates, { new: true });

    if (job) {
      logger.info(`[ScheduledBatchJobService] Updated job ${jobId}`);
      // Re-register cron job if needed
      this.unregisterCronJob(jobId);
      // Will be re-registered on next initialization
    }

    return job;
  }

  /**
   * Enable or disable a scheduled job
   */
  async toggleScheduledJob(jobId: string, isEnabled: boolean): Promise<IScheduledBatchJob | null> {
    const job = await ScheduledBatchJob.findOneAndUpdate(
      { jobId },
      { isEnabled },
      { new: true }
    );

    if (job) {
      if (isEnabled) {
        this.registerCronJob(jobId, job, {}); // Need to get sourceConfig from connection
      } else {
        this.unregisterCronJob(jobId);
      }
      logger.info(
        `[ScheduledBatchJobService] Job ${jobId} is now ${isEnabled ? 'enabled' : 'disabled'}`
      );
    }

    return job;
  }

  /**
   * Delete a scheduled job
   */
  async deleteScheduledJob(jobId: string): Promise<boolean> {
    this.unregisterCronJob(jobId);
    const result = await ScheduledBatchJob.deleteOne({ jobId });
    logger.info(`[ScheduledBatchJobService] Deleted job ${jobId}`);
    return result.deletedCount > 0;
  }

  /**
   * Initialize all scheduled jobs on server startup
   */
  async initializeAllScheduledJobs(): Promise<void> {
    try {
      const jobs = await ScheduledBatchJob.find({ isEnabled: true });

      logger.info(`[ScheduledBatchJobService] Initializing ${jobs.length} scheduled jobs`);

      for (const job of jobs) {
        this.registerCronJob(job.jobId, job, {}); // sourceConfig needs to be fetched from connection
      }
    } catch (error) {
      logger.error(`[ScheduledBatchJobService] Failed to initialize jobs:`, error);
    }
  }

  /**
   * Register a cron job
   */
  private registerCronJob(
    jobId: string,
    job: IScheduledBatchJob,
    sourceConfig: any
  ): void {
    try {
      const cronExpression = this.generateCronExpression(job.schedule);

      const task = cron.schedule(cronExpression, async () => {
        logger.info(`[ScheduledBatchJobService] Executing scheduled batch job ${jobId}`);

        try {
          // TODO: Get connection source type and config
          const sourceType = 'local-folder'; // Placeholder

          await batchProcessingService.executeBatchProcess(
            job.applicationId,
            job.connectionId,
            sourceType as 'local-folder' | 'azure-blob',
            sourceConfig
          );

          // Update last run status
          await ScheduledBatchJob.updateOne(
            { jobId },
            {
              'lastRun.timestamp': new Date(),
              'lastRun.status': 'success',
              'nextScheduledRun': this.calculateNextRun(job.schedule),
            }
          );

          logger.info(`[ScheduledBatchJobService] Batch job ${jobId} completed successfully`);
        } catch (error: any) {
          logger.error(`[ScheduledBatchJobService] Batch job ${jobId} failed:`, error);

          await ScheduledBatchJob.updateOne(
            { jobId },
            {
              'lastRun.timestamp': new Date(),
              'lastRun.status': 'failed',
              'lastRun.errorMessage': error.message,
            }
          );
        }
      });

      this.cronJobs.set(jobId, task);
      logger.info(
        `[ScheduledBatchJobService] Registered cron job ${jobId}: ${cronExpression}`
      );
    } catch (error) {
      logger.error(`[ScheduledBatchJobService] Failed to register cron job:`, error);
    }
  }

  /**
   * Unregister a cron job
   */
  private unregisterCronJob(jobId: string): void {
    const task = this.cronJobs.get(jobId);
    if (task) {
      task.stop();
      this.cronJobs.delete(jobId);
      logger.info(`[ScheduledBatchJobService] Unregistered cron job ${jobId}`);
    }
  }

  /**
   * Generate cron expression from schedule config
   */
  private generateCronExpression(schedule: any): string {
    const [hours, minutes] = schedule.time.split(':');

    switch (schedule.type) {
      case 'daily':
        return `${minutes} ${hours} * * *`; // HH:mm every day

      case 'weekly':
        const dayOfWeek = schedule.dayOfWeek || 0; // 0 = Sunday
        return `${minutes} ${hours} * * ${dayOfWeek}`;

      case 'monthly':
        const dayOfMonth = schedule.dayOfMonth || 1;
        return `${minutes} ${hours} ${dayOfMonth} * *`;

      default:
        return `${minutes} ${hours} * * *`; // Default to daily
    }
  }

  /**
   * Calculate next scheduled run time
   */
  private calculateNextRun(schedule: any): Date {
    const now = new Date();
    const nextRun = new Date();

    const [hours, minutes] = schedule.time.split(':').map(Number);
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      // If time has passed today, schedule for next occurrence
      switch (schedule.type) {
        case 'daily':
          nextRun.setDate(nextRun.getDate() + 1);
          break;
        case 'weekly':
          nextRun.setDate(nextRun.getDate() + 7);
          break;
        case 'monthly':
          nextRun.setMonth(nextRun.getMonth() + 1);
          break;
      }
    }

    return nextRun;
  }

  /**
   * Manually trigger a batch job
   */
  async triggerBatchJobNow(jobId: string): Promise<boolean> {
    try {
      const job = await ScheduledBatchJob.findOne({ jobId });

      if (!job) {
        logger.warn(`[ScheduledBatchJobService] Job not found: ${jobId}`);
        return false;
      }

      logger.info(`[ScheduledBatchJobService] Manually triggering job ${jobId}`);

      // TODO: Get source config from connection
      const sourceType = 'local-folder';
      const sourceConfig = {};

      await batchProcessingService.executeBatchProcess(
        job.applicationId,
        job.connectionId,
        sourceType as 'local-folder' | 'azure-blob',
        sourceConfig
      );

      return true;
    } catch (error) {
      logger.error(`[ScheduledBatchJobService] Manual trigger failed:`, error);
      return false;
    }
  }
}

export const scheduledBatchJobService = new ScheduledBatchJobService();
