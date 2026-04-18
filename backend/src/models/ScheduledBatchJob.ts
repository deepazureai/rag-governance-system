import mongoose, { Schema, Document } from 'mongoose';

export interface IScheduledBatchJob extends Document {
  applicationId: string;
  connectionId: string;
  jobId: string;
  isEnabled: boolean;
  schedule: {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    time: string; // HH:mm format (e.g., "02:00")
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    timezone: string; // e.g., "UTC", "America/New_York"
  };
  retention: {
    archiveRetentionDays: number;
    autoDeleteAfterDays: number;
  };
  lastRun?: {
    timestamp: Date;
    status: 'success' | 'failed' | 'pending';
    batchId?: string;
    errorMessage?: string;
  };
  nextScheduledRun: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledBatchJobSchema = new Schema<IScheduledBatchJob>(
  {
    applicationId: { type: String, required: true, index: true },
    connectionId: { type: String, required: true },
    jobId: { type: String, required: true, unique: true, index: true },
    isEnabled: { type: Boolean, default: true },
    schedule: {
      type: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'custom'],
        required: true,
      },
      time: { type: String, required: true }, // HH:mm format
      dayOfWeek: { type: Number, min: 0, max: 6 },
      dayOfMonth: { type: Number, min: 1, max: 31 },
      timezone: { type: String, required: true },
    },
    retention: {
      archiveRetentionDays: { type: Number, default: 90 },
      autoDeleteAfterDays: { type: Number, default: 365 },
    },
    lastRun: {
      timestamp: Date,
      status: { type: String, enum: ['success', 'failed', 'pending'] },
      batchId: String,
      errorMessage: String,
    },
    nextScheduledRun: { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

export const ScheduledBatchJob = mongoose.model<IScheduledBatchJob>(
  'ScheduledBatchJob',
  ScheduledBatchJobSchema
);
