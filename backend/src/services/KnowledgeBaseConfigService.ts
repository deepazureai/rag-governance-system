import mongoose, { Types } from 'mongoose';
import { KnowledgeBaseConfig, KnowledgeBaseConfigInput } from '../types/models.js';
import { KnowledgeBaseConfigSchema } from '../schemas/index.js';
import { cryptoUtil } from '../utils/CryptoUtil.js';

/**
 * Knowledge Base Config Service
 * Handles CRUD operations for Knowledge Base configurations
 */
export class KnowledgeBaseConfigService {
  private readonly collection = 'knowledgebaseconfigs';

  /**
   * Create or update KB configuration for an application
   * Encrypts sensitive credentials before storing
   */
  async upsertConfig(input: KnowledgeBaseConfigInput): Promise<KnowledgeBaseConfig> {
    try {
      const validation = KnowledgeBaseConfigSchema.safeParse(input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.error.errors)}`);
      }

      // Normalize camelCase field names to standard format
      const normalized = this.normalizeFieldNames(validation.data as any);

      // Encrypt sensitive fields
      const config = this.encryptSensitiveFields(normalized);

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.findOneAndUpdate(
        { applicationId: input.applicationId },
        { $set: { ...config, updatedAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('Failed to upsert configuration');
      }

      return result.value as KnowledgeBaseConfig;
    } catch (error: unknown) {
      throw this.handleError('upsertConfig', error);
    }
  }

  /**
   * Normalize camelCase field names from KBLLMSettings component to standard format
   */
  private normalizeFieldNames(config: any): any {
    const normalized = { ...config };

    // Use provider if provided, else use kbLlmProvider
    if (normalized.provider && !normalized.kbLlmProvider) {
      normalized.kbLlmProvider = normalized.provider;
    }
    delete normalized.provider;

    // Map new camelCase fields to standard snake_case format
    if (normalized.azureEndpoint) {
      normalized.kbllm_azure_endpoint = normalized.azureEndpoint;
    }
    if (normalized.azureApiKey) {
      normalized.kbllm_api_key = normalized.azureApiKey;
    }
    if (normalized.azureDeploymentName) {
      normalized.kbllm_deployment = normalized.azureDeploymentName;
    }
    if (normalized.azureApiVersion) {
      normalized.kbllm_api_version = normalized.azureApiVersion;
    }

    // OpenAI fields
    if (normalized.openaiApiKey) {
      normalized.kbLlmOpenaiApiKey = normalized.openaiApiKey;
    }
    if (normalized.openaiModel) {
      normalized.kbLlmOpenaiModel = normalized.openaiModel;
    }

    // Claude fields
    if (normalized.claudeApiKey) {
      normalized.kbLlmClaudeApiKey = normalized.claudeApiKey;
    }
    if (normalized.claudeModel) {
      normalized.kbLlmClaudeModel = normalized.claudeModel;
    }

    // AWS Bedrock fields
    if (normalized.awsRegion) {
      normalized.kbLlmAwsRegion = normalized.awsRegion;
    }
    if (normalized.awsAccessKeyId) {
      normalized.kbLlmAwsAccessKeyId = normalized.awsAccessKeyId;
    }
    if (normalized.awsSecretAccessKey) {
      normalized.kbLlmAwsSecretAccessKey = normalized.awsSecretAccessKey;
    }
    if (normalized.bedrockModelId) {
      normalized.kbLlmBedrockModelId = normalized.bedrockModelId;
    }

    return normalized;
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

      if (!result || !result.value) {
        throw new Error('Configuration not found');
      }

      return result.value as KnowledgeBaseConfig;
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
        case 'azure-openai': {
          // Accept exact param names (new) or legacy names
          const hasEndpoint = config.embedding_azure_endpoint || config.embeddingAzureEndpoint;
          const hasApiKey = config.embedding_api_key || config.embeddingAzureApiKey;
          const hasDeployment = config.embedding_deployment || config.embeddingAzureDeploymentName;
          
          if (!hasEndpoint) errors.push('Embedding Azure Endpoint is required');
          if (!hasApiKey) errors.push('Embedding Azure API Key is required');
          if (!hasDeployment) errors.push('Embedding Azure Deployment is required');
          break;
        }

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
        case 'azure-openai': {
          // Accept exact param names (new) or legacy names
          const hasEndpoint = config.kbllm_azure_endpoint || config.kbLlmAzureEndpoint;
          const hasApiKey = config.kbllm_api_key || config.kbLlmAzureApiKey;
          const hasDeployment = config.kbllm_deployment || config.kbLlmAzureDeploymentName;
          
          if (!hasEndpoint) errors.push('KB LLM Azure Endpoint is required');
          if (!hasApiKey) errors.push('KB LLM Azure API Key is required');
          if (!hasDeployment) errors.push('KB LLM Azure Deployment is required');
          break;
        }

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

  /**
   * Encrypt sensitive credential fields
   * @param config - Configuration object to encrypt
   * @returns Configuration with encrypted sensitive fields
   */
  private encryptSensitiveFields(config: KnowledgeBaseConfigInput): KnowledgeBaseConfigInput {
    const encrypted: KnowledgeBaseConfigInput = { ...config };

    // Encrypt embedding provider credentials (exact param names)
    if ((encrypted as any).embedding_api_key) {
      (encrypted as any).embedding_api_key = cryptoUtil.encrypt((encrypted as any).embedding_api_key);
    }
    // Encrypt legacy embedding credentials
    if (encrypted.embeddingOpenaiApiKey) {
      encrypted.embeddingOpenaiApiKey = cryptoUtil.encrypt(encrypted.embeddingOpenaiApiKey);
    }
    if (encrypted.embeddingAzureApiKey) {
      encrypted.embeddingAzureApiKey = cryptoUtil.encrypt(encrypted.embeddingAzureApiKey);
    }
    if (encrypted.embeddingAwsAccessKeyId) {
      encrypted.embeddingAwsAccessKeyId = cryptoUtil.encrypt(encrypted.embeddingAwsAccessKeyId);
    }
    if (encrypted.embeddingAwsSecretAccessKey) {
      encrypted.embeddingAwsSecretAccessKey = cryptoUtil.encrypt(encrypted.embeddingAwsSecretAccessKey);
    }

    // Encrypt KB LLM credentials based on provider
    if (encrypted.kbLlmProvider) {
      switch (encrypted.kbLlmProvider) {
        case 'azure-openai':
          // Encrypt exact param names
          if ((encrypted as any).kbllm_api_key) {
            (encrypted as any).kbllm_api_key = cryptoUtil.encrypt((encrypted as any).kbllm_api_key);
          }
          // Encrypt legacy fields
          if (encrypted.kbLlmAzureApiKey) {
            encrypted.kbLlmAzureApiKey = cryptoUtil.encrypt(encrypted.kbLlmAzureApiKey);
          }
          break;

        case 'claude':
          if (encrypted.kbLlmClaudeApiKey) {
            encrypted.kbLlmClaudeApiKey = cryptoUtil.encrypt(encrypted.kbLlmClaudeApiKey);
          }
          break;

        case 'aws-bedrock':
          if (encrypted.kbLlmAwsAccessKeyId) {
            encrypted.kbLlmAwsAccessKeyId = cryptoUtil.encrypt(encrypted.kbLlmAwsAccessKeyId);
          }
          if (encrypted.kbLlmAwsSecretAccessKey) {
            encrypted.kbLlmAwsSecretAccessKey = cryptoUtil.encrypt(encrypted.kbLlmAwsSecretAccessKey);
          }
          break;

        case 'openai':
          if (encrypted.kbLlmOpenaiApiKey) {
            encrypted.kbLlmOpenaiApiKey = cryptoUtil.encrypt(encrypted.kbLlmOpenaiApiKey);
          }
          break;
      }
    }

    // Encrypt vector store API key if present
    if (encrypted.vectorStoreApiKey) {
      encrypted.vectorStoreApiKey = cryptoUtil.encrypt(encrypted.vectorStoreApiKey);
    }

    return encrypted;
  }
}

export const kbConfigService = new KnowledgeBaseConfigService();
