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
export type VectorStoreType = 'chroma' | 'pinecone' | 'weaviate';

export interface KnowledgeBaseConfig {
  _id?: Types.ObjectId;
  applicationId: string;
  embeddingProvider: EmbeddingProvider;
  embeddingAzureEndpoint?: string;
  embeddingAzureApiKey?: string;
  embeddingAzureDeploymentName?: string;
  embeddingOpenaiApiKey?: string;
  embeddingAwsRegion?: string;
  embeddingAwsAccessKeyId?: string;
  embeddingAwsSecretAccessKey?: string;
  embeddingBedrockModelId?: string;
  kbLlmProvider: KBLLMProvider;
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
