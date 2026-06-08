import { z } from 'zod';

/**
 * Zod validation schemas for all API inputs
 * Validates data at runtime to prevent type mismatches and runtime errors
 */

// ============================================================
// LLM Config Schema
// ============================================================
export const LLMConfigSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  provider: z.enum(['azure-openai', 'claude', 'aws-bedrock', 'openai']),
  // Exact parameter names for Azure OpenAI
  api_key: z.string().optional(),
  azure_endpoint: z.string().optional(),
  api_version: z.string().optional(),
  deployment: z.string().optional(),
  skipSslVerification: z.boolean().optional(),
  // Legacy field names for backward compatibility
  azureEndpoint: z.string().optional(),
  azureApiKey: z.string().optional(),
  azureDeploymentName: z.string().optional(),
  azureApiVersion: z.string().optional(),
  claudeApiKey: z.string().optional(),
  claudeModel: z.string().optional(),
  awsRegion: z.string().optional(),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  bedrockModelId: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  isDefault: z.boolean().optional(),
});

export type LLMConfigInput = z.infer<typeof LLMConfigSchema>;

// ============================================================
// Knowledge Base Config Schema
// ============================================================
export const KnowledgeBaseConfigSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  embeddingProvider: z.enum(['azure-openai', 'openai', 'aws-bedrock']).optional(),
  embeddingModel: z.string().optional(),
  // Exact parameter names for embedding (Azure OpenAI)
  embedding_api_key: z.string().optional(),
  embedding_azure_endpoint: z.string().optional(),
  embedding_api_version: z.string().optional(),
  embedding_deployment: z.string().optional(),
  embedding_skipSslVerification: z.boolean().optional(),
  // Legacy embedding fields
  embeddingAzureEndpoint: z.string().optional(),
  embeddingAzureApiKey: z.string().optional(),
  embeddingAzureDeploymentName: z.string().optional(),
  embeddingOpenaiApiKey: z.string().optional(),
  embeddingAwsRegion: z.string().optional(),
  embeddingAwsAccessKeyId: z.string().optional(),
  embeddingAwsSecretAccessKey: z.string().optional(),
  embeddingBedrockModelId: z.string().optional(),
  // KB LLM Provider - kbLlmProvider is required, provider is fallback
  kbLlmProvider: z.enum(['azure-openai', 'claude', 'aws-bedrock', 'openai']).optional(),
  provider: z.enum(['azure-openai', 'claude', 'aws-bedrock', 'openai']).optional(),
  // New simplified field names (from KBLLMSettings component - camelCase)
  azureEndpoint: z.string().optional(),
  azureApiKey: z.string().optional(),
  azureDeploymentName: z.string().optional(),
  azureApiVersion: z.string().optional(),
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().optional(),
  claudeApiKey: z.string().optional(),
  claudeModel: z.string().optional(),
  awsRegion: z.string().optional(),
  awsAccessKeyId: z.string().optional(),
  awsSecretAccessKey: z.string().optional(),
  bedrockModelId: z.string().optional(),
  // Exact parameter names for KB LLM (Azure OpenAI - snake_case)
  kbllm_api_key: z.string().optional(),
  kbllm_azure_endpoint: z.string().optional(),
  kbllm_api_version: z.string().optional(),
  kbllm_deployment: z.string().optional(),
  kbllm_skipSslVerification: z.boolean().optional(),
  kbllm_claude_api_key: z.string().optional(),
  kbllm_claude_model: z.string().optional(),
  kbllm_aws_region: z.string().optional(),
  kbllm_aws_access_key_id: z.string().optional(),
  kbllm_aws_secret_access_key: z.string().optional(),
  kbllm_bedrock_model_id: z.string().optional(),
  kbllm_openai_api_key: z.string().optional(),
  kbllm_openai_model: z.string().optional(),
  // Legacy KB LLM fields
  kbLlmAzureEndpoint: z.string().optional(),
  kbLlmAzureApiKey: z.string().optional(),
  kbLlmAzureDeploymentName: z.string().optional(),
  kbLlmAzureApiVersion: z.string().optional(),
  kbLlmClaudeApiKey: z.string().optional(),
  kbLlmClaudeModel: z.string().optional(),
  kbLlmAwsRegion: z.string().optional(),
  kbLlmAwsAccessKeyId: z.string().optional(),
  kbLlmAwsSecretAccessKey: z.string().optional(),
  kbLlmBedrockModelId: z.string().optional(),
  kbLlmOpenaiApiKey: z.string().optional(),
  kbLlmOpenaiModel: z.string().optional(),
  // Vector store and other optional settings
  vectorStoreType: z.enum(['chroma', 'pinecone', 'weaviate', 'azure-search']).optional(),
  vectorStoreUrl: z.string().optional(),
  vectorStoreApiKey: z.string().optional(),
  chunkSize: z.number().positive('Chunk size must be positive').optional(),
  overlapSize: z.number().min(0, 'Overlap size cannot be negative').optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  isDefault: z.boolean().optional(),
}).refine(
  (data) => data.kbLlmProvider || data.provider,
  {
    message: 'Either kbLlmProvider or provider is required',
    path: ['kbLlmProvider'],
  }
);

export type KnowledgeBaseConfigInput = z.infer<typeof KnowledgeBaseConfigSchema>;

// ============================================================
// Recommendation Prompt Schema
// ============================================================
const RecommendationSuggestionSchema = z.object({
  issue: z.string().min(1, 'Issue is required'),
  suggestion: z.string().min(1, 'Suggestion is required'),
  expectedImprovement: z.string().min(1, 'Expected improvement is required'),
});

export const RecommendationPromptSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  recordId: z.string().min(1, 'Record ID is required'),
  originalPrompt: z.string().min(1, 'Original prompt is required'),
  originalResponse: z.string().min(1, 'Original response is required'),
  context: z.string().optional(),
  suggestions: z.array(RecommendationSuggestionSchema),
  llmConfigUsed: z.string().min(1, 'LLM config ID is required'),
  rating: z.number().min(1).max(5).optional(),
  userNotes: z.string().optional(),
});

export type RecommendationPromptInput = z.infer<typeof RecommendationPromptSchema>;

// ============================================================
// KB Prompt Schema
// ============================================================
const ContextDocumentSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  content: z.string().min(1, 'Content is required'),
  relevanceScore: z.number().min(0).max(1),
});

export const KBPromptSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  ragSessionId: z.string().min(1, 'RAG session ID is required'),
  userQuery: z.string().min(1, 'User query is required'),
  contextRetrieved: z.array(ContextDocumentSchema),
  llmGeneratedResponse: z.string().min(1, 'LLM response is required'),
  embeddingModelUsed: z.string().min(1, 'Embedding model is required'),
  kbLlmConfigUsed: z.string().min(1, 'KB LLM config ID is required'),
  rating: z.number().min(1).max(5).optional(),
  userNotes: z.string().optional(),
});

export type KBPromptInput = z.infer<typeof KBPromptSchema>;

// ============================================================
// Prompt Template Schema
// ============================================================
const TemplateSourceSchema = z.object({
  sourceId: z.string().min(1, 'Source ID is required'),
  sourceType: z.enum(['recommendation', 'kb-prompt']),
  title: z.string().min(1, 'Title is required'),
  snippet: z.string().min(1, 'Snippet is required'),
});

export const PromptTemplateSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  name: z.string().min(1, 'Template name is required').max(255, 'Name too long'),
  description: z.string().optional(),
  templateText: z.string().min(1, 'Template text is required'),
  usageGuide: z.string().optional(),
  sourceRecommendationIds: z.array(z.string()),
  sourceKBPromptIds: z.array(z.string()),
  sources: z.array(TemplateSourceSchema),
  llmConfigUsedForRefinement: z.string().min(1, 'LLM config is required'),
  rawUserInput: z.string().optional(),
  llmRefinedOutput: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  expectedQualityScore: z.number().optional(),
  expectedUserSatisfaction: z.number().optional(),
  createdBy: z.string().min(1, 'Creator ID is required'),
});

export type PromptTemplateInput = z.infer<typeof PromptTemplateSchema>;

// ============================================================
// Refinement Request Schema (for LLM refinement endpoint)
// ============================================================
export const TemplateRefinementRequestSchema = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  recommendationIds: z.array(z.string()).min(0).default([]),
  kbPromptIds: z.array(z.string()).min(0).default([]),
  customTemplateText: z.string().min(1, 'Template text is required'),
  llmConfigId: z.string().min(1, 'LLM config is required'),
});

export type TemplateRefinementRequest = z.infer<typeof TemplateRefinementRequestSchema>;

// ============================================================
// Save Recommendation Schema
// ============================================================
export const SaveRecommendationSchema = z.object({
  recordId: z.string().min(1, 'Record ID is required'),
  rating: z.number().min(1).max(5).optional(),
  userNotes: z.string().optional(),
});

export type SaveRecommendationInput = z.infer<typeof SaveRecommendationSchema>;

// ============================================================
// Save KB Prompt Schema
// ============================================================
export const SaveKBPromptSchema = z.object({
  ragSessionId: z.string().min(1, 'RAG session ID is required'),
  rating: z.number().min(1).max(5).optional(),
  userNotes: z.string().optional(),
});

export type SaveKBPromptInput = z.infer<typeof SaveKBPromptSchema>;
