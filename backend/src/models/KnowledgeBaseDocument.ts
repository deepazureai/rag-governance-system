import { Schema, Document } from 'mongoose';

/**
 * Knowledge Base Document - tracks uploaded documents for an application
 * Stores metadata about documents that have been uploaded to Chroma
 */
export interface IKnowledgeBaseDocument extends Document {
  applicationId: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  status: 'processing' | 'success' | 'error';
  embeddingStatus: 'pending' | 'success' | 'error';
  errorMessage?: string;
  uploadedAt: Date;
  processedAt?: Date;
  namespace: string;
}

export const knowledgeBaseDocumentSchema = new Schema<IKnowledgeBaseDocument>(
  {
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    documentId: {
      type: String,
      required: true,
      index: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    totalChunks: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ['processing', 'success', 'error'],
      default: 'processing',
    },
    embeddingStatus: {
      type: String,
      enum: ['pending', 'success', 'error'],
      default: 'pending',
    },
    errorMessage: {
      type: String,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    processedAt: {
      type: Date,
    },
    namespace: {
      type: String,
      default: 'default',
      index: true,
    },
  },
  { timestamps: true }
);

// Compound index for efficient queries
knowledgeBaseDocumentSchema.index({ applicationId: 1, namespace: 1 });

export default knowledgeBaseDocumentSchema;
