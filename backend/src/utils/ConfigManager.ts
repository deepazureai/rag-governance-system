import { ILLMConfig, IKnowledgeBaseConfig } from '../types/models.js';
import { llmConfigService } from '../services/LLMConfigService.js';
import { kbConfigService } from '../services/KnowledgeBaseConfigService.js';
import { cryptoUtil } from './CryptoUtil.js';

/**
 * Cache entry with TTL
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/**
 * ConfigManager - Centralized LLM and KB Configuration Management
 * 
 * Responsibilities:
 * 1. Fetch LLM configs from database
 * 2. Cache configs with TTL to reduce DB queries
 * 3. Decrypt sensitive credentials on retrieval
 * 4. Provide default configs when custom ones fail
 * 5. Validate credentials before use
 * 6. Handle errors gracefully
 */
export class ConfigManager {
  private llmConfigCache: Map<string, CacheEntry<ILLMConfig>> = new Map();
  private kbConfigCache: Map<string, CacheEntry<IKnowledgeBaseConfig>> = new Map();
  private readonly cacheTTL = 3600000; // 1 hour in milliseconds
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 500;

  /**
   * Get LLM config for an application with caching
   * @param applicationId - Application identifier
   * @returns LLM configuration with decrypted credentials
   * @throws Error if no config found and cannot create default
   */
  async getApplicationLLMConfig(applicationId: string): Promise<ILLMConfig> {
    try {
      // Validate input
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      // Check cache
      const cached = this.getLLMConfigFromCache(applicationId);
      if (cached) {
        console.log(`[ConfigManager] Using cached LLM config for app: ${applicationId}`);
        return this.decryptConfig(cached);
      }

      // Fetch from database with retry logic
      let config: ILLMConfig | null = null;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          config = await llmConfigService.getConfig(applicationId);
          if (config) break;
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelayMs * attempt);
          }
        } catch (err) {
          if (attempt === this.maxRetries) throw err;
          console.warn(`[ConfigManager] Retry ${attempt}/${this.maxRetries} getting LLM config`);
          await this.delay(this.retryDelayMs * attempt);
        }
      }

      if (!config) {
        console.warn(`[ConfigManager] No LLM config found for app: ${applicationId}. Creating default...`);
        config = await this.initializeDefaultLLMConfig(applicationId);
      }

      if (!config) {
        throw new Error(`No LLM configuration available for application: ${applicationId}`);
      }

      // Cache the config
      this.setLLMConfigCache(applicationId, config);

      // Decrypt sensitive fields before returning
      return this.decryptConfig(config);
    } catch (error: unknown) {
      throw this.handleError('getApplicationLLMConfig', error, applicationId);
    }
  }

  /**
   * Get KB config for an application with caching
   * @param applicationId - Application identifier
   * @returns KB configuration with decrypted credentials
   * @throws Error if no config found
   */
  async getApplicationKBConfig(applicationId: string): Promise<IKnowledgeBaseConfig> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const cached = this.getKBConfigFromCache(applicationId);
      if (cached) {
        console.log(`[ConfigManager] Using cached KB config for app: ${applicationId}`);
        return this.decryptKBConfig(cached);
      }

      let config: IKnowledgeBaseConfig | null = null;
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          config = await kbConfigService.getConfig(applicationId);
          if (config) break;
          if (attempt < this.maxRetries) {
            await this.delay(this.retryDelayMs * attempt);
          }
        } catch (err) {
          if (attempt === this.maxRetries) throw err;
          console.warn(`[ConfigManager] Retry ${attempt}/${this.maxRetries} getting KB config`);
          await this.delay(this.retryDelayMs * attempt);
        }
      }

      if (!config) {
        console.warn(`[ConfigManager] No KB config found for app: ${applicationId}. Creating default...`);
        config = await this.initializeDefaultKBConfig(applicationId);
      }

      if (!config) {
        throw new Error(`No KB configuration available for application: ${applicationId}`);
      }

      this.setKBConfigCache(applicationId, config);
      return this.decryptKBConfig(config);
    } catch (error: unknown) {
      throw this.handleError('getApplicationKBConfig', error, applicationId);
    }
  }

  /**
   * Validate LLM config credentials are correct
   * @param config - LLM configuration to validate
   * @returns Validation result with error details
   */
  validateLLMConfig(config: ILLMConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.provider) {
      errors.push('Provider is required');
      return { valid: false, errors };
    }

    switch (config.provider) {
      case 'azure-openai':
        // Check for snake_case properties (as stored in MongoDB from Settings->LLM)
        if (!config.azure_endpoint) errors.push('Azure Endpoint is required');
        if (!config.api_key) errors.push('Azure API Key is required');
        if (!config.deployment) errors.push('Azure Deployment Name is required');
        if (!config.api_version) errors.push('Azure API Version is required');
        break;

      case 'claude':
        if (!config.claudeApiKey) errors.push('Claude API Key is required');
        if (!config.claudeModel) errors.push('Claude Model is required');
        break;

      case 'aws-bedrock':
        if (!config.awsRegion) errors.push('AWS Region is required');
        if (!config.bedrockModelId) errors.push('Bedrock Model ID is required');
        if (!config.awsAccessKeyId) errors.push('AWS Access Key ID is required');
        if (!config.awsSecretAccessKey) errors.push('AWS Secret Access Key is required');
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
   * Validate KB configuration for required fields
   * @param config - KB configuration to validate
   * @returns Validation result with any errors
   */
  validateKBConfig(config: IKnowledgeBaseConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.embeddingProvider) {
      errors.push('Embedding provider is required');
      return { valid: false, errors };
    }

    // Validate embedding provider credentials
    switch (config.embeddingProvider) {
      case 'openai':
        if (!config.embeddingOpenaiApiKey) errors.push('OpenAI API Key is required for embeddings');
        break;

      case 'azure-openai':
        if (!config.embeddingAzureApiKey) errors.push('Azure API Key is required for embeddings');
        if (!config.embeddingAzureEndpoint) errors.push('Azure Endpoint is required for embeddings');
        break;

      case 'aws-bedrock':
        if (!config.embeddingAwsAccessKeyId) errors.push('AWS Access Key ID is required for embeddings');
        if (!config.embeddingAwsSecretAccessKey) errors.push('AWS Secret Access Key is required for embeddings');
        break;

      default:
        errors.push(`Unknown embedding provider: ${config.embeddingProvider}`);
    }

    // Validate KB LLM provider if specified
    if (config.kbLlmProvider) {
      switch (config.kbLlmProvider) {
        case 'azure-openai':
          if (!config.kbLlmAzureApiKey) errors.push('Azure API Key is required for KB LLM');
          if (!config.kbLlmAzureEndpoint) errors.push('Azure Endpoint is required for KB LLM');
          break;

        case 'claude':
          if (!config.kbLlmClaudeApiKey) errors.push('Claude API Key is required for KB LLM');
          break;

        case 'aws-bedrock':
          if (!config.kbLlmAwsAccessKeyId) errors.push('AWS Access Key ID is required for KB LLM');
          if (!config.kbLlmAwsSecretAccessKey) errors.push('AWS Secret Access Key is required for KB LLM');
          break;

        case 'openai':
          if (!config.kbLlmOpenaiApiKey) errors.push('OpenAI API Key is required for KB LLM');
          break;
      }
    }

    // Validate vector store type
    if (config.vectorStoreType && !['chroma', 'pinecone', 'weaviate', 'milvus'].includes(config.vectorStoreType)) {
      errors.push(`Unknown vector store type: ${config.vectorStoreType}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Invalidate cache for a specific application
   * Call this when config is updated
   * @param applicationId - Application to invalidate
   */
  invalidateLLMCache(applicationId: string): void {
    this.llmConfigCache.delete(applicationId);
    console.log(`[ConfigManager] Invalidated LLM config cache for app: ${applicationId}`);
  }

  /**
   * Invalidate KB cache for a specific application
   * @param applicationId - Application to invalidate
   */
  invalidateKBCache(applicationId: string): void {
    this.kbConfigCache.delete(applicationId);
    console.log(`[ConfigManager] Invalidated KB config cache for app: ${applicationId}`);
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.llmConfigCache.clear();
    this.kbConfigCache.clear();
    console.log('[ConfigManager] Cleared all configuration caches');
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Get LLM config from cache if not expired
   */
  private getLLMConfigFromCache(applicationId: string): ILLMConfig | null {
    const entry = this.llmConfigCache.get(applicationId);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.llmConfigCache.delete(applicationId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set LLM config in cache with TTL
   */
  private setLLMConfigCache(applicationId: string, config: ILLMConfig): void {
    this.llmConfigCache.set(applicationId, {
      data: config,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Get KB config from cache if not expired
   */
  private getKBConfigFromCache(applicationId: string): IKnowledgeBaseConfig | null {
    const entry = this.kbConfigCache.get(applicationId);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.kbConfigCache.delete(applicationId);
      return null;
    }

    return entry.data;
  }

  /**
   * Set KB config in cache with TTL
   */
  private setKBConfigCache(applicationId: string, config: IKnowledgeBaseConfig): void {
    this.kbConfigCache.set(applicationId, {
      data: config,
      expiresAt: Date.now() + this.cacheTTL,
    });
  }

  /**
   * Decrypt sensitive fields in LLM config
   */
  private decryptConfig(config: ILLMConfig): ILLMConfig {
    const decrypted: ILLMConfig = { ...config };

    // Decrypt credentials
    if (decrypted.azureApiKey) {
      decrypted.azureApiKey = cryptoUtil.decrypt(decrypted.azureApiKey);
    }
    if (decrypted.api_key) {
      (decrypted as unknown as Record<string, unknown>).api_key = cryptoUtil.decrypt(decrypted.api_key as string);
    }
    if (decrypted.claudeApiKey) {
      decrypted.claudeApiKey = cryptoUtil.decrypt(decrypted.claudeApiKey);
    }
    if (decrypted.awsAccessKeyId) {
      decrypted.awsAccessKeyId = cryptoUtil.decrypt(decrypted.awsAccessKeyId);
    }
    if (decrypted.awsSecretAccessKey) {
      decrypted.awsSecretAccessKey = cryptoUtil.decrypt(decrypted.awsSecretAccessKey);
    }
    if (decrypted.openaiApiKey) {
      decrypted.openaiApiKey = cryptoUtil.decrypt(decrypted.openaiApiKey);
    }

    // Normalize field names for LLMClientFactory
    const normalized = this.normalizeLegacyFieldNames(decrypted as unknown as Record<string, unknown>);
    
    console.log('[ConfigManager] Decrypted and normalized LLM config:', {
      provider: (normalized as Record<string, unknown>).provider,
      has_api_key: !!(normalized as Record<string, unknown>).api_key,
      has_azure_endpoint: !!(normalized as Record<string, unknown>).azure_endpoint,
      has_deployment: !!(normalized as Record<string, unknown>).deployment,
    });

    return normalized as unknown as ILLMConfig;
  }

  /**
   * Normalize legacy field names to exact format for LLMClientFactory
   * Converts: azureApiKey → api_key, azureEndpoint → azure_endpoint, etc.
   * Also extracts base endpoint if full URL is provided
   */
  private normalizeLegacyFieldNames(config: Record<string, unknown>): Record<string, unknown> {
    const normalized = { ...config };

    // Convert Azure OpenAI legacy names to exact format
    if (config.azureApiKey && !config.api_key) {
      normalized.api_key = config.azureApiKey;
    }
    if (config.azureEndpoint && !config.azure_endpoint) {
      normalized.azure_endpoint = config.azureEndpoint;
    }
    if (config.azureDeploymentName && !config.deployment) {
      normalized.deployment = config.azureDeploymentName;
    }
    if (config.azureApiVersion && !config.api_version) {
      normalized.api_version = config.azureApiVersion;
    }

    // Also handle exact field names (not legacy)
    // If azure_endpoint is provided but it's the full URL, extract just the base
    if (normalized.azure_endpoint && typeof normalized.azure_endpoint === 'string') {
      let endpoint = normalized.azure_endpoint;
      
      // First, remove any query parameters from the URL
      if (endpoint.includes('?')) {
        const parts = endpoint.split('?');
        endpoint = parts[0] || endpoint;
      }
      
      // If endpoint includes the full path with /openai/deployments/, extract just the base
      if (endpoint.includes('/openai/deployments/')) {
        const parts = endpoint.split('/openai/deployments/');
        const baseUrl = parts[0] || endpoint;
        normalized.azure_endpoint = baseUrl;
        console.log('[v0] ConfigManager: Extracted base endpoint from full URL:', {
          original: normalized.azure_endpoint,
          extracted: baseUrl,
        });
      }
    }

    return normalized;
  }

  /**
   * Decrypt sensitive fields in KB config
   */
  private decryptKBConfig(config: IKnowledgeBaseConfig): IKnowledgeBaseConfig {
    const decrypted: IKnowledgeBaseConfig = { ...config };

    // Decrypt embedding provider credentials
    if (decrypted.embeddingOpenaiApiKey) {
      decrypted.embeddingOpenaiApiKey = cryptoUtil.decrypt(decrypted.embeddingOpenaiApiKey);
    }
    if (decrypted.embeddingAzureApiKey) {
      decrypted.embeddingAzureApiKey = cryptoUtil.decrypt(decrypted.embeddingAzureApiKey);
    }
    if (decrypted.embeddingAwsAccessKeyId) {
      decrypted.embeddingAwsAccessKeyId = cryptoUtil.decrypt(decrypted.embeddingAwsAccessKeyId);
    }
    if (decrypted.embeddingAwsSecretAccessKey) {
      decrypted.embeddingAwsSecretAccessKey = cryptoUtil.decrypt(decrypted.embeddingAwsSecretAccessKey);
    }

    // Decrypt KB LLM credentials
    if (decrypted.kbLlmAzureApiKey) {
      decrypted.kbLlmAzureApiKey = cryptoUtil.decrypt(decrypted.kbLlmAzureApiKey);
    }
    if (decrypted.kbLlmClaudeApiKey) {
      decrypted.kbLlmClaudeApiKey = cryptoUtil.decrypt(decrypted.kbLlmClaudeApiKey);
    }
    if (decrypted.kbLlmAwsAccessKeyId) {
      decrypted.kbLlmAwsAccessKeyId = cryptoUtil.decrypt(decrypted.kbLlmAwsAccessKeyId);
    }
    if (decrypted.kbLlmAwsSecretAccessKey) {
      decrypted.kbLlmAwsSecretAccessKey = cryptoUtil.decrypt(decrypted.kbLlmAwsSecretAccessKey);
    }
    if (decrypted.kbLlmOpenaiApiKey) {
      decrypted.kbLlmOpenaiApiKey = cryptoUtil.decrypt(decrypted.kbLlmOpenaiApiKey);
    }

    // Decrypt vector store API key if present
    if (decrypted.vectorStoreApiKey) {
      decrypted.vectorStoreApiKey = cryptoUtil.decrypt(decrypted.vectorStoreApiKey);
    }

    return decrypted;
  }

  /**
   * Create default Azure OpenAI config for new application
   */
  private async initializeDefaultLLMConfig(applicationId: string): Promise<ILLMConfig | null> {
    try {
      // Check if Azure OpenAI env vars are configured
      const azureEndpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const azureApiKey = process.env.AZURE_OPENAI_API_KEY;
      const azureDeploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-35-turbo';
      const azureApiVersion = process.env.AZURE_OPENAI_API_VERSION || '2023-05-15';

      if (!azureEndpoint || !azureApiKey) {
        console.warn('[ConfigManager] Azure OpenAI environment variables not configured. Cannot create default config.');
        return null;
      }

      const defaultConfig = {
        applicationId,
        provider: 'azure-openai' as const,
        azureEndpoint,
        azureApiKey: cryptoUtil.encrypt(azureApiKey),
        azureDeploymentName,
        azureApiVersion,
        temperature: 0.7,
        maxTokens: 2048,
        topP: 1,
        isDefault: true,
      };

      const validation = llmConfigService.validateConfig(defaultConfig);
      if (!validation.valid) {
        console.error('[ConfigManager] Default config validation failed:', validation.errors);
        return null;
      }

      const created = await llmConfigService.upsertConfig(defaultConfig);
      console.log(`[ConfigManager] Created default Azure OpenAI config for app: ${applicationId}`);
      return created;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ConfigManager] Failed to create default LLM config: ${message}`);
      return null;
    }
  }

  /**
   * Create default KB config for new application
   */
  private async initializeDefaultKBConfig(applicationId: string): Promise<IKnowledgeBaseConfig | null> {
    try {
      const embeddingOpenaiApiKey = process.env.OPENAI_API_KEY;

      if (!embeddingOpenaiApiKey) {
        console.warn('[ConfigManager] OpenAI environment variables not configured. Cannot create default KB config.');
        return null;
      }

      const defaultConfig = {
        applicationId,
        embeddingProvider: 'openai' as const,
        embeddingOpenaiApiKey: cryptoUtil.encrypt(embeddingOpenaiApiKey),
        kbLlmProvider: 'azure-openai' as const,
        vectorStoreType: 'chroma' as const,
        chunkSize: 1024,
        overlapSize: 100,
        temperature: 0.7,
        maxTokens: 2048,
      };

      const created = await kbConfigService.upsertConfig(defaultConfig);
      console.log(`[ConfigManager] Created default KB config for app: ${applicationId}`);
      return created;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[ConfigManager] Failed to create default KB config: ${message}`);
      return null;
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Error handler with logging
   */
  private handleError(method: string, error: unknown, context?: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    const contextStr = context ? ` (${context})` : '';
    console.error(`[ConfigManager.${method}]${contextStr} Error: ${message}`);
    return new Error(`Config Manager Error in ${method}: ${message}`);
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
