import { LLMConfig } from '../types/models.js';

/**
 * LLM Provider Interface
 * All LLM providers must implement this contract
 */
export interface ILLMProvider {
  /**
   * Generate text response from prompt
   */
  generate(prompt: string, options?: LLMGenerationOptions): Promise<string>;

  /**
   * Validate that provider is properly configured
   */
  validate(): Promise<{ valid: boolean; error?: string }>;
}

export interface LLMGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  systemPrompt?: string;
}

/**
 * Azure OpenAI LLM Provider
 */
export class AzureOpenAIProvider implements ILLMProvider {
  private endpoint: string;
  private apiKey: string;
  private deploymentName: string;
  private apiVersion: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    if (!config.azureEndpoint || !config.azureApiKey || !config.azureDeploymentName || !config.azureApiVersion) {
      throw new Error('Missing required Azure OpenAI configuration fields');
    }

    this.endpoint = config.azureEndpoint;
    this.apiKey = config.azureApiKey;
    this.deploymentName = config.azureDeploymentName;
    this.apiVersion = config.azureApiVersion;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  async generate(prompt: string, options?: LLMGenerationOptions): Promise<string> {
    try {
      const temperature = options?.temperature ?? this.temperature;
      const maxTokens = options?.maxTokens ?? this.maxTokens;

      const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: options?.topP ?? 1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Azure OpenAI API error: ${response.statusText} - ${error}`);
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? '';

      if (!content) {
        throw new Error('No response content from Azure OpenAI');
      }

      return content;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Azure OpenAI Provider Error: ${message}`);
    }
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const prompt = 'Test message';
      const result = await this.generate(prompt, { maxTokens: 10 });
      return { valid: typeof result === 'string' && result.length > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: `Validation failed: ${message}` };
    }
  }
}

/**
 * OpenAI LLM Provider
 */
export class OpenAIProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    if (!config.openaiApiKey || !config.openaiModel) {
      throw new Error('Missing required OpenAI configuration fields');
    }

    this.apiKey = config.openaiApiKey;
    this.model = config.openaiModel;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  async generate(prompt: string, options?: LLMGenerationOptions): Promise<string> {
    try {
      const temperature = options?.temperature ?? this.temperature;
      const maxTokens = options?.maxTokens ?? this.maxTokens;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            ...(options?.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: options?.topP ?? 1,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${response.statusText} - ${error}`);
      }

      const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = data.choices?.[0]?.message?.content ?? '';

      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return content;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`OpenAI Provider Error: ${message}`);
    }
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const prompt = 'Test message';
      const result = await this.generate(prompt, { maxTokens: 10 });
      return { valid: typeof result === 'string' && result.length > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: `Validation failed: ${message}` };
    }
  }
}

/**
 * Claude LLM Provider
 */
export class ClaudeProvider implements ILLMProvider {
  private apiKey: string;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    if (!config.claudeApiKey || !config.claudeModel) {
      throw new Error('Missing required Claude configuration fields');
    }

    this.apiKey = config.claudeApiKey;
    this.model = config.claudeModel;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  async generate(prompt: string, options?: LLMGenerationOptions): Promise<string> {
    try {
      const temperature = options?.temperature ?? this.temperature;
      const maxTokens = options?.maxTokens ?? this.maxTokens;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: maxTokens,
          system: options?.systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Claude API error: ${response.statusText} - ${error}`);
      }

      const data = (await response.json()) as { content?: Array<{ text?: string }> };
      const content = data.content?.[0]?.text ?? '';

      if (!content) {
        throw new Error('No response content from Claude');
      }

      return content;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Claude Provider Error: ${message}`);
    }
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    try {
      const prompt = 'Test message';
      const result = await this.generate(prompt, { maxTokens: 10 });
      return { valid: typeof result === 'string' && result.length > 0 };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, error: `Validation failed: ${message}` };
    }
  }
}

/**
 * AWS Bedrock LLM Provider
 */
export class AWSBedrockProvider implements ILLMProvider {
  private region: string;
  private modelId: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    if (!config.awsRegion || !config.bedrockModelId) {
      throw new Error('Missing required AWS Bedrock configuration fields');
    }

    this.region = config.awsRegion;
    this.modelId = config.bedrockModelId;
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 2048;
  }

  async generate(prompt: string, options?: LLMGenerationOptions): Promise<string> {
    try {
      // AWS Bedrock integration would use AWS SDK
      // This is a placeholder implementation showing the structure
      throw new Error('AWS Bedrock integration requires AWS SDK setup');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`AWS Bedrock Provider Error: ${message}`);
    }
  }

  async validate(): Promise<{ valid: boolean; error?: string }> {
    return {
      valid: false,
      error: 'AWS Bedrock validation not yet implemented',
    };
  }
}

/**
 * LLM Client Factory
 * Creates appropriate LLM provider based on configuration
 */
export class LLMClientFactory {
  /**
   * Create LLM provider from configuration
   */
  static create(config: LLMConfig): ILLMProvider {
    if (!config.provider) {
      throw new Error('LLM provider not specified in configuration');
    }

    switch (config.provider) {
      case 'azure-openai':
        return new AzureOpenAIProvider(config);

      case 'openai':
        return new OpenAIProvider(config);

      case 'claude':
        return new ClaudeProvider(config);

      case 'aws-bedrock':
        return new AWSBedrockProvider(config);

      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Get list of supported providers with their required fields
   */
  static getSupportedProviders(): Array<{
    name: string;
    provider: string;
    requiredFields: string[];
  }> {
    return [
      {
        name: 'Azure OpenAI',
        provider: 'azure-openai',
        requiredFields: ['azureEndpoint', 'azureApiKey', 'azureDeploymentName', 'azureApiVersion'],
      },
      {
        name: 'OpenAI',
        provider: 'openai',
        requiredFields: ['openaiApiKey', 'openaiModel'],
      },
      {
        name: 'Claude (Anthropic)',
        provider: 'claude',
        requiredFields: ['claudeApiKey', 'claudeModel'],
      },
      {
        name: 'AWS Bedrock',
        provider: 'aws-bedrock',
        requiredFields: ['awsRegion', 'awsAccessKeyId', 'awsSecretAccessKey', 'bedrockModelId'],
      },
    ];
  }
}
