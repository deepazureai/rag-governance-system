import mongoose, { Schema, Document } from 'mongoose';

export interface IBatchProcess extends Document {
  applicationId: string;
  connectionId: string;
  batchId: string;
  sourceType: 'local-folder' | 'azure-blob';
  status: 'pending' | 'reading' | 'archiving' | 'deleting' | 'inserting' | 'completed' | 'failed';
  progress: {
    totalRecords: number;
    processedRecords: number;
    failedRecords: number;
    currentStep: string;
  };
  metadata: {
    fileName: string;
    fileSize?: number;
    folderPath?: string;
    containerName?: string;
    recordCount: number;
    duplicateRecordsRemoved: number;
    validationErrors: string[];
  };
  timestamps: {
    startedAt: Date;
    completedAt?: Date;
    estimatedDuration?: number;
  };
  errorDetails?: {
    phase: string;
    message: string;
    code: string;
    timestamp: Date;
  };
  archiveFileId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BatchProcessSchema = new Schema<IBatchProcess>(
  {
    applicationId: { type: String, required: true, index: true },
    connectionId: { type: String, required: true },
    batchId: { type: String, required: true, unique: true, index: true },
    sourceType: { type: String, enum: ['local-folder', 'azure-blob'], required: true },
    status: {
      type: String,
      enum: ['pending', 'reading', 'archiving', 'deleting', 'inserting', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    progress: {
      totalRecords: { type: Number, default: 0 },
      processedRecords: { type: Number, default: 0 },
      failedRecords: { type: Number, default: 0 },
      currentStep: { type: String, default: 'Initializing' },
    },
    metadata: {
      fileName: { type: String, required: true },
      fileSize: Number,
      folderPath: String,
      containerName: String,
      recordCount: { type: Number, default: 0 },
      duplicateRecordsRemoved: { type: Number, default: 0 },
      validationErrors: [String],
    },
    timestamps: {
      startedAt: { type: Date, required: true },
      completedAt: Date,
      estimatedDuration: Number,
    },
    errorDetails: {
      phase: String,
      message: String,
      code: String,
      timestamp: Date,
    },
    archiveFileId: String,
  },
  { timestamps: true }
);

// Index for querying batch status and application
BatchProcessSchema.index({ applicationId: 1, status: 1 });

export const BatchProcess = mongoose.model<IBatchProcess>('BatchProcess', BatchProcessSchema);
