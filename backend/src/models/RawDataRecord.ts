import mongoose, { Schema, Document } from 'mongoose';

export interface IRawDataRecord extends Document {
  applicationId: string;
  connectionId: string;
  sourceType: 'local-folder' | 'azure-blob';
  recordData: Record<string, any>; // Flexible key-value pairs
  lineNumber: number;
  batchId: string;
  fileName: string;
  processedAt: Date;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RawDataRecordSchema = new Schema<IRawDataRecord>(
  {
    applicationId: { type: String, required: true, index: true },
    connectionId: { type: String, required: true, index: true },
    sourceType: { type: String, enum: ['local-folder', 'azure-blob'], required: true },
    recordData: { type: Schema.Types.Mixed, required: true },
    lineNumber: { type: Number, required: true },
    batchId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    processedAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    error: { type: String },
  },
  { timestamps: true }
);

// Compound index for application + batch queries
RawDataRecordSchema.index({ applicationId: 1, batchId: 1 });

export const RawDataRecord = mongoose.model<IRawDataRecord>('RawDataRecord', RawDataRecordSchema);
