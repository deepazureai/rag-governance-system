import mongoose, { Types } from 'mongoose';
import { LLMConfig, LLMConfigInput, ApiResponse } from '../types/models.js';
import { LLMConfigSchema } from '../schemas/index.js';
import { cryptoUtil } from '../utils/CryptoUtil.js';

/**
 * LLM Config Service
 * Handles CRUD operations for LLM provider configurations
 */
export class LLMConfigService {
  private readonly collection = 'llmconfigs';

  /**
   * Create or update LLM configuration for an application
   * Encrypts sensitive credentials before storing
   */
  async upsertConfig(input: LLMConfigInput): Promise<LLMConfig> {
    try {
      const validation = LLMConfigSchema.safeParse(input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.error.errors)}`);
      }

      // Encrypt sensitive fields
      const config = this.encryptSensitiveFields(validation.data);

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.findOneAndUpdate(
        { applicationId: config.applicationId },
        { $set: config },
        { upsert: true, returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('Failed to upsert configuration');
      }

      return result.value as LLMConfig;
    } catch (error: unknown) {
      throw this.handleError('upsertConfig', error);
    }
  }

  /**
   * Get LLM configuration for an application
   */
  async getConfig(applicationId: string): Promise<LLMConfig | null> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const config = await collection.findOne({ applicationId }) as LLMConfig | null;
      return config;
    } catch (error: unknown) {
      throw this.handleError('getConfig', error);
    }
  }

  /**
   * Get default LLM configuration for an application
   */
  async getDefaultConfig(applicationId: string): Promise<LLMConfig | null> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const config = await collection.findOne({
        applicationId,
        isDefault: true,
      }) as LLMConfig | null;

      return config;
    } catch (error: unknown) {
      throw this.handleError('getDefaultConfig', error);
    }
  }

  /**
   * Set a configuration as default for an application
   */
  async setDefault(applicationId: string, configId: string): Promise<void> {
    try {
      if (!applicationId?.trim() || !configId?.trim()) {
        throw new Error('Application ID and Config ID are required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(configId);

      // Unset all others as default
      await collection.updateMany(
        { applicationId },
        { $set: { isDefault: false } }
      );

      // Set this one as default
      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: { isDefault: true, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('Configuration not found');
      }
    } catch (error: unknown) {
      throw this.handleError('setDefault', error);
    }
  }

  /**
   * Delete LLM configuration
   */
  async deleteConfig(configId: string): Promise<void> {
    try {
      if (!configId?.trim()) {
        throw new Error('Config ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(configId);

      const result = await collection.deleteOne({ _id: objectId });

      if (result.deletedCount === 0) {
        throw new Error('Configuration not found');
      }
    } catch (error: unknown) {
      throw this.handleError('deleteConfig', error);
    }
  }

  /**
   * List all LLM configurations for an application
   */
  async listConfigs(applicationId: string, limit: number = 50, skip: number = 0): Promise<{ configs: LLMConfig[]; total: number }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const [configs, total] = await Promise.all([
        collection
          .find({ applicationId })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .toArray(),
        collection.countDocuments({ applicationId }),
      ]);

      return {
        configs: configs as LLMConfig[],
        total,
      };
    } catch (error: unknown) {
      throw this.handleError('listConfigs', error);
    }
  }

  /**
   * Validate LLM configuration (check required fields based on provider)
   */
  validateConfig(config: Partial<LLMConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider is required');
      return { valid: false, errors };
    }

    switch (config.provider) {
      case 'azure-openai':
        if (!config.azureEndpoint) errors.push('Azure Endpoint is required');
        if (!config.azureApiKey) errors.push('Azure API Key is required');
        if (!config.azureDeploymentName) errors.push('Azure Deployment Name is required');
        break;

      case 'claude':
        if (!config.claudeApiKey) errors.push('Claude API Key is required');
        if (!config.claudeModel) errors.push('Claude Model is required');
        break;

      case 'aws-bedrock':
        if (!config.awsRegion) errors.push('AWS Region is required');
        if (!config.bedrockModelId) errors.push('Bedrock Model ID is required');
        break;

      case 'openai':
        if (!config.openaiApiKey) errors.push('OpenAI API Key is required');
        if (!config.openaiModel) errors.push('OpenAI Model is required');
        break;

      default:
        errors.push(`Unknown provider: ${config.provider}`);
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
    console.error(`[LLMConfigService.${method}] Error: ${message}`);
    return new Error(`LLM Config Service Error in ${method}: ${message}`);
  }

  /**
   * Encrypt sensitive credential fields
   * @param config - Configuration object to encrypt
   * @returns Configuration with encrypted sensitive fields
   */
  private encryptSensitiveFields(config: LLMConfigInput): LLMConfigInput {
    const encrypted: LLMConfigInput = { ...config };

    // Encrypt provider-specific credentials
    if (encrypted.azureApiKey) {
      encrypted.azureApiKey = cryptoUtil.encrypt(encrypted.azureApiKey);
    }
    if (encrypted.claudeApiKey) {
      encrypted.claudeApiKey = cryptoUtil.encrypt(encrypted.claudeApiKey);
    }
    if (encrypted.awsAccessKeyId) {
      encrypted.awsAccessKeyId = cryptoUtil.encrypt(encrypted.awsAccessKeyId);
    }
    if (encrypted.awsSecretAccessKey) {
      encrypted.awsSecretAccessKey = cryptoUtil.encrypt(encrypted.awsSecretAccessKey);
    }
    if (encrypted.openaiApiKey) {
      encrypted.openaiApiKey = cryptoUtil.encrypt(encrypted.openaiApiKey);
    }

    return encrypted;
  }
}

export const llmConfigService = new LLMConfigService();
