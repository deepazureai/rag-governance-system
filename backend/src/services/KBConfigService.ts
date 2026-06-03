import mongoose, { Types } from 'mongoose';
import { KnowledgeBaseConfig, KnowledgeBaseConfigInput, ApiResponse } from '../types/models.js';
import { KnowledgeBaseConfigSchema } from '../schemas/index.js';
import { cryptoUtil } from '../utils/CryptoUtil.js';
import { configManager } from '../utils/ConfigManager.js';

/**
 * KB Config Service
 * Handles CRUD operations for KB provider configurations
 * EXACT COPY of LLMConfigService with KB-specific names
 */
export class KBConfigService {
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

      // Encrypt sensitive fields
      const config = this.encryptSensitiveFields(validation.data as any);
      console.log('[v0] Encrypted KB config keys:', Object.keys(config));

      const db = mongoose.connection;
      if (!db || !db.collection) {
        throw new Error('Database connection not available');
      }
      
      const collection = db.collection(this.collection);
      if (!collection) {
        throw new Error('Collection not available');
      }

      const applicationId = (config as Record<string, unknown>).applicationId as string;
      console.log('[v0] Upserting KB config for applicationId:', applicationId);
      
      // Use updateOne to upsert
      const upsertResult = await collection.updateOne(
        { applicationId },
        { $set: config },
        { upsert: true }
      );

      console.log('[v0] KB Upsert acknowledged:', upsertResult.acknowledged, 'Modified:', upsertResult.modifiedCount, 'Upserted ID:', upsertResult.upsertedId);

      // Now fetch the document to return
      const savedConfig = await collection.findOne({ applicationId }) as unknown;
      
      if (!savedConfig) {
        throw new Error('Failed to retrieve saved KB configuration');
      }

      console.log('[v0] Successfully upserted and retrieved KB config for applicationId:', applicationId);
      
      // CRITICAL: Invalidate the config cache so next request fetches fresh config from DB
      configManager.invalidateKBCache(applicationId);
      console.log('[v0] Invalidated KB config cache for app:', applicationId);
      
      return savedConfig as KnowledgeBaseConfig;
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
      
      // Decrypt KB LLM credentials
      if ((decrypted as any).kbllm_api_key && typeof (decrypted as any).kbllm_api_key === 'string') {
        try {
          (decrypted as any).kbllm_api_key = cryptoUtil.decrypt((decrypted as any).kbllm_api_key);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbllm_api_key:', e);
        }
      }
      if (decrypted.kbLlmAzureApiKey && typeof decrypted.kbLlmAzureApiKey === 'string') {
        try {
          decrypted.kbLlmAzureApiKey = cryptoUtil.decrypt(decrypted.kbLlmAzureApiKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt kbLlmAzureApiKey:', e);
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

      // Decrypt embedding credentials
      if ((decrypted as any).embedding_api_key && typeof (decrypted as any).embedding_api_key === 'string') {
        try {
          (decrypted as any).embedding_api_key = cryptoUtil.decrypt((decrypted as any).embedding_api_key);
        } catch (e) {
          console.error('[v0] Failed to decrypt embedding_api_key:', e);
        }
      }
      if (decrypted.embeddingAzureApiKey && typeof decrypted.embeddingAzureApiKey === 'string') {
        try {
          decrypted.embeddingAzureApiKey = cryptoUtil.decrypt(decrypted.embeddingAzureApiKey);
        } catch (e) {
          console.error('[v0] Failed to decrypt embeddingAzureApiKey:', e);
        }
      }

      return decrypted;
    } catch (error: unknown) {
      throw this.handleError('getConfig', error);
    }
  }

  /**
   * Validate KB configuration (check required fields based on provider)
   */
  validateConfig(config: Partial<KnowledgeBaseConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.kbLlmProvider) {
      errors.push('KB LLM Provider is required');
      return { valid: false, errors };
    }

    switch (config.kbLlmProvider) {
      case 'azure-openai':
        if (!config.kbllm_api_key && !config.kbLlmAzureApiKey) errors.push('Azure API Key is required');
        if (!config.kbllm_azure_endpoint && !config.kbLlmAzureEndpoint) errors.push('Azure Endpoint is required');
        if (!config.kbllm_deployment && !config.kbLlmAzureDeploymentName) errors.push('Azure Deployment Name is required');
        break;

      case 'claude':
        if (!config.kbLlmClaudeApiKey) errors.push('Claude API Key is required');
        if (!config.kbLlmClaudeModel) errors.push('Claude Model is required');
        break;

      case 'aws-bedrock':
        if (!config.kbLlmAwsRegion) errors.push('AWS Region is required');
        if (!config.kbLlmBedrockModelId) errors.push('Bedrock Model ID is required');
        break;

      case 'openai':
        if (!config.kbLlmOpenaiApiKey) errors.push('OpenAI API Key is required');
        if (!config.kbLlmOpenaiModel) errors.push('OpenAI Model is required');
        break;

      default:
        errors.push(`Unknown provider: ${config.kbLlmProvider}`);
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
    console.error(`[KBConfigService.${method}] Error: ${message}`);
    return new Error(`KB Config Service Error in ${method}: ${message}`);
  }

  /**
   * Encrypt sensitive credential fields
   */
  private encryptSensitiveFields(config: KnowledgeBaseConfigInput): KnowledgeBaseConfigInput {
    const encrypted: KnowledgeBaseConfigInput = { ...config } as KnowledgeBaseConfigInput;

    // Encrypt KB Azure OpenAI credentials - BOTH field name variants
    if (encrypted.kbllm_api_key && typeof encrypted.kbllm_api_key === 'string') {
      (encrypted as Record<string, unknown>).kbllm_api_key = cryptoUtil.encrypt(encrypted.kbllm_api_key);
    }
    if (encrypted.kbLlmAzureApiKey && typeof encrypted.kbLlmAzureApiKey === 'string') {
      encrypted.kbLlmAzureApiKey = cryptoUtil.encrypt(encrypted.kbLlmAzureApiKey);
    }
    // Also encrypt legacy camelCase field names from frontend
    if ((encrypted as any).azureApiKey && typeof (encrypted as any).azureApiKey === 'string') {
      (encrypted as any).azureApiKey = cryptoUtil.encrypt((encrypted as any).azureApiKey);
    }

    // Encrypt Azure endpoint fields
    if ((encrypted as any).azureEndpoint && typeof (encrypted as any).azureEndpoint === 'string') {
      (encrypted as any).azureEndpoint = cryptoUtil.encrypt((encrypted as any).azureEndpoint);
    }
    if (encrypted.kbllm_azure_endpoint && typeof encrypted.kbllm_azure_endpoint === 'string') {
      (encrypted as any).kbllm_azure_endpoint = cryptoUtil.encrypt(encrypted.kbllm_azure_endpoint);
    }
    if (encrypted.kbLlmAzureEndpoint && typeof encrypted.kbLlmAzureEndpoint === 'string') {
      encrypted.kbLlmAzureEndpoint = cryptoUtil.encrypt(encrypted.kbLlmAzureEndpoint);
    }

    // Encrypt Azure deployment fields
    if ((encrypted as any).azureDeploymentName && typeof (encrypted as any).azureDeploymentName === 'string') {
      (encrypted as any).azureDeploymentName = cryptoUtil.encrypt((encrypted as any).azureDeploymentName);
    }
    if (encrypted.kbllm_deployment && typeof encrypted.kbllm_deployment === 'string') {
      (encrypted as any).kbllm_deployment = cryptoUtil.encrypt(encrypted.kbllm_deployment);
    }
    if (encrypted.kbLlmAzureDeploymentName && typeof encrypted.kbLlmAzureDeploymentName === 'string') {
      encrypted.kbLlmAzureDeploymentName = cryptoUtil.encrypt(encrypted.kbLlmAzureDeploymentName);
    }

    // Encrypt Azure API version fields
    if ((encrypted as any).azureApiVersion && typeof (encrypted as any).azureApiVersion === 'string') {
      (encrypted as any).azureApiVersion = cryptoUtil.encrypt((encrypted as any).azureApiVersion);
    }
    if (encrypted.kbllm_api_version && typeof encrypted.kbllm_api_version === 'string') {
      (encrypted as any).kbllm_api_version = cryptoUtil.encrypt(encrypted.kbllm_api_version);
    }
    if ((encrypted as any).kbLlmAzureApiVersion && typeof (encrypted as any).kbLlmAzureApiVersion === 'string') {
      (encrypted as any).kbLlmAzureApiVersion = cryptoUtil.encrypt((encrypted as any).kbLlmAzureApiVersion);
    }
    
    // Encrypt KB Claude credentials - ALL variants
    if (encrypted.kbLlmClaudeApiKey && typeof encrypted.kbLlmClaudeApiKey === 'string') {
      encrypted.kbLlmClaudeApiKey = cryptoUtil.encrypt(encrypted.kbLlmClaudeApiKey);
    }
    if ((encrypted as any).claudeApiKey && typeof (encrypted as any).claudeApiKey === 'string') {
      (encrypted as any).claudeApiKey = cryptoUtil.encrypt((encrypted as any).claudeApiKey);
    }
    if (encrypted.kbLlmClaudeModel && typeof encrypted.kbLlmClaudeModel === 'string') {
      encrypted.kbLlmClaudeModel = cryptoUtil.encrypt(encrypted.kbLlmClaudeModel);
    }
    if ((encrypted as any).claudeModel && typeof (encrypted as any).claudeModel === 'string') {
      (encrypted as any).claudeModel = cryptoUtil.encrypt((encrypted as any).claudeModel);
    }
    
    // Encrypt KB AWS credentials - ALL variants
    if (encrypted.kbLlmAwsAccessKeyId && typeof encrypted.kbLlmAwsAccessKeyId === 'string') {
      encrypted.kbLlmAwsAccessKeyId = cryptoUtil.encrypt(encrypted.kbLlmAwsAccessKeyId);
    }
    if ((encrypted as any).awsAccessKeyId && typeof (encrypted as any).awsAccessKeyId === 'string') {
      (encrypted as any).awsAccessKeyId = cryptoUtil.encrypt((encrypted as any).awsAccessKeyId);
    }
    if (encrypted.kbLlmAwsSecretAccessKey && typeof encrypted.kbLlmAwsSecretAccessKey === 'string') {
      encrypted.kbLlmAwsSecretAccessKey = cryptoUtil.encrypt(encrypted.kbLlmAwsSecretAccessKey);
    }
    if ((encrypted as any).awsSecretAccessKey && typeof (encrypted as any).awsSecretAccessKey === 'string') {
      (encrypted as any).awsSecretAccessKey = cryptoUtil.encrypt((encrypted as any).awsSecretAccessKey);
    }
    if (encrypted.kbLlmAwsRegion && typeof encrypted.kbLlmAwsRegion === 'string') {
      encrypted.kbLlmAwsRegion = cryptoUtil.encrypt(encrypted.kbLlmAwsRegion);
    }
    if ((encrypted as any).awsRegion && typeof (encrypted as any).awsRegion === 'string') {
      (encrypted as any).awsRegion = cryptoUtil.encrypt((encrypted as any).awsRegion);
    }
    if (encrypted.kbLlmBedrockModelId && typeof encrypted.kbLlmBedrockModelId === 'string') {
      encrypted.kbLlmBedrockModelId = cryptoUtil.encrypt(encrypted.kbLlmBedrockModelId);
    }
    if ((encrypted as any).bedrockModelId && typeof (encrypted as any).bedrockModelId === 'string') {
      (encrypted as any).bedrockModelId = cryptoUtil.encrypt((encrypted as any).bedrockModelId);
    }
    
    // Encrypt KB OpenAI credentials - ALL variants
    if (encrypted.kbLlmOpenaiApiKey && typeof encrypted.kbLlmOpenaiApiKey === 'string') {
      encrypted.kbLlmOpenaiApiKey = cryptoUtil.encrypt(encrypted.kbLlmOpenaiApiKey);
    }
    if ((encrypted as any).openaiApiKey && typeof (encrypted as any).openaiApiKey === 'string') {
      (encrypted as any).openaiApiKey = cryptoUtil.encrypt((encrypted as any).openaiApiKey);
    }
    if (encrypted.kbLlmOpenaiModel && typeof encrypted.kbLlmOpenaiModel === 'string') {
      encrypted.kbLlmOpenaiModel = cryptoUtil.encrypt(encrypted.kbLlmOpenaiModel);
    }
    if ((encrypted as any).openaiModel && typeof (encrypted as any).openaiModel === 'string') {
      (encrypted as any).openaiModel = cryptoUtil.encrypt((encrypted as any).openaiModel);
    }

    // Encrypt embedding credentials - ALL variants
    if ((encrypted as Record<string, unknown>).embedding_api_key && typeof (encrypted as Record<string, unknown>).embedding_api_key === 'string') {
      (encrypted as Record<string, unknown>).embedding_api_key = cryptoUtil.encrypt((encrypted as Record<string, unknown>).embedding_api_key as string);
    }
    if (encrypted.embeddingAzureApiKey && typeof encrypted.embeddingAzureApiKey === 'string') {
      encrypted.embeddingAzureApiKey = cryptoUtil.encrypt(encrypted.embeddingAzureApiKey);
    }

    // Add timestamps
    (encrypted as Record<string, unknown>).createdAt = (encrypted as Record<string, unknown>).createdAt || new Date();
    (encrypted as Record<string, unknown>).updatedAt = new Date();

    return encrypted;
  }
}

export const kbConfigService = new KBConfigService();
