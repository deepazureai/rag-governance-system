import { Schema, Document, Types } from 'mongoose';

/**
 * Knowledge Base Configuration Document
 * Stores embedding provider and KB NLP LLM settings
 */
export interface IKnowledgeBaseConfig extends Document {
  applicationId: string;
  
  // Embedding provider
  embeddingProvider: 'azure-openai' | 'openai' | 'aws-bedrock';
  // Exact parameter names for Azure OpenAI embeddings
  embedding_api_key?: string;
  embedding_azure_endpoint?: string;
  embedding_api_version?: string;
  embedding_deployment?: string;
  embedding_skipSslVerification?: boolean;
  // Legacy embedding fields
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
  // Exact parameter names for Azure OpenAI KB LLM
  kbllm_api_key?: string;
  kbllm_azure_endpoint?: string;
  kbllm_api_version?: string;
  kbllm_deployment?: string;
  kbllm_skipSslVerification?: boolean;
  // Legacy KB LLM fields
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
  vectorStoreType: 'chroma' | 'pinecone' | 'weaviate' | 'azure-search';
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
    // Exact parameter names for Azure OpenAI embeddings
    embedding_api_key: { type: String },
    embedding_azure_endpoint: { type: String },
    embedding_api_version: { type: String },
    embedding_deployment: { type: String },
    embedding_skipSslVerification: { type: Boolean, default: false },
    // Legacy embedding fields
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
    // Exact parameter names for Azure OpenAI KB LLM
    kbllm_api_key: { type: String },
    kbllm_azure_endpoint: { type: String },
    kbllm_api_version: { type: String },
    kbllm_deployment: { type: String },
    kbllm_skipSslVerification: { type: Boolean, default: false },
    // Legacy KB LLM fields
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
      enum: ['chroma', 'pinecone', 'weaviate', 'azure-search'],
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
