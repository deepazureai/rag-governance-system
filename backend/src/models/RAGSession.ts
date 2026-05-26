import { Schema, Document, model } from 'mongoose';
import { ObjectId } from 'mongodb';

/**
 * RAG Session Schema
 * Stores individual RAG instances with embeddings and chat history
 * Similar to Copilot's multi-chat functionality
 */

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface RAGSessionDocument extends Document {
  applicationId: string;
  sessionId: string;
  sessionName: string;
  description?: string;
  
  // Document/File References
  uploadedFileNames: string[];
  fileUploadDates: Date[];
  vectorStoreId?: string;
  vectorStoreType: 'chroma' | 'pinecone' | 'weaviate';
  
  // Chat History
  chatHistory: ChatMessage[];
  
  // Embedding Metadata
  totalChunks: number;
  embeddingModel: string;
  embeddingProvider: string;
  chunkSize: number;
  overlapSize: number;
  
  // LLM Configuration used for this session
  llmProvider: string;
  llmModel: string;
  
  // Session Metadata
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
  isActive: boolean;
  
  // Statistics
  totalQueries: number;
  totalTokensUsed: number;
}

const chatMessageSchema = new Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const ragSessionSchema = new Schema({
  applicationId: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sessionName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  uploadedFileNames: {
    type: [String],
    default: [],
  },
  fileUploadDates: {
    type: [Date],
    default: [],
  },
  vectorStoreId: {
    type: String,
  },
  vectorStoreType: {
    type: String,
    enum: ['chroma', 'pinecone', 'weaviate'],
    default: 'chroma',
  },
  chatHistory: {
    type: [chatMessageSchema],
    default: [],
  },
  totalChunks: {
    type: Number,
    default: 0,
  },
  embeddingModel: {
    type: String,
    required: true,
  },
  embeddingProvider: {
    type: String,
    required: true,
  },
  chunkSize: {
    type: Number,
    default: 1024,
  },
  overlapSize: {
    type: Number,
    default: 128,
  },
  llmProvider: {
    type: String,
    required: true,
  },
  llmModel: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  totalQueries: {
    type: Number,
    default: 0,
  },
  totalTokensUsed: {
    type: Number,
    default: 0,
  },
});

// Indexes for efficient queries
ragSessionSchema.index({ applicationId: 1, isActive: 1 });
ragSessionSchema.index({ applicationId: 1, lastAccessedAt: -1 });

export const RAGSession = model<RAGSessionDocument>('RAGSession', ragSessionSchema);

export type { RAGSessionDocument, ChatMessage };
