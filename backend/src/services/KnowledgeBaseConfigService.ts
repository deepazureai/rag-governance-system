import mongoose, { Types } from 'mongoose';
import { KnowledgeBaseConfig, KnowledgeBaseConfigInput } from '../../src/types/models';
import { KnowledgeBaseConfigSchema } from '../../src/schemas/index';

/**
 * Knowledge Base Config Service
 * Handles CRUD operations for Knowledge Base configurations
 */
export class KnowledgeBaseConfigService {
  private readonly collection = 'knowledgebaseconfigs';

  /**
   * Create or update KB configuration for an application
   */
  async upsertConfig(input: KnowledgeBaseConfigInput): Promise<KnowledgeBaseConfig> {
    try {
      const validation = KnowledgeBaseConfigSchema.safeParse(input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.error.errors)}`);
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.findOneAndUpdate(
        { applicationId: input.applicationId },
        { $set: { ...validation.data, updatedAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Failed to upsert configuration');
      }

      const kbConfig: KnowledgeBaseConfig = result.value as KnowledgeBaseConfig;
      return kbConfig;
    } catch (error: unknown) {
      throw this.handleError('upsertConfig', error);
    }
  }

  /**
   * Get KB configuration for an application
   */
  async getConfig(applicationId: string): Promise<KnowledgeBaseConfig | null> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const config = await collection.findOne({ applicationId }) as KnowledgeBaseConfig | null;
      return config;
    } catch (error: unknown) {
      throw this.handleError('getConfig', error);
    }
  }

  /**
   * Update KB configuration
   */
  async updateConfig(applicationId: string, updates: Partial<KnowledgeBaseConfig>): Promise<KnowledgeBaseConfig> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.findOneAndUpdate(
        { applicationId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result.value) {
        throw new Error('Configuration not found');
      }

      const kbConfig: KnowledgeBaseConfig = result.value as KnowledgeBaseConfig;
      return kbConfig;
    } catch (error: unknown) {
      throw this.handleError('updateConfig', error);
    }
  }

  /**
   * Delete KB configuration
   */
  async deleteConfig(applicationId: string): Promise<void> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.deleteOne({ applicationId });

      if (result.deletedCount === 0) {
        throw new Error('Configuration not found');
      }
    } catch (error: unknown) {
      throw this.handleError('deleteConfig', error);
    }
  }

  /**
   * Validate KB configuration (check required fields)
   */
  validateConfig(config: Partial<KnowledgeBaseConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate embedding provider fields
    if (!config.embeddingProvider) {
      errors.push('Embedding provider is required');
    } else {
      switch (config.embeddingProvider) {
        case 'azure-openai':
          if (!config.embeddingAzureEndpoint) errors.push('Embedding Azure Endpoint is required');
          if (!config.embeddingAzureApiKey) errors.push('Embedding Azure API Key is required');
          if (!config.embeddingAzureDeploymentName) errors.push('Embedding Azure Deployment Name is required');
          break;

        case 'openai':
          if (!config.embeddingOpenaiApiKey) errors.push('Embedding OpenAI API Key is required');
          break;

        case 'aws-bedrock':
          if (!config.embeddingAwsRegion) errors.push('Embedding AWS Region is required');
          if (!config.embeddingBedrockModelId) errors.push('Embedding Bedrock Model ID is required');
          break;
      }
    }

    // Validate KB LLM provider fields
    if (!config.kbLlmProvider) {
      errors.push('KB LLM provider is required');
    } else {
      switch (config.kbLlmProvider) {
        case 'azure-openai':
          if (!config.kbLlmAzureEndpoint) errors.push('KB LLM Azure Endpoint is required');
          if (!config.kbLlmAzureApiKey) errors.push('KB LLM Azure API Key is required');
          if (!config.kbLlmAzureDeploymentName) errors.push('KB LLM Azure Deployment Name is required');
          break;

        case 'claude':
          if (!config.kbLlmClaudeApiKey) errors.push('KB LLM Claude API Key is required');
          break;

        case 'aws-bedrock':
          if (!config.kbLlmAwsRegion) errors.push('KB LLM AWS Region is required');
          if (!config.kbLlmBedrockModelId) errors.push('KB LLM Bedrock Model ID is required');
          break;

        case 'openai':
          if (!config.kbLlmOpenaiApiKey) errors.push('KB LLM OpenAI API Key is required');
          break;
      }
    }

    // Validate vector store
    if (!config.vectorStoreType) {
      errors.push('Vector store type is required');
    }

    // Validate chunking
    if ((config.chunkSize ?? 0) <= 0) {
      errors.push('Chunk size must be positive');
    }
    if ((config.overlapSize ?? 0) < 0) {
      errors.push('Overlap size cannot be negative');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Handle errors with proper logging
   */
  private handleError(method: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[KnowledgeBaseConfigService.${method}] Error: ${message}`);
    return new Error(`KB Config Service Error in ${method}: ${message}`);
  }
}

export const kbConfigService = new KnowledgeBaseConfigService();
