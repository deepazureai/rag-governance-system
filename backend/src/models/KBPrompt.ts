import { Schema, Document, Types } from 'mongoose';

/**
 * Context Document from KB retrieval
 */
export interface ContextDocument {
  source: string;
  content: string;
  relevanceScore: number;
}

/**
 * KB Prompt Document
 * Stores outcomes from knowledge base queries with context and responses
 */
export interface IKBPrompt extends Document {
  applicationId: string;
  ragSessionId: string;
  
  // Query and retrieval
  userQuery: string;
  contextRetrieved: readonly ContextDocument[];
  llmGeneratedResponse: string;
  
  // Metadata
  embeddingModelUsed: string;
  kbLlmConfigUsed: Types.ObjectId;
  rating?: number;
  userNotes?: string;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export const kbPromptSchema = new Schema<IKBPrompt>(
  {
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    ragSessionId: {
      type: String,
      required: true,
      index: true,
    },
    userQuery: {
      type: String,
      required: true,
    },
    contextRetrieved: [
      {
        source: { type: String, required: true },
        content: { type: String, required: true },
        relevanceScore: {
          type: Number,
          required: true,
          min: 0,
          max: 1,
        },
      },
    ],
    llmGeneratedResponse: {
      type: String,
      required: true,
    },
    embeddingModelUsed: {
      type: String,
      required: true,
    },
    kbLlmConfigUsed: {
      type: Schema.Types.ObjectId,
      ref: 'KnowledgeBaseConfig',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    userNotes: { type: String },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default kbPromptSchema;
