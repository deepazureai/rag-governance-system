import { Schema, Document, Types } from 'mongoose';

/**
 * Knowledge Base Configuration Document
 * Stores embedding provider and KB NLP LLM settings
 */
export interface IKnowledgeBaseConfig extends Document {
  applicationId: string;
  
  // Embedding provider
  embeddingProvider: 'azure-openai' | 'openai' | 'aws-bedrock';
  embeddingAzureEndpoint?: string;
  embeddingAzureApiKey?: string;
  embeddingAzureDeploymentName?: string;
  embeddingOpenaiApiKey?: string;
  embeddingAwsRegion?: string;
  embeddingAwsAccessKeyId?: string;
  embeddingAwsSecretAccessKey?: string;
  embeddingBedrockModelId?: string;
  
  // KB NLP LLM (for generating responses from context)
  kbLlmProvider: 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';
  kbLlmAzureEndpoint?: string;
  kbLlmAzureApiKey?: string;
  kbLlmAzureDeploymentName?: string;
  kbLlmClaudeApiKey?: string;
  kbLlmClaudeModel?: string;
  kbLlmAwsRegion?: string;
  kbLlmAwsAccessKeyId?: string;
  kbLlmAwsSecretAccessKey?: string;
  kbLlmBedrockModelId?: string;
  kbLlmOpenaiApiKey?: string;
  kbLlmOpenaiModel?: string;
  
  // Vector store
  vectorStoreType: 'chroma' | 'pinecone' | 'weaviate';
  vectorStoreUrl?: string;
  vectorStoreApiKey?: string;
  
  // Chunking
  chunkSize: number;
  overlapSize: number;
  
  // Processing
  temperature?: number;
  maxTokens?: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export const knowledgeBaseConfigSchema = new Schema<IKnowledgeBaseConfig>(
  {
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    embeddingProvider: {
      type: String,
      enum: ['azure-openai', 'openai', 'aws-bedrock'],
      required: true,
    },
    embeddingAzureEndpoint: { type: String },
    embeddingAzureApiKey: { type: String },
    embeddingAzureDeploymentName: { type: String },
    embeddingOpenaiApiKey: { type: String },
    embeddingAwsRegion: { type: String },
    embeddingAwsAccessKeyId: { type: String },
    embeddingAwsSecretAccessKey: { type: String },
    embeddingBedrockModelId: { type: String },
    kbLlmProvider: {
      type: String,
      enum: ['azure-openai', 'claude', 'aws-bedrock', 'openai'],
      required: true,
    },
    kbLlmAzureEndpoint: { type: String },
    kbLlmAzureApiKey: { type: String },
    kbLlmAzureDeploymentName: { type: String },
    kbLlmClaudeApiKey: { type: String },
    kbLlmClaudeModel: { type: String },
    kbLlmAwsRegion: { type: String },
    kbLlmAwsAccessKeyId: { type: String },
    kbLlmAwsSecretAccessKey: { type: String },
    kbLlmBedrockModelId: { type: String },
    kbLlmOpenaiApiKey: { type: String },
    kbLlmOpenaiModel: { type: String },
    vectorStoreType: {
      type: String,
      enum: ['chroma', 'pinecone', 'weaviate'],
      required: true,
    },
    vectorStoreUrl: { type: String },
    vectorStoreApiKey: { type: String },
    chunkSize: {
      type: Number,
      required: true,
      default: 1024,
    },
    overlapSize: {
      type: Number,
      required: true,
      default: 100,
    },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7,
    },
    maxTokens: {
      type: Number,
      default: 2048,
    },
  },
  { timestamps: true }
);

export default knowledgeBaseConfigSchema;
