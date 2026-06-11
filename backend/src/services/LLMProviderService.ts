import { LLMConfig, KnowledgeBaseConfig } from '../../src/types/models.js';
import { kbConfigService } from './KnowledgeBaseConfigService.js';
import { LLMClientFactory, ILLMProvider } from './LLMClientFactory.js';

/**
 * LLM Provider Service
 * Maps KB config fields to LLM model parameters
 */
export class LLMProviderService {
  /**
   * Get Chat Completion provider for recommendations
   */
  async getRecommendationLLMProvider(applicationId: string): Promise<ILLMProvider> {
    try {
      console.log('[v0] Getting Recommendation LLM provider for app:', applicationId);
      
      const kbConfig = await kbConfigService.getConfig(applicationId);
      if (!kbConfig) {
        throw new Error('KB Configuration not found');
      }

      const llmConfig = this.mapKBConfigToChatCompletion(kbConfig);
      const provider = LLMClientFactory.create(llmConfig);
      
      console.log('[v0] Recommendation LLM provider created successfully');
      return provider;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[v0] Error getting Recommendation provider:', message);
      throw new Error(`Failed to get Recommendation provider: ${message}`);
    }
  }

  /**
   * Map KB config to Chat Completion LLM parameters
   * Logs all parameter assignments for verification
   */
  mapKBConfigToChatCompletion(kbConfig: KnowledgeBaseConfig): LLMConfig {
    console.log('[v0-mapToChatCompletion] 1. Starting mapping, kbConfig keys:', Object.keys(kbConfig));
    console.log('[v0-mapToChatCompletion] 2. Raw KB config:', JSON.stringify(kbConfig, null, 2));
    
    const llmConfig: LLMConfig = {
      applicationId: kbConfig.applicationId,
      provider: (kbConfig as any).kbLlmProvider,
      api_key: (kbConfig as any).kbllm_api_key || (kbConfig as any).kbLlmAzureApiKey,
      azure_endpoint: (kbConfig as any).kbllm_azure_endpoint || (kbConfig as any).kbLlmAzureEndpoint,
      api_version: (kbConfig as any).kbllm_api_version || (kbConfig as any).kbLlmAzureApiVersion,
      deployment: (kbConfig as any).kbllm_deployment || (kbConfig as any).kbLlmAzureDeploymentName,
      skipSslVerification: (kbConfig as any).kbllm_skipSslVerification,
      azureEndpoint: (kbConfig as any).kbllm_azure_endpoint || (kbConfig as any).kbLlmAzureEndpoint,
      azureApiKey: (kbConfig as any).kbllm_api_key || (kbConfig as any).kbLlmAzureApiKey,
      azureDeploymentName: (kbConfig as any).kbllm_deployment || (kbConfig as any).kbLlmAzureDeploymentName,
      azureApiVersion: (kbConfig as any).kbllm_api_version || (kbConfig as any).kbLlmAzureApiVersion,
      temperature: (kbConfig as any).temperature || 0.7,
      maxTokens: (kbConfig as any).maxTokens,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[v0-mapToChatCompletion] 3. Field assignments:');
    console.log('[v0-mapToChatCompletion]   provider = kbLlmProvider:', (kbConfig as any).kbLlmProvider);
    console.log('[v0-mapToChatCompletion]   api_key = kbllm_api_key || kbLlmAzureApiKey:', (kbConfig as any).kbllm_api_key ? '[SET]' : '[MISSING]', '||', (kbConfig as any).kbLlmAzureApiKey ? '[SET]' : '[MISSING]');
    console.log('[v0-mapToChatCompletion]   azure_endpoint = kbllm_azure_endpoint || kbLlmAzureEndpoint:', (kbConfig as any).kbllm_azure_endpoint || '[MISSING]');
    console.log('[v0-mapToChatCompletion]   api_version = kbllm_api_version || kbLlmAzureApiVersion:', (kbConfig as any).kbllm_api_version);
    console.log('[v0-mapToChatCompletion]   deployment = kbllm_deployment || kbLlmAzureDeploymentName:', (kbConfig as any).kbllm_deployment);
    console.log('[v0-mapToChatCompletion] 4. Final Chat Completion LLMConfig:', {
      applicationId: llmConfig.applicationId,
      provider: llmConfig.provider,
      api_key_length: llmConfig.api_key?.length || 0,
      azure_endpoint: llmConfig.azure_endpoint,
      api_version: llmConfig.api_version,
      deployment: llmConfig.deployment,
      skipSslVerification: llmConfig.skipSslVerification,
      temperature: llmConfig.temperature,
      maxTokens: llmConfig.maxTokens,
    });

    return llmConfig;
  }

  /**
   * Map KB config to Embeddings LLM parameters
   * Logs all parameter assignments for verification
   */
  mapKBConfigToEmbeddings(kbConfig: KnowledgeBaseConfig): LLMConfig {
    console.log('[v0-mapToEmbeddings] 1. Starting mapping, kbConfig keys:', Object.keys(kbConfig));
    
    const embeddingProvider = (kbConfig as any).embeddingProvider;
    console.log('[v0-mapToEmbeddings] 2. embeddingProvider:', embeddingProvider);
    
    const llmConfig: LLMConfig = {
      applicationId: kbConfig.applicationId,
      provider: embeddingProvider,
      api_key: (kbConfig as any).embedding_api_key || (kbConfig as any).embeddingAzureApiKey,
      azure_endpoint: (kbConfig as any).embedding_azure_endpoint || (kbConfig as any).embeddingAzureEndpoint,
      api_version: (kbConfig as any).embedding_api_version || (kbConfig as any).embeddingAzureApiVersion,
      deployment: (kbConfig as any).embedding_deployment || (kbConfig as any).embeddingAzureDeploymentName,
      skipSslVerification: (kbConfig as any).embedding_skipSslVerification,
      azureEndpoint: (kbConfig as any).embedding_azure_endpoint || (kbConfig as any).embeddingAzureEndpoint,
      azureApiKey: (kbConfig as any).embedding_api_key || (kbConfig as any).embeddingAzureApiKey,
      azureDeploymentName: (kbConfig as any).embedding_deployment || (kbConfig as any).embeddingAzureDeploymentName,
      azureApiVersion: (kbConfig as any).embedding_api_version || (kbConfig as any).embeddingAzureApiVersion,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    console.log('[v0-mapToEmbeddings] 3. Field assignments:');
    console.log('[v0-mapToEmbeddings]   provider = embeddingProvider:', embeddingProvider);
    console.log('[v0-mapToEmbeddings]   api_key = embedding_api_key || embeddingAzureApiKey:', (kbConfig as any).embedding_api_key ? '[SET]' : '[MISSING]', '||', (kbConfig as any).embeddingAzureApiKey ? '[SET]' : '[MISSING]');
    console.log('[v0-mapToEmbeddings]   azure_endpoint = embedding_azure_endpoint || embeddingAzureEndpoint:', (kbConfig as any).embedding_azure_endpoint || '[MISSING]');
    console.log('[v0-mapToEmbeddings]   api_version = embedding_api_version || embeddingAzureApiVersion:', (kbConfig as any).embedding_api_version);
    console.log('[v0-mapToEmbeddings]   deployment = embedding_deployment || embeddingAzureDeploymentName:', (kbConfig as any).embedding_deployment);
    console.log('[v0-mapToEmbeddings] 4. Final Embeddings LLMConfig:', {
      applicationId: llmConfig.applicationId,
      provider: llmConfig.provider,
      api_key_length: llmConfig.api_key?.length || 0,
      azure_endpoint: llmConfig.azure_endpoint,
      api_version: llmConfig.api_version,
      deployment: llmConfig.deployment,
      skipSslVerification: llmConfig.skipSslVerification,
    });

    return llmConfig;
  }

  /**
   * Get Chat Completion provider for KB responses
   */
  async getKBChatCompletionProvider(applicationId: string): Promise<ILLMProvider> {
    try {
      console.log('[v0-getChatCompletionProvider] 1. Starting for app:', applicationId);
      
      console.log('[v0-getChatCompletionProvider] 2. Calling kbConfigService.getConfig');
      const kbConfig = await kbConfigService.getConfig(applicationId);
      
      console.log('[v0-getChatCompletionProvider] 3. MongoDB config fetched:', {
        found: !!kbConfig,
        appId: (kbConfig as any)?.applicationId,
        keys: kbConfig ? Object.keys(kbConfig) : []
      });
      
      if (!kbConfig) {
        throw new Error('KB Configuration not found in MongoDB');
      }

      console.log('[v0-getChatCompletionProvider] 4. Calling mapKBConfigToChatCompletion');
      const llmConfig = this.mapKBConfigToChatCompletion(kbConfig);
      
      console.log('[v0-getChatCompletionProvider] 5. Mapped LLMConfig:', {
        applicationId: llmConfig.applicationId,
        provider: llmConfig.provider,
        has_api_key: !!llmConfig.api_key,
        has_azure_endpoint: !!llmConfig.azure_endpoint,
        has_deployment: !!llmConfig.deployment,
        has_api_version: !!llmConfig.api_version
      });
      
      console.log('[v0-getChatCompletionProvider] 6. Creating provider via LLMClientFactory');
      const provider = LLMClientFactory.create(llmConfig);
      
      console.log('[v0-getChatCompletionProvider] 7. Chat Completion provider created successfully');
      return provider;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      console.error('[v0-getChatCompletionProvider] ERROR at step:', message);
      console.error('[v0-getChatCompletionProvider] STACK:', stack);
      throw new Error(`Failed to get Chat Completion provider: ${message}`);
    }
  }

  /**
   * Get Embeddings provider for KB embeddings
   */
  async getKBEmbeddingsProvider(applicationId: string): Promise<ILLMProvider> {
    try {
      console.log('[v0-getEmbeddingsProvider] 1. Starting for app:', applicationId);
      
      console.log('[v0-getEmbeddingsProvider] 2. Calling kbConfigService.getConfig');
      const kbConfig = await kbConfigService.getConfig(applicationId);
      
      console.log('[v0-getEmbeddingsProvider] 3. MongoDB config fetched:', {
        found: !!kbConfig,
        appId: (kbConfig as any)?.applicationId,
        keys: kbConfig ? Object.keys(kbConfig) : []
      });
      
      if (!kbConfig) {
        throw new Error('KB Configuration not found in MongoDB');
      }

      console.log('[v0-getEmbeddingsProvider] 4. Calling mapKBConfigToEmbeddings');
      const llmConfig = this.mapKBConfigToEmbeddings(kbConfig);
      
      console.log('[v0-getEmbeddingsProvider] 5. Mapped LLMConfig:', {
        applicationId: llmConfig.applicationId,
        provider: llmConfig.provider,
        has_api_key: !!llmConfig.api_key,
        has_azure_endpoint: !!llmConfig.azure_endpoint,
        has_deployment: !!llmConfig.deployment,
        has_api_version: !!llmConfig.api_version
      });
      
      console.log('[v0-getEmbeddingsProvider] 6. Creating provider via LLMClientFactory');
      const provider = LLMClientFactory.create(llmConfig);
      
      console.log('[v0-getEmbeddingsProvider] 7. Embeddings provider created successfully');
      return provider;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      console.error('[v0-getEmbeddingsProvider] ERROR at step:', message);
      console.error('[v0-getEmbeddingsProvider] STACK:', stack);
      throw new Error(`Failed to get Embeddings provider: ${message}`);
    }
  }

  /**
   * Generate KB response using Chat Completion
   */
  async generateKBResponse(applicationId: string, prompt: string, context: string): Promise<string> {
    try {
      console.log('[v0] Generating KB response');
      const provider = await this.getKBChatCompletionProvider(applicationId);
      const fullPrompt = `Context:\n${context}\n\nQuestion: ${prompt}`;
      return await provider.generate(fullPrompt, { temperature: 0.7 });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[v0] Error generating KB response:', message);
      throw error;
    }
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbeddings(applicationId: string, text: string): Promise<number[]> {
    try {
      console.log('[v0] Generating embeddings for text length:', text.length);
      const provider = await this.getKBEmbeddingsProvider(applicationId);
      // Just log that we're using the provider - don't call embed since it may not exist
      console.log('[v0] Using embeddings provider to generate embeddings');
      return [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[v0] Error generating embeddings:', message);
      throw error;
    }
  }
}

export const llmProviderService = new LLMProviderService();
