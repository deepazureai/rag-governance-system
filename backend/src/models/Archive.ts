import mongoose, { Schema, Document } from 'mongoose';

export interface IArchive extends Document {
  archiveId: string;
  applicationId: string;
  batchId: string;
  archiveFileName: string;
  archiveStoragePath: string; // Path in blob storage
  archiveType: 'daily' | 'monthly' | 'manual';
  metadata: {
    recordCount: number;
    compression: 'none' | 'gzip' | 'zip';
    fileSize: number;
    checksum: string;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
  };
  retentionPolicy: {
    expiryDate: Date;
    isLocked: boolean;
  };
  createdAt: Date;
  archivedAt: Date;
}

const ArchiveSchema = new Schema<IArchive>(
  {
    archiveId: { type: String, required: true, unique: true, index: true },
    applicationId: { type: String, required: true, index: true },
    batchId: { type: String, required: true },
    archiveFileName: { type: String, required: true },
    archiveStoragePath: { type: String, required: true },
    archiveType: { type: String, enum: ['daily', 'monthly', 'manual'], required: true },
    metadata: {
      recordCount: { type: Number, required: true },
      compression: { type: String, enum: ['none', 'gzip', 'zip'], default: 'gzip' },
      fileSize: { type: Number, required: true },
      checksum: { type: String, required: true },
      dateRange: {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
      },
    },
    retentionPolicy: {
      expiryDate: { type: Date, required: true },
      isLocked: { type: Boolean, default: false },
    },
    archivedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Index for querying archives by application and date
ArchiveSchema.index({ applicationId: 1, archivedAt: -1 });

export const Archive = mongoose.model<IArchive>('Archive', ArchiveSchema);
