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
      console.log('[v0] upsertConfig input:', JSON.stringify({ ...input, kbllm_api_key: '****', embedding_api_key: '****' }, null, 2));
      
      const validation = KnowledgeBaseConfigSchema.safeParse(input);
      console.log('[v0] upsertConfig schema validation success:', validation.success);
      
      if (!validation.success) {
        console.error('[v0] upsertConfig validation errors:', validation.error.errors);
        throw new Error(`Validation failed: ${JSON.stringify(validation.error.errors)}`);
      }

      // Encrypt sensitive fields (normalization already done in route handler)
      const config = this.encryptSensitiveFields(validation.data as any);

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

      console.log('[v0] upsertConfig successful for app:', input.applicationId);
      return result.value as KnowledgeBaseConfig;
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
      
      if (!config) {
        return null;
      }

      // Decrypt sensitive fields before returning
      const decrypted = { ...config };
      
      // Decrypt Embedding credentials (exact param names - snake_case)
      if ((decrypted as any).embedding_api_key && typeof (decrypted as any).embedding_api_key === 'string') {
        try {
          (decrypted as any).embedding_api_key = cryptoUtil.decrypt((decrypted as any).embedding_api_key);
        } catch (e) {
          console.error('[v0] Failed to decrypt embedding_api_key:', e);
        }
      }
      if ((decrypted as any).embedding_azure_endpoint && typeof (decrypted as any).embedding_azure_endpoint === 'string') {
        try {
          (decrypted as any).embedding_azure_endpoint = cryptoUtil.decrypt((decrypted as any).embedding_azure_endpoint);
        } catch (e) {
          console.error('[v0] Failed to decrypt embedding_azure_endpoint:', e);
        }
      }
      if ((decrypted as any).embedding_api_version && typeof (decrypted as any).embedding_api_version === 'string') {
        try {
          (decrypted as any).embedding_api_version = cryptoUtil.decrypt((decrypted as any).embedding_api_version);
        } catch (e) {
          console.error('[v0] Failed to decrypt embedding_api_version:', e);
        }
      }
      // Decrypt legacy embedding credentials (backward compatibility)
      if (decrypted.embeddingAzureApiKey && typeof decrypted.embeddingAzureApiKey === 'string') {
        try {
          decrypted.embeddingAzureApiKey = cryptoUtil.decrypt(decrypted.embeddingAzureApiKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt embeddingAzureApiKey:', e);
        }
      }
      if (decrypted.embeddingAzureEndpoint && typeof decrypted.embeddingAzureEndpoint === 'string') {
        try {
          decrypted.embeddingAzureEndpoint = cryptoUtil.decrypt(decrypted.embeddingAzureEndpoint);
        } catch (e) {
          console.error('[v0] Failed to decrypt embeddingAzureEndpoint:', e);
        }
      }
      if (decrypted.embeddingOpenaiApiKey && typeof decrypted.embeddingOpenaiApiKey === 'string') {
        try {
          decrypted.embeddingOpenaiApiKey = cryptoUtil.decrypt(decrypted.embeddingOpenaiApiKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt embeddingOpenaiApiKey:', e);
        }
      }
      if (decrypted.embeddingAwsAccessKeyId && typeof decrypted.embeddingAwsAccessKeyId === 'string') {
        try {
          decrypted.embeddingAwsAccessKeyId = cryptoUtil.decrypt(decrypted.embeddingAwsAccessKeyId);
        } catch (e) {
          console.error('[v0] Failed to decrypt embeddingAwsAccessKeyId:', e);
        }
      }
      if (decrypted.embeddingAwsSecretAccessKey && typeof decrypted.embeddingAwsSecretAccessKey === 'string') {
        try {
          decrypted.embeddingAwsSecretAccessKey = cryptoUtil.decrypt(decrypted.embeddingAwsSecretAccessKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt embeddingAwsSecretAccessKey:', e);
        }
      }

      // Decrypt KB LLM credentials (exact param names - snake_case)
      if ((decrypted as any).kbllm_api_key && typeof (decrypted as any).kbllm_api_key === 'string') {
        try {
          (decrypted as any).kbllm_api_key = cryptoUtil.decrypt((decrypted as any).kbllm_api_key);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_api_key:', e);
        }
      }
      if ((decrypted as any).kbllm_azure_endpoint && typeof (decrypted as any).kbllm_azure_endpoint === 'string') {
        try {
          (decrypted as any).kbllm_azure_endpoint = cryptoUtil.decrypt((decrypted as any).kbllm_azure_endpoint);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_azure_endpoint:', e);
        }
      }
      if ((decrypted as any).kbllm_api_version && typeof (decrypted as any).kbllm_api_version === 'string') {
        try {
          (decrypted as any).kbllm_api_version = cryptoUtil.decrypt((decrypted as any).kbllm_api_version);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_api_version:', e);
        }
      }
      if ((decrypted as any).kbllm_deployment && typeof (decrypted as any).kbllm_deployment === 'string') {
        try {
          (decrypted as any).kbllm_deployment = cryptoUtil.decrypt((decrypted as any).kbllm_deployment);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_deployment:', e);
        }
      }
      if ((decrypted as any).kbllm_claude_api_key && typeof (decrypted as any).kbllm_claude_api_key === 'string') {
        try {
          (decrypted as any).kbllm_claude_api_key = cryptoUtil.decrypt((decrypted as any).kbllm_claude_api_key);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_claude_api_key:', e);
        }
      }
      if ((decrypted as any).kbllm_aws_access_key_id && typeof (decrypted as any).kbllm_aws_access_key_id === 'string') {
        try {
          (decrypted as any).kbllm_aws_access_key_id = cryptoUtil.decrypt((decrypted as any).kbllm_aws_access_key_id);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_aws_access_key_id:', e);
        }
      }
      if ((decrypted as any).kbllm_aws_secret_access_key && typeof (decrypted as any).kbllm_aws_secret_access_key === 'string') {
        try {
          (decrypted as any).kbllm_aws_secret_access_key = cryptoUtil.decrypt((decrypted as any).kbllm_aws_secret_access_key);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_aws_secret_access_key:', e);
        }
      }
      if ((decrypted as any).kbllm_openai_api_key && typeof (decrypted as any).kbllm_openai_api_key === 'string') {
        try {
          (decrypted as any).kbllm_openai_api_key = cryptoUtil.decrypt((decrypted as any).kbllm_openai_api_key);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_openai_api_key:', e);
        }
      }
      // Decrypt legacy KB LLM credentials (backward compatibility)
      if (decrypted.kbLlmAzureApiKey && typeof decrypted.kbLlmAzureApiKey === 'string') {
        try {
          decrypted.kbLlmAzureApiKey = cryptoUtil.decrypt(decrypted.kbLlmAzureApiKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmAzureApiKey:', e);
        }
      }
      if (decrypted.kbLlmAzureEndpoint && typeof decrypted.kbLlmAzureEndpoint === 'string') {
        try {
          decrypted.kbLlmAzureEndpoint = cryptoUtil.decrypt(decrypted.kbLlmAzureEndpoint);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmAzureEndpoint:', e);
        }
      }
      if (decrypted.kbLlmAzureDeploymentName && typeof decrypted.kbLlmAzureDeploymentName === 'string') {
        try {
          decrypted.kbLlmAzureDeploymentName = cryptoUtil.decrypt(decrypted.kbLlmAzureDeploymentName);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmAzureDeploymentName:', e);
        }
      }
      if (decrypted.kbLlmClaudeApiKey && typeof decrypted.kbLlmClaudeApiKey === 'string') {
        try {
          decrypted.kbLlmClaudeApiKey = cryptoUtil.decrypt(decrypted.kbLlmClaudeApiKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmClaudeApiKey:', e);
        }
      }
      if (decrypted.kbLlmAwsAccessKeyId && typeof decrypted.kbLlmAwsAccessKeyId === 'string') {
        try {
          decrypted.kbLlmAwsAccessKeyId = cryptoUtil.decrypt(decrypted.kbLlmAwsAccessKeyId);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmAwsAccessKeyId:', e);
        }
      }
      if (decrypted.kbLlmAwsSecretAccessKey && typeof decrypted.kbLlmAwsSecretAccessKey === 'string') {
        try {
          decrypted.kbLlmAwsSecretAccessKey = cryptoUtil.decrypt(decrypted.kbLlmAwsSecretAccessKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmAwsSecretAccessKey:', e);
        }
      }
      if (decrypted.kbLlmOpenaiApiKey && typeof decrypted.kbLlmOpenaiApiKey === 'string') {
        try {
          decrypted.kbLlmOpenaiApiKey = cryptoUtil.decrypt(decrypted.kbLlmOpenaiApiKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmOpenaiApiKey:', e);
        }
      }

      return decrypted;
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
    const encrypted: KnowledgeBaseConfigInput = { ...config };

    // Encrypt embedding provider credentials (exact param names - snake_case)
    if ((encrypted as any).embedding_api_key) {
      (encrypted as any).embedding_api_key = cryptoUtil.encrypt((encrypted as any).embedding_api_key);
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
