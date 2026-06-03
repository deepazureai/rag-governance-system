/**
 * Centralized TypeScript interfaces for all database models
 * Ensures strict typing throughout the application per TypeScript best practices
 */

import { Types } from 'mongoose';

// ============================================================
// LLM Config Types
// ============================================================
export type LLMProvider = 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';

export interface LLMConfig {
  _id?: Types.ObjectId;
  applicationId: string;
  provider: LLMProvider;
  
  // Azure OpenAI - Exact parameter names required for connection
  api_key?: string;              // Exact: for Azure OpenAI client
  azure_endpoint?: string;       // Exact: for Azure OpenAI client
  api_version?: string;          // Exact: for Azure OpenAI client (e.g., "2024-02-15-preview")
  deployment?: string;           // Exact: deployment name (e.g., "gpt-4-deployment")
  skipSslVerification?: boolean;  // Optional: for corporate proxies/self-signed certs
  
  // Legacy fields for backward compatibility
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  
  claudeApiKey?: string;
  claudeModel?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  bedrockModelId?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Interfaces for input validation
export type ILLMConfig = LLMConfig;
export type LLMConfigInput = Omit<LLMConfig, '_id' | 'createdAt' | 'updatedAt'>;

// ============================================================
// Knowledge Base Config Types
// ============================================================
export type EmbeddingProvider = 'azure-openai' | 'openai' | 'aws-bedrock';
export type KBLLMProvider = 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';
export type VectorStoreType = 'chroma' | 'pinecone' | 'weaviate' | 'azure-search';

export interface KnowledgeBaseConfig {
  _id?: Types.ObjectId;
  applicationId: string;
  
  // Embedding Configuration - Exact parameter names for Azure OpenAI embeddings
  embeddingProvider: EmbeddingProvider;
  embedding_api_key?: string;              // Exact: for embedding client
  embedding_azure_endpoint?: string;       // Exact: for embedding client
  embedding_api_version?: string;          // NEW: Exact parameter
  embedding_deployment?: string;           // NEW: Exact parameter (e.g., "text-embedding-ada-002-deployment")
  embedding_skipSslVerification?: boolean;  // NEW: Optional SSL bypass for embeddings
  
  // Legacy embedding fields for backward compatibility
  embeddingAzureEndpoint?: string;
  embeddingAzureApiKey?: string;
  embeddingAzureDeploymentName?: string;
  embeddingOpenaiApiKey?: string;
  embeddingAwsRegion?: string;
  embeddingAwsAccessKeyId?: string;
  embeddingAwsSecretAccessKey?: string;
  embeddingBedrockModelId?: string;
  
  // KB LLM Configuration - Exact parameter names for Azure OpenAI LLM
  kbLlmProvider: KBLLMProvider;
  provider?: KBLLMProvider;  // NEW: Alternative field name for simplified UI
  kbllm_api_key?: string;              // Exact: for KB LLM client
  kbllm_azure_endpoint?: string;       // Exact: for KB LLM client
  kbllm_api_version?: string;          // NEW: Exact parameter
  kbllm_deployment?: string;           // NEW: Exact parameter (e.g., "gpt-4-deployment")
  kbllm_skipSslVerification?: boolean;  // NEW: Optional SSL bypass for KB LLM
  
  // New simplified field names (camelCase from KBLLMSettings component)
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  openaiApiKey?: string;
  openaiModel?: string;
  claudeApiKey?: string;
  claudeModel?: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  bedrockModelId?: string;
  
  // Legacy KB LLM fields for backward compatibility
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
  
  // Vector Store Configuration
  vectorStoreType: VectorStoreType;
  vectorStoreUrl?: string;
  vectorStoreApiKey?: string;
  chunkSize: number;
  overlapSize: number;
  temperature?: number;
  maxTokens?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Input types for validation
export type IKnowledgeBaseConfig = KnowledgeBaseConfig;
export type KnowledgeBaseConfigInput = Omit<KnowledgeBaseConfig, '_id' | 'createdAt' | 'updatedAt'>;

// ============================================================
// Recommendation Prompt Types
// ============================================================
export interface RecommendationSuggestion {
  issue: string;
  suggestion: string;
  expectedImprovement: string;
}

export interface RecommendationPrompt {
  _id?: Types.ObjectId;
  applicationId: string;
  recordId: string;
  originalPrompt: string;
  originalResponse: string;
  context?: string;
  suggestions: ReadonlyArray<RecommendationSuggestion>;
  llmConfigUsed: Types.ObjectId;
  rating?: number;
  userNotes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Input types for validation
export type IRecommendationPrompt = RecommendationPrompt;
export type RecommendationPromptInput = Omit<RecommendationPrompt, '_id' | 'createdAt' | 'updatedAt' | 'isActive'>;

// ============================================================
// KB Prompt Types
// ============================================================
export interface ContextDocument {
  source: string;
  content: string;
  relevanceScore: number;
}

export interface KBPrompt {
  _id?: Types.ObjectId;
  applicationId: string;
  ragSessionId: string;
  userQuery: string;
  contextRetrieved: ReadonlyArray<ContextDocument>;
  llmGeneratedResponse: string;
  embeddingModelUsed: string;
  kbLlmConfigUsed: Types.ObjectId;
  rating?: number;
  userNotes?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Input types for validation
export type IKBPrompt = KBPrompt;
export type KBPromptInput = Omit<KBPrompt, '_id' | 'createdAt' | 'updatedAt' | 'isActive'>;
export type SaveKBPromptInput = KBPromptInput;

// ============================================================
// Prompt Template Types
// ============================================================
export interface TemplateSource {
  sourceId: Types.ObjectId;
  sourceType: 'recommendation' | 'kb-prompt';
  title: string;
  snippet: string;
}

export interface PromptTemplateUsageMetrics {
  totalUsageCount: number;
  lastUsedAt?: Date;
  averageQualityScore?: number;
  averageUserSatisfaction?: number;
  successRate?: number;
}

export interface PromptTemplate {
  _id?: Types.ObjectId;
  applicationId: string;
  name: string;
  description?: string;
  templateText: string;
  usageGuide?: string;
  sourceRecommendationIds: ReadonlyArray<Types.ObjectId>;
  sourceKBPromptIds: ReadonlyArray<Types.ObjectId>;
  sources: ReadonlyArray<TemplateSource>;
  llmConfigUsedForRefinement: Types.ObjectId;
  rawUserInput?: string;
  llmRefinedOutput?: string;
  category?: string;
  tags: ReadonlyArray<string>;
  version: number;
  isPublic: boolean;
  expectedQualityScore?: number;
  expectedUserSatisfaction?: number;
  usageMetrics: PromptTemplateUsageMetrics;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  publishedBy?: string;
  archivedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// Input types for validation
export type IPromptTemplate = PromptTemplate;
export type PromptTemplateInput = Omit<PromptTemplate, '_id' | 'createdAt' | 'updatedAt' | 'version'>;
export type SaveRecommendationInput = RecommendationPromptInput;

// ============================================================
// API Response Types
// ============================================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface ApiListResponse<T> {
  success: boolean;
  data: ReadonlyArray<T>;
  total: number;
  message?: string;
  error?: string;
}
