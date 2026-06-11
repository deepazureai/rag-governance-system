import { LLMConfig, KnowledgeBaseConfig } from '../../src/types/models.js';
import { llmConfigService } from './LLMConfigService.js';
import { kbConfigService } from './KnowledgeBaseConfigService.js';
import { LLMClientFactory, ILLMProvider } from './LLMClientFactory.js';

/**
 * LLM Provider Service
 * High-level service that retrieves configurations and creates appropriate LLM clients
 */
export class LLMProviderService {
  /**
   * Get recommendation LLM provider for an application
   * Retrieves config from DB and creates appropriate provider instance
   */
  async getRecommendationLLMProvider(applicationId: string): Promise<{ provider: ILLMProvider; config: LLMConfig }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const config = await llmConfigService.getDefaultConfig(applicationId);

      if (!config) {
        throw new Error(`No LLM configuration found for application: ${applicationId}`);
      }

      // Validate configuration has required fields
      const validation = llmConfigService['validateConfig'](config);
      if (!validation.valid) {
        throw new Error(`Invalid LLM configuration: ${validation.errors.join(', ')}`);
      }

      const provider = LLMClientFactory.create(config);
      return { provider, config };
    } catch (error: unknown) {
      throw this.handleError('getRecommendationLLMProvider', error);
    }
  }

  /**
   * Get KB NLP LLM provider for knowledge base responses
   * Retrieves KB config and creates appropriate LLM provider for NLP responses
   */
  async getKBNLPLLMProvider(applicationId: string): Promise<{ provider: ILLMProvider; config: KnowledgeBaseConfig }> {
    try {
      console.log('[v0] getKBNLPLLMProvider called for app:', applicationId);
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const kbConfig = await kbConfigService.getConfig(applicationId);
      console.log('[v0] KB config retrieved from service:', { 
        found: !!kbConfig, 
        provider: (kbConfig as any)?.kbLlmProvider,
        has_endpoint: !!(kbConfig as any)?.kbllm_azure_endpoint
      });

      if (!kbConfig) {
        throw new Error(`No Knowledge Base configuration found for application: ${applicationId}`);
      }

      console.log('[v0] KB config retrieved:', {
        applicationId,
        provider: (kbConfig as any).kbLlmProvider,
        has_kbllm_api_key: !!(kbConfig as any).kbllm_api_key,
        has_kbLlmAzureApiKey: !!(kbConfig as any).kbLlmAzureApiKey,
        has_kbllm_azure_endpoint: !!(kbConfig as any).kbllm_azure_endpoint,
        has_kbLlmAzureEndpoint: !!(kbConfig as any).kbLlmAzureEndpoint,
        has_kbllm_deployment: !!(kbConfig as any).kbllm_deployment,
        has_kbLlmAzureDeploymentName: !!(kbConfig as any).kbLlmAzureDeploymentName,
        all_keys: Object.keys(kbConfig as any),
      });

      // Validate KB NLP LLM fields
      const validation = kbConfigService['validateConfig'](kbConfig);
      if (!validation.valid) {
        throw new Error(`Invalid KB NLP LLM configuration: ${validation.errors.join(', ')}`);
      }

      // Create a temporary LLMConfig from KB NLP settings using standard field names
      // (normalization already done in route handler, so fields are in standard format)
      const llmConfig: LLMConfig = {
        applicationId,
        provider: (kbConfig as any).kbLlmProvider as 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai',
        // Standard field names (kbllm_* for exact params, legacy names for compatibility)
        // AZURE OPENAI - try snake_case first, then legacy camelCase
        api_key: (kbConfig as any).kbllm_api_key || (kbConfig as any).kbLlmAzureApiKey || (kbConfig as any).kbLlmOpenaiApiKey || (kbConfig as any).kbLlmClaudeApiKey || (kbConfig as any).kbllm_aws_access_key_id || (kbConfig as any).kbLlmAwsAccessKeyId,
        azure_endpoint: (kbConfig as any).kbllm_azure_endpoint || (kbConfig as any).kbLlmAzureEndpoint,
        api_version: (kbConfig as any).kbllm_api_version || (kbConfig as any).kbLlmAzureApiVersion,
        deployment: (kbConfig as any).kbllm_deployment || (kbConfig as any).kbLlmAzureDeploymentName,
        skipSslVerification: (kbConfig as any).kbllm_skipSslVerification,
        // CLAUDE
        claudeApiKey: (kbConfig as any).kbllm_claude_api_key || (kbConfig as any).kbLlmClaudeApiKey,
        claudeModel: (kbConfig as any).kbllm_claude_model || (kbConfig as any).kbLlmClaudeModel,
        // AWS BEDROCK
        awsRegion: (kbConfig as any).kbllm_aws_region || (kbConfig as any).kbLlmAwsRegion,
        awsAccessKeyId: (kbConfig as any).kbllm_aws_access_key_id || (kbConfig as any).kbLlmAwsAccessKeyId,
        awsSecretAccessKey: (kbConfig as any).kbllm_aws_secret_access_key || (kbConfig as any).kbLlmAwsSecretAccessKey,
        bedrockModelId: (kbConfig as any).kbllm_bedrock_model_id || (kbConfig as any).kbLlmBedrockModelId,
        // OPENAI
        openaiApiKey: (kbConfig as any).kbllm_openai_api_key || (kbConfig as any).kbLlmOpenaiApiKey,
        openaiModel: (kbConfig as any).kbllm_openai_model || (kbConfig as any).kbLlmOpenaiModel,
        // Legacy fields for backward compatibility (Azure)
        azureEndpoint: (kbConfig as any).kbllm_azure_endpoint || (kbConfig as any).kbLlmAzureEndpoint,
        azureApiKey: (kbConfig as any).kbllm_api_key || (kbConfig as any).kbLlmAzureApiKey,
        azureDeploymentName: (kbConfig as any).kbllm_deployment || (kbConfig as any).kbLlmAzureDeploymentName,
        azureApiVersion: (kbConfig as any).kbllm_api_version || (kbConfig as any).kbLlmAzureApiVersion,
        temperature: (kbConfig as any).temperature,
        maxTokens: (kbConfig as any).maxTokens,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('[v0] Created llmConfig from KB config:', {
        provider: llmConfig.provider,
        api_key_first_20: llmConfig.api_key ? llmConfig.api_key.substring(0, 20) + '...' : 'NOT SET',
        api_key_full: llmConfig.api_key,
        azureApiKey_first_20: llmConfig.azureApiKey ? llmConfig.azureApiKey.substring(0, 20) + '...' : 'NOT SET',
        azureApiKey_full: llmConfig.azureApiKey,
        azure_endpoint: llmConfig.azure_endpoint,
        azureEndpoint: llmConfig.azureEndpoint,
        deployment: llmConfig.deployment,
        azureDeploymentName: llmConfig.azureDeploymentName,
        api_version: llmConfig.api_version,
        azureApiVersion: llmConfig.azureApiVersion,
      });

      const provider = LLMClientFactory.create(llmConfig);
      return { provider, config: kbConfig };
    } catch (error: unknown) {
      console.error('[v0] getKBNLPLLMProvider error:', error instanceof Error ? error.message : String(error));
      throw this.handleError('getKBNLPLLMProvider', error);
    }
  }

  /**
   * Validate LLM configuration connectivity (test connection)
   */
  async validateLLMConnection(applicationId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const { provider } = await this.getRecommendationLLMProvider(applicationId);
      return await provider.validate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: message };
    }
  }

  /**
   * Validate KB NLP LLM configuration connectivity
   */
  async validateKBLLMConnection(applicationId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      console.log('[v0] validateKBLLMConnection called for app:', applicationId);
      const { provider } = await this.getKBNLPLLMProvider(applicationId);
      console.log('[v0] Got KB NLP LLM provider, validating...');
      return await provider.validate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[v0] validateKBLLMConnection error:', message);
      return { valid: false, error: message };
    }
  }

  /**
   * Validate KB Embeddings LLM configuration connectivity
   */
  async validateKBEmbeddingsConnection(applicationId: string): Promise<{ valid: boolean; error?: string }> {
    try {
      console.log('[v0] validateKBEmbeddingsConnection called for app:', applicationId);
      const config = await kbConfigService.getConfig(applicationId);
      
      if (!config) {
        return { valid: false, error: 'KB Configuration not found' };
      }

      const embeddingProvider = (config as any).embeddingProvider;
      
      if (!embeddingProvider) {
        console.log('[v0] No embeddings provider configured - this is optional');
        return { valid: true, message: 'No embeddings provider configured (optional)' } as any;
      }

      console.log('[v0] Embedding provider:', embeddingProvider);
      
      // Extract embedding credentials from config
      const embeddingConfig = {
        provider: embeddingProvider,
        api_key: (config as any).embedding_api_key,
        azure_endpoint: (config as any).embedding_azure_endpoint,
        api_version: (config as any).embedding_api_version,
        deployment: (config as any).embedding_deployment,
        skipSslVerification: (config as any).embedding_skipSslVerification,
      };

      console.log('[v0] Embedding config fields:', {
        provider: embeddingConfig.provider,
        api_key_set: !!embeddingConfig.api_key,
        azure_endpoint_set: !!embeddingConfig.azure_endpoint,
        api_version_set: !!embeddingConfig.api_version,
        deployment_set: !!embeddingConfig.deployment,
      });

      // Create provider instance for embeddings
      const provider = LLMClientFactory.createProvider(embeddingConfig as any);
      console.log('[v0] Created embeddings provider, validating...');
      return await provider.validate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[v0] validateKBEmbeddingsConnection error:', message);
      return { valid: false, error: message };
    }
  }

  /**
   * Generate recommendation text using configured LLM
   */
  async generateRecommendation(applicationId: string, prompt: string): Promise<string> {
    try {
      const { provider } = await this.getRecommendationLLMProvider(applicationId);
      return await provider.generate(prompt, {
        systemPrompt: 'You are an expert at analyzing prompts and providing improvement suggestions. Be concise and actionable.',
        temperature: 0.7,
      });
    } catch (error: unknown) {
      throw this.handleError('generateRecommendation', error);
    }
  }

  /**
   * Generate KB NLP response using configured LLM
   */
  async generateKBResponse(applicationId: string, prompt: string, context: string): Promise<string> {
    try {
      const { provider } = await this.getKBNLPLLMProvider(applicationId);
      const fullPrompt = `Context:\n${context}\n\nQuestion: ${prompt}\n\nProvide a concise answer based on the context.`;
      return await provider.generate(fullPrompt, {
        temperature: 0.5,
      });
    } catch (error: unknown) {
      throw this.handleError('generateKBResponse', error);
    }
  }

  /**
   * Handle errors with proper logging
   */
  private handleError(method: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[LLMProviderService.${method}] Error: ${message}`);
    return new Error(`LLM Provider Service Error in ${method}: ${message}`);
  }
}

export const llmProviderService = new LLMProviderService();
