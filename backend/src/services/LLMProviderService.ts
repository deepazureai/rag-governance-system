import { LLMConfig, KnowledgeBaseConfig } from '../../src/types/models';
import { llmConfigService } from './LLMConfigService';
import { kbConfigService } from './KnowledgeBaseConfigService';
import { LLMClientFactory, ILLMProvider } from './LLMClientFactory';

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
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const kbConfig = await kbConfigService.getConfig(applicationId);

      if (!kbConfig) {
        throw new Error(`No Knowledge Base configuration found for application: ${applicationId}`);
      }

      // Validate KB NLP LLM fields
      const validation = kbConfigService['validateConfig'](kbConfig);
      if (!validation.valid) {
        throw new Error(`Invalid KB NLP LLM configuration: ${validation.errors.join(', ')}`);
      }

      // Create a temporary LLMConfig from KB NLP settings
      const llmConfig: LLMConfig = {
        applicationId,
        provider: kbConfig.kbLlmProvider as 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai',
        azureEndpoint: kbConfig.kbLlmAzureEndpoint,
        azureApiKey: kbConfig.kbLlmAzureApiKey,
        azureDeploymentName: kbConfig.kbLlmAzureDeploymentName,
        claudeApiKey: kbConfig.kbLlmClaudeApiKey,
        claudeModel: kbConfig.kbLlmClaudeModel,
        awsRegion: kbConfig.kbLlmAwsRegion,
        awsAccessKeyId: kbConfig.kbLlmAwsAccessKeyId,
        awsSecretAccessKey: kbConfig.kbLlmAwsSecretAccessKey,
        bedrockModelId: kbConfig.kbLlmBedrockModelId,
        openaiApiKey: kbConfig.kbLlmOpenaiApiKey,
        openaiModel: kbConfig.kbLlmOpenaiModel,
        temperature: kbConfig.temperature,
        maxTokens: kbConfig.maxTokens,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = LLMClientFactory.create(llmConfig);
      return { provider, config: kbConfig };
    } catch (error: unknown) {
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
      const { provider } = await this.getKBNLPLLMProvider(applicationId);
      return await provider.validate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
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
