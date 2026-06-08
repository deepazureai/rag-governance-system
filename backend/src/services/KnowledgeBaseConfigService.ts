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
      console.log('[v0-upsertConfig] 1. Input received for appId:', input.applicationId);
      console.log('[v0-upsertConfig] 2. Provider:', input.provider, '| Api key length:', input.api_key?.length);

      // Encrypt sensitive fields
      console.log('[v0-upsertConfig] 3. Encrypting sensitive fields...');
      const encrypted = this.encryptSensitiveFields(input);
      console.log('[v0-upsertConfig] 4. Encrypted api_key format:', encrypted.api_key?.substring(0, 30) + '...');

      // Save to MongoDB
      console.log('[v0-upsertConfig] 5. Saving to MongoDB...');
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.findOneAndUpdate(
        { applicationId: input.applicationId },
        { $set: { ...encrypted, updatedAt: new Date() } },
        { upsert: true, returnDocument: 'after' }
      );

      if (!result?.value) {
        throw new Error('Failed to upsert configuration');
      }

      console.log('[v0-upsertConfig] 6. MongoDB upsert successful for appId:', input.applicationId);
      console.log('[v0-upsertConfig] 7. Returning config with encrypted fields');
      
      return result.value as KnowledgeBaseConfig;
    } catch (error: unknown) {
      console.error('[v0-upsertConfig] ERROR:', error instanceof Error ? error.message : String(error));
      throw this.handleError('upsertConfig', error);
    }
  }

  /**
   * Get KB configuration for an application
   */
  async getConfig(applicationId: string): Promise<KnowledgeBaseConfig | null> {
    try {
      console.log('[v0-getConfig] 1. Fetching config for appId:', applicationId);
      
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const config = await collection.findOne({ applicationId }) as KnowledgeBaseConfig | null;
      console.log('[v0-getConfig] 2. Found config:', !!config);
      
      if (!config) {
        return null;
      }

      // Decrypt sensitive fields
      console.log('[v0-getConfig] 3. Decrypting sensitive fields...');
      const decrypted = { ...config };
      
      if ((decrypted as any).api_key && typeof (decrypted as any).api_key === 'string') {
        (decrypted as any).api_key = cryptoUtil.decrypt((decrypted as any).api_key);
      }
      if ((decrypted as any).endpoint && typeof (decrypted as any).endpoint === 'string') {
        (decrypted as any).endpoint = cryptoUtil.decrypt((decrypted as any).endpoint);
      }
      if ((decrypted as any).api_version && typeof (decrypted as any).api_version === 'string') {
        (decrypted as any).api_version = cryptoUtil.decrypt((decrypted as any).api_version);
      }
      if ((decrypted as any).deployment && typeof (decrypted as any).deployment === 'string') {
        (decrypted as any).deployment = cryptoUtil.decrypt((decrypted as any).deployment);
      }
      
      // Decrypt embedding fields if present
      if ((decrypted as any).embedding_api_key && typeof (decrypted as any).embedding_api_key === 'string') {
        (decrypted as any).embedding_api_key = cryptoUtil.decrypt((decrypted as any).embedding_api_key);
      }
      if ((decrypted as any).embedding_endpoint && typeof (decrypted as any).embedding_endpoint === 'string') {
        (decrypted as any).embedding_endpoint = cryptoUtil.decrypt((decrypted as any).embedding_endpoint);
      }
      if ((decrypted as any).embedding_api_version && typeof (decrypted as any).embedding_api_version === 'string') {
        (decrypted as any).embedding_api_version = cryptoUtil.decrypt((decrypted as any).embedding_api_version);
      }
      if ((decrypted as any).embedding_deployment && typeof (decrypted as any).embedding_deployment === 'string') {
        (decrypted as any).embedding_deployment = cryptoUtil.decrypt((decrypted as any).embedding_deployment);
      }

      console.log('[v0-getConfig] 4. Decryption complete. Returning config');
      return decrypted;
    } catch (error: unknown) {
      console.error('[v0-getConfig] ERROR:', error instanceof Error ? error.message : String(error));
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
          const hasModel = config.embeddingModel || config.embeddingAzureDeploymentName;
          
          if (!hasEndpoint) errors.push('Embedding Azure Endpoint is required');
          if (!hasApiKey) errors.push('Embedding Azure API Key is required');
          if (!hasModel) errors.push('Embedding Model/Deployment is required');
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
    console.log('[v0-encrypt] 1. Starting encryption of sensitive fields');
    const encrypted: KnowledgeBaseConfigInput = { ...config };

    // Encrypt LLM mandatory fields
    if ((encrypted as any).api_key) {
      console.log('[v0-encrypt] 2a. Encrypting api_key');
      (encrypted as any).api_key = cryptoUtil.encrypt((encrypted as any).api_key);
    }
    if ((encrypted as any).endpoint) {
      console.log('[v0-encrypt] 2b. Encrypting endpoint');
      (encrypted as any).endpoint = cryptoUtil.encrypt((encrypted as any).endpoint);
    }
    if ((encrypted as any).api_version) {
      console.log('[v0-encrypt] 2c. Encrypting api_version');
      (encrypted as any).api_version = cryptoUtil.encrypt((encrypted as any).api_version);
    }
    if ((encrypted as any).deployment) {
      console.log('[v0-encrypt] 2d. Encrypting deployment');
      (encrypted as any).deployment = cryptoUtil.encrypt((encrypted as any).deployment);
    }

    // Encrypt embedding optional fields
    if ((encrypted as any).embedding_api_key) {
      console.log('[v0-encrypt] 3a. Encrypting embedding_api_key');
      (encrypted as any).embedding_api_key = cryptoUtil.encrypt((encrypted as any).embedding_api_key);
    }
    if ((encrypted as any).embedding_endpoint) {
      console.log('[v0-encrypt] 3b. Encrypting embedding_endpoint');
      (encrypted as any).embedding_endpoint = cryptoUtil.encrypt((encrypted as any).embedding_endpoint);
    }
    if ((encrypted as any).embedding_api_version) {
      console.log('[v0-encrypt] 3c. Encrypting embedding_api_version');
      (encrypted as any).embedding_api_version = cryptoUtil.encrypt((encrypted as any).embedding_api_version);
    }
    if ((encrypted as any).embedding_deployment) {
      console.log('[v0-encrypt] 3d. Encrypting embedding_deployment');
      (encrypted as any).embedding_deployment = cryptoUtil.encrypt((encrypted as any).embedding_deployment);
    }

    console.log('[v0-encrypt] 4. Encryption complete');
    return encrypted;
  }
    if ((encrypted as any).embedding_azure_endpoint) {
      (encrypted as any).embedding_azure_endpoint = cryptoUtil.encrypt((encrypted as any).embedding_azure_endpoint);
    }
    if ((encrypted as any).embedding_api_version) {
      (encrypted as any).embedding_api_version = cryptoUtil.encrypt((encrypted as any).embedding_api_version);
    }
    
    // Encrypt legacy embedding credentials (backward compatibility)
    if (encrypted.embeddingOpenaiApiKey) {
      encrypted.embeddingOpenaiApiKey = cryptoUtil.encrypt(encrypted.embeddingOpenaiApiKey);
    }
    if (encrypted.embeddingAzureApiKey) {
      encrypted.embeddingAzureApiKey = cryptoUtil.encrypt(encrypted.embeddingAzureApiKey);
    }
    if (encrypted.embeddingAzureEndpoint) {
      encrypted.embeddingAzureEndpoint = cryptoUtil.encrypt(encrypted.embeddingAzureEndpoint);
    }
    if (encrypted.embeddingAwsAccessKeyId) {
      encrypted.embeddingAwsAccessKeyId = cryptoUtil.encrypt(encrypted.embeddingAwsAccessKeyId);
    }
    if (encrypted.embeddingAwsSecretAccessKey) {
      encrypted.embeddingAwsSecretAccessKey = cryptoUtil.encrypt(encrypted.embeddingAwsSecretAccessKey);
    }

    // Encrypt KB LLM credentials based on provider (exact param names - snake_case)
    if (encrypted.kbLlmProvider) {
      switch (encrypted.kbLlmProvider) {
        case 'azure-openai':
          // Encrypt exact param names (snake_case)
          if ((encrypted as any).kbllm_api_key) {
            (encrypted as any).kbllm_api_key = cryptoUtil.encrypt((encrypted as any).kbllm_api_key);
          }
          if ((encrypted as any).kbllm_azure_endpoint) {
            (encrypted as any).kbllm_azure_endpoint = cryptoUtil.encrypt((encrypted as any).kbllm_azure_endpoint);
          }
          if ((encrypted as any).kbllm_api_version) {
            (encrypted as any).kbllm_api_version = cryptoUtil.encrypt((encrypted as any).kbllm_api_version);
          }
          if ((encrypted as any).kbllm_deployment) {
            (encrypted as any).kbllm_deployment = cryptoUtil.encrypt((encrypted as any).kbllm_deployment);
          }
          // Encrypt legacy fields (camelCase)
          if (encrypted.kbLlmAzureApiKey) {
            encrypted.kbLlmAzureApiKey = cryptoUtil.encrypt(encrypted.kbLlmAzureApiKey);
          }
          if (encrypted.kbLlmAzureEndpoint) {
            encrypted.kbLlmAzureEndpoint = cryptoUtil.encrypt(encrypted.kbLlmAzureEndpoint);
          }
          if (encrypted.kbLlmAzureDeploymentName) {
            encrypted.kbLlmAzureDeploymentName = cryptoUtil.encrypt(encrypted.kbLlmAzureDeploymentName);
          }
          break;

        case 'claude':
          // Encrypt snake_case
          if ((encrypted as any).kbllm_claude_api_key) {
            (encrypted as any).kbllm_claude_api_key = cryptoUtil.encrypt((encrypted as any).kbllm_claude_api_key);
          }
          // Encrypt legacy camelCase
          if (encrypted.kbLlmClaudeApiKey) {
            encrypted.kbLlmClaudeApiKey = cryptoUtil.encrypt(encrypted.kbLlmClaudeApiKey);
          }
          break;

        case 'aws-bedrock':
          // Encrypt snake_case
          if ((encrypted as any).kbllm_aws_access_key_id) {
            (encrypted as any).kbllm_aws_access_key_id = cryptoUtil.encrypt((encrypted as any).kbllm_aws_access_key_id);
          }
          if ((encrypted as any).kbllm_aws_secret_access_key) {
            (encrypted as any).kbllm_aws_secret_access_key = cryptoUtil.encrypt((encrypted as any).kbllm_aws_secret_access_key);
          }
          // Encrypt legacy camelCase
          if (encrypted.kbLlmAwsAccessKeyId) {
            encrypted.kbLlmAwsAccessKeyId = cryptoUtil.encrypt(encrypted.kbLlmAwsAccessKeyId);
          }
          if (encrypted.kbLlmAwsSecretAccessKey) {
            encrypted.kbLlmAwsSecretAccessKey = cryptoUtil.encrypt(encrypted.kbLlmAwsSecretAccessKey);
          }
          break;

        case 'openai':
          // Encrypt snake_case
          if ((encrypted as any).kbllm_openai_api_key) {
            (encrypted as any).kbllm_openai_api_key = cryptoUtil.encrypt((encrypted as any).kbllm_openai_api_key);
          }
          // Encrypt legacy camelCase
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
