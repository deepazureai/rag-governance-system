import mongoose, { Types } from 'mongoose';
import { KnowledgeBaseConfig, KnowledgeBaseConfigInput, ApiResponse } from '../types/models.js';
import { KnowledgeBaseConfigSchema } from '../schemas/index.js';
import { cryptoUtil } from '../utils/CryptoUtil.js';
import { configManager } from '../utils/ConfigManager.js';

/**
 * KB Config Service
 * Handles CRUD operations for Knowledge Base LLM provider configurations
 * Based on proven LLMConfigService pattern
 */
export class KBConfigService {
  private readonly collection = 'knowledgebaseconfigs';

  /**
   * Create or update KB configuration for an application
   * Encrypts sensitive credentials before storing
   */
  async upsertConfig(input: KnowledgeBaseConfigInput): Promise<KnowledgeBaseConfig> {
    try {
      console.log('[v0] KB upsertConfig starting with input:', { applicationId: (input as any).applicationId, provider: (input as any).kbLlmProvider });
      
      const validation = KnowledgeBaseConfigSchema.safeParse(input);
      if (!validation.success) {
        const errors = validation.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        console.error('[v0] KB upsertConfig validation failed:', errors);
        throw new Error(`Validation failed: ${errors}`);
      }

      // Encrypt sensitive fields
      const config = this.encryptSensitiveFields(validation.data as any);
      console.log('[v0] KB encrypted config keys:', Object.keys(config));

      const db = mongoose.connection;
      if (!db || !db.collection) {
        console.error('[v0] Database connection not available');
        throw new Error('Database connection not available');
      }
      
      const collection = db.collection(this.collection);
      if (!collection) {
        console.error('[v0] Collection not available:', this.collection);
        throw new Error('Collection not available');
      }

      const applicationId = (config as Record<string, unknown>).applicationId as string;
      console.log('[v0] KB upserting config for applicationId:', applicationId);
      
      // Use updateOne with upsert to upsert
      try {
        const upsertResult = await collection.updateOne(
          { applicationId },
          { $set: config },
          { upsert: true }
        );

        console.log('[v0] KB upsert result:', {
          acknowledged: upsertResult.acknowledged,
          modifiedCount: upsertResult.modifiedCount,
          upsertedCount: upsertResult.upsertedCount,
          upsertedId: upsertResult.upsertedId,
        });
      } catch (updateError) {
        console.error('[v0] KB updateOne failed:', updateError);
        throw updateError;
      }

      // Now fetch the document to return
      let savedConfig: unknown;
      try {
        savedConfig = await collection.findOne({ applicationId }) as unknown;
        console.log('[v0] KB retrieved saved config, type:', typeof savedConfig, 'has keys:', savedConfig ? Object.keys(savedConfig as any).length : 0);
      } catch (findError) {
        console.error('[v0] KB findOne failed:', findError);
        throw findError;
      }
      
      if (!savedConfig) {
        console.error('[v0] KB failed to retrieve saved configuration for applicationId:', applicationId);
        throw new Error('Failed to retrieve saved configuration');
      }

      console.log('[v0] KB successfully upserted and retrieved config for applicationId:', applicationId);
      
      // CRITICAL: Invalidate the config cache so next request fetches fresh config from DB
      configManager.invalidateKBCache(applicationId);
      console.log('[v0] KB invalidated KB config cache for app:', applicationId);
      
      return savedConfig as KnowledgeBaseConfig;
    } catch (error: unknown) {
      console.error('[v0] KB upsertConfig caught error:', error instanceof Error ? error.message : String(error));
      throw this.handleError('upsertConfig', error);
    }
  }

  /**
   * Get KB configuration for an application
   * Decrypts sensitive fields before returning
   */
  async getConfig(applicationId: string): Promise<KnowledgeBaseConfig | null> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const config = await collection.findOne({ applicationId }) as KnowledgeBaseConfig | null;
      
      // Decrypt sensitive fields before returning
      if (config) {
        return this.decryptSensitiveFields(config);
      }
      
      return config;
    } catch (error: unknown) {
      throw this.handleError('getConfig', error);
    }
  }

  /**
   * Get default KB configuration for an application
   */
  async getDefaultConfig(applicationId: string): Promise<KnowledgeBaseConfig | null> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const config = await collection.findOne({
        applicationId,
        isDefault: true,
      }) as KnowledgeBaseConfig | null;

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
   * Delete KB configuration
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
   * List all KB configurations for an application
   */
  async listConfigs(applicationId: string, limit: number = 50, skip: number = 0): Promise<{ configs: KnowledgeBaseConfig[]; total: number }> {
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
        configs: configs as KnowledgeBaseConfig[],
        total,
      };
    } catch (error: unknown) {
      throw this.handleError('listConfigs', error);
    }
  }

  /**
   * Validate KB configuration (check required fields based on provider)
   */
  validateConfig(config: Partial<KnowledgeBaseConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.kbLlmProvider) {
      errors.push('Provider is required');
      return { valid: false, errors };
    }

    switch (config.kbLlmProvider) {
      case 'azure-openai':
        if (!(config as any).kbllm_azure_endpoint) errors.push('Azure Endpoint is required');
        if (!(config as any).kbllm_api_key) errors.push('Azure API Key is required');
        if (!(config as any).kbllm_deployment) errors.push('Azure Deployment Name is required');
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
   * Handles both new field names (kbllm_api_key, kbllm_azure_endpoint) and legacy names (azureApiKey, azureEndpoint)
   * @param config - Configuration object to encrypt
   * @returns Configuration with encrypted sensitive fields
   */
  private encryptSensitiveFields(config: KnowledgeBaseConfigInput): KnowledgeBaseConfigInput {
    // First normalize legacy field names to exact format
    const normalized = this.normalizeLegacyFieldNames(config as unknown as Record<string, unknown>);
    const encrypted: KnowledgeBaseConfigInput = { ...normalized } as KnowledgeBaseConfigInput;

    // Encrypt KB Azure OpenAI credentials - ALL variants
    if ((encrypted as any).kbllm_api_key && typeof (encrypted as any).kbllm_api_key === 'string') {
      (encrypted as Record<string, unknown>).kbllm_api_key = cryptoUtil.encrypt((encrypted as any).kbllm_api_key);
    }
    if (encrypted.kbLlmAzureApiKey && typeof encrypted.kbLlmAzureApiKey === 'string') {
      encrypted.kbLlmAzureApiKey = cryptoUtil.encrypt(encrypted.kbLlmAzureApiKey);
    }

    // Encrypt Azure endpoint fields - ALL variants
    if ((encrypted as any).kbllm_azure_endpoint && typeof (encrypted as any).kbllm_azure_endpoint === 'string') {
      (encrypted as Record<string, unknown>).kbllm_azure_endpoint = cryptoUtil.encrypt((encrypted as any).kbllm_azure_endpoint);
    }
    if (encrypted.kbLlmAzureEndpoint && typeof encrypted.kbLlmAzureEndpoint === 'string') {
      encrypted.kbLlmAzureEndpoint = cryptoUtil.encrypt(encrypted.kbLlmAzureEndpoint);
    }

    // Encrypt Azure deployment fields - ALL variants
    if ((encrypted as any).kbllm_deployment && typeof (encrypted as any).kbllm_deployment === 'string') {
      (encrypted as Record<string, unknown>).kbllm_deployment = cryptoUtil.encrypt((encrypted as any).kbllm_deployment);
    }
    if (encrypted.kbLlmAzureDeploymentName && typeof encrypted.kbLlmAzureDeploymentName === 'string') {
      encrypted.kbLlmAzureDeploymentName = cryptoUtil.encrypt(encrypted.kbLlmAzureDeploymentName);
    }

    // Encrypt Azure API version fields - ALL variants
    if ((encrypted as any).kbllm_api_version && typeof (encrypted as any).kbllm_api_version === 'string') {
      (encrypted as Record<string, unknown>).kbllm_api_version = cryptoUtil.encrypt((encrypted as any).kbllm_api_version);
    }
    if ((encrypted as any).kbLlmAzureApiVersion && typeof (encrypted as any).kbLlmAzureApiVersion === 'string') {
      (encrypted as any).kbLlmAzureApiVersion = cryptoUtil.encrypt((encrypted as any).kbLlmAzureApiVersion);
    }
    
    // Encrypt Claude credentials - ALL variants
    if (encrypted.kbLlmClaudeApiKey && typeof encrypted.kbLlmClaudeApiKey === 'string') {
      encrypted.kbLlmClaudeApiKey = cryptoUtil.encrypt(encrypted.kbLlmClaudeApiKey);
    }
    if (encrypted.kbLlmClaudeModel && typeof encrypted.kbLlmClaudeModel === 'string') {
      encrypted.kbLlmClaudeModel = cryptoUtil.encrypt(encrypted.kbLlmClaudeModel);
    }
    
    // Encrypt AWS credentials - ALL variants
    if (encrypted.kbLlmAwsAccessKeyId && typeof encrypted.kbLlmAwsAccessKeyId === 'string') {
      encrypted.kbLlmAwsAccessKeyId = cryptoUtil.encrypt(encrypted.kbLlmAwsAccessKeyId);
    }
    if (encrypted.kbLlmAwsSecretAccessKey && typeof encrypted.kbLlmAwsSecretAccessKey === 'string') {
      encrypted.kbLlmAwsSecretAccessKey = cryptoUtil.encrypt(encrypted.kbLlmAwsSecretAccessKey);
    }
    if (encrypted.kbLlmAwsRegion && typeof encrypted.kbLlmAwsRegion === 'string') {
      encrypted.kbLlmAwsRegion = cryptoUtil.encrypt(encrypted.kbLlmAwsRegion);
    }
    if (encrypted.kbLlmBedrockModelId && typeof encrypted.kbLlmBedrockModelId === 'string') {
      encrypted.kbLlmBedrockModelId = cryptoUtil.encrypt(encrypted.kbLlmBedrockModelId);
    }
    
    // Encrypt OpenAI credentials - ALL variants
    if (encrypted.kbLlmOpenaiApiKey && typeof encrypted.kbLlmOpenaiApiKey === 'string') {
      encrypted.kbLlmOpenaiApiKey = cryptoUtil.encrypt(encrypted.kbLlmOpenaiApiKey);
    }
    if (encrypted.kbLlmOpenaiModel && typeof encrypted.kbLlmOpenaiModel === 'string') {
      encrypted.kbLlmOpenaiModel = cryptoUtil.encrypt(encrypted.kbLlmOpenaiModel);
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

  /**
   * Normalize legacy field names to exact format for LLMClientFactory
   * Frontend sends: azureApiKey, azureEndpoint, azureDeploymentName, azureApiVersion
   * Store as: kbllm_api_key, kbllm_azure_endpoint, kbllm_deployment, kbllm_api_version
   */
  private normalizeLegacyFieldNames(config: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...config };

    // Convert Azure OpenAI legacy names to exact format
    if (config.azureApiKey && !(normalized as any).kbllm_api_key) {
      (normalized as any).kbllm_api_key = config.azureApiKey;
    }
    if (config.azureEndpoint && !(normalized as any).kbllm_azure_endpoint) {
      (normalized as any).kbllm_azure_endpoint = config.azureEndpoint;
    }
    if (config.azureDeploymentName && !(normalized as any).kbllm_deployment) {
      (normalized as any).kbllm_deployment = config.azureDeploymentName;
    }
    if (config.azureApiVersion && !(normalized as any).kbllm_api_version) {
      (normalized as any).kbllm_api_version = config.azureApiVersion;
    }

    // Extract base endpoint if full URL is provided
    if ((normalized as any).kbllm_azure_endpoint && typeof (normalized as any).kbllm_azure_endpoint === 'string') {
      let endpoint = (normalized as any).kbllm_azure_endpoint;
      
      // First, remove any query parameters from the URL
      if (endpoint.includes('?')) {
        const parts = endpoint.split('?');
        endpoint = parts[0] || endpoint;
      }
      
      // If endpoint includes the full path with /openai/deployments/, extract just the base
      if (endpoint.includes('/openai/deployments/')) {
        const parts = endpoint.split('/openai/deployments/');
        const baseUrl = parts[0] || endpoint;
        (normalized as any).kbllm_azure_endpoint = baseUrl;
        console.log('[v0] KBConfigService: Extracted base endpoint from full URL:', {
          original: endpoint,
          extracted: baseUrl,
        });
      }
    }

    console.log('[v0] KB normalized config:', {
      provider: (normalized as any).kbLlmProvider,
      has_api_key: !!(normalized as any).kbllm_api_key,
      has_azure_endpoint: !!(normalized as any).kbllm_azure_endpoint,
      has_deployment: !!(normalized as any).kbllm_deployment,
      has_api_version: !!(normalized as any).kbllm_api_version,
    });

    return normalized as KnowledgeBaseConfigInput;
  }

  /**
   * Decrypt sensitive credential fields for display
   * @param config - Configuration object with encrypted fields
   * @returns Configuration with decrypted sensitive fields
   */
  private decryptSensitiveFields(config: KnowledgeBaseConfig): KnowledgeBaseConfig {
    const decrypted: any = { ...config };

    try {
      // Decrypt KB Azure OpenAI credentials - ALL variants
      if (decrypted.kbllm_api_key && typeof decrypted.kbllm_api_key === 'string') {
        decrypted.kbllm_api_key = cryptoUtil.decrypt(decrypted.kbllm_api_key);
      }
      if (decrypted.kbLlmAzureApiKey && typeof decrypted.kbLlmAzureApiKey === 'string') {
        decrypted.kbLlmAzureApiKey = cryptoUtil.decrypt(decrypted.kbLlmAzureApiKey);
      }

      // Decrypt Azure endpoint fields - ALL variants
      if (decrypted.kbllm_azure_endpoint && typeof decrypted.kbllm_azure_endpoint === 'string') {
        decrypted.kbllm_azure_endpoint = cryptoUtil.decrypt(decrypted.kbllm_azure_endpoint);
      }
      if (decrypted.kbLlmAzureEndpoint && typeof decrypted.kbLlmAzureEndpoint === 'string') {
        decrypted.kbLlmAzureEndpoint = cryptoUtil.decrypt(decrypted.kbLlmAzureEndpoint);
      }

      // Decrypt Azure deployment fields - ALL variants
      if (decrypted.kbllm_deployment && typeof decrypted.kbllm_deployment === 'string') {
        decrypted.kbllm_deployment = cryptoUtil.decrypt(decrypted.kbllm_deployment);
      }
      if (decrypted.kbLlmAzureDeploymentName && typeof decrypted.kbLlmAzureDeploymentName === 'string') {
        decrypted.kbLlmAzureDeploymentName = cryptoUtil.decrypt(decrypted.kbLlmAzureDeploymentName);
      }

      // Decrypt Azure API version fields - ALL variants
      if (decrypted.kbllm_api_version && typeof decrypted.kbllm_api_version === 'string') {
        decrypted.kbllm_api_version = cryptoUtil.decrypt(decrypted.kbllm_api_version);
      }
      if (decrypted.kbLlmAzureApiVersion && typeof decrypted.kbLlmAzureApiVersion === 'string') {
        decrypted.kbLlmAzureApiVersion = cryptoUtil.decrypt(decrypted.kbLlmAzureApiVersion);
      }
      
      // Decrypt Claude credentials - ALL variants
      if (decrypted.kbLlmClaudeApiKey && typeof decrypted.kbLlmClaudeApiKey === 'string') {
        decrypted.kbLlmClaudeApiKey = cryptoUtil.decrypt(decrypted.kbLlmClaudeApiKey);
      }
      if (decrypted.kbLlmClaudeModel && typeof decrypted.kbLlmClaudeModel === 'string') {
        decrypted.kbLlmClaudeModel = cryptoUtil.decrypt(decrypted.kbLlmClaudeModel);
      }
      
      // Decrypt AWS credentials - ALL variants
      if (decrypted.kbLlmAwsAccessKeyId && typeof decrypted.kbLlmAwsAccessKeyId === 'string') {
        decrypted.kbLlmAwsAccessKeyId = cryptoUtil.decrypt(decrypted.kbLlmAwsAccessKeyId);
      }
      if (decrypted.kbLlmAwsSecretAccessKey && typeof decrypted.kbLlmAwsSecretAccessKey === 'string') {
        decrypted.kbLlmAwsSecretAccessKey = cryptoUtil.decrypt(decrypted.kbLlmAwsSecretAccessKey);
      }
      if (decrypted.kbLlmAwsRegion && typeof decrypted.kbLlmAwsRegion === 'string') {
        decrypted.kbLlmAwsRegion = cryptoUtil.decrypt(decrypted.kbLlmAwsRegion);
      }
      if (decrypted.kbLlmBedrockModelId && typeof decrypted.kbLlmBedrockModelId === 'string') {
        decrypted.kbLlmBedrockModelId = cryptoUtil.decrypt(decrypted.kbLlmBedrockModelId);
      }
      
      // Decrypt OpenAI credentials - ALL variants
      if (decrypted.kbLlmOpenaiApiKey && typeof decrypted.kbLlmOpenaiApiKey === 'string') {
        decrypted.kbLlmOpenaiApiKey = cryptoUtil.decrypt(decrypted.kbLlmOpenaiApiKey);
      }
      if (decrypted.kbLlmOpenaiModel && typeof decrypted.kbLlmOpenaiModel === 'string') {
        decrypted.kbLlmOpenaiModel = cryptoUtil.decrypt(decrypted.kbLlmOpenaiModel);
      }

      // Decrypt embedding credentials - ALL variants
      if (decrypted.embedding_api_key && typeof decrypted.embedding_api_key === 'string') {
        decrypted.embedding_api_key = cryptoUtil.decrypt(decrypted.embedding_api_key);
      }
      if (decrypted.embeddingAzureApiKey && typeof decrypted.embeddingAzureApiKey === 'string') {
        decrypted.embeddingAzureApiKey = cryptoUtil.decrypt(decrypted.embeddingAzureApiKey);
      }
    } catch (error) {
      console.error('[v0] Error decrypting KB config fields:', error instanceof Error ? error.message : String(error));
      // Return as-is if decryption fails
      return config;
    }

    return decrypted;
  }
}

export const kbConfigService = new KBConfigService();
