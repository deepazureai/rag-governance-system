import { OpenAI } from 'openai';

/**
 * Azure OpenAI Configuration Service
 * Initializes and manages Azure OpenAI client for LLM-as-Judge evaluations
 */

let azureOpenAIClient: OpenAI | null = null;

export function initializeAzureOpenAI(): OpenAI {
  if (azureOpenAIClient) {
    return azureOpenAIClient;
  }

  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';

  if (!apiKey || !endpoint) {
    throw new Error(
      'Azure OpenAI configuration incomplete. Set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT'
    );
  }

  azureOpenAIClient = new OpenAI({
    apiKey,
    baseURL: `${endpoint}/openai/deployments`,
    defaultHeaders: {
      'api-key': apiKey,
    },
    defaultQuery: { 'api-version': apiVersion },
  });

  console.log('[AzureOpenAI] Client initialized with endpoint:', endpoint);
  return azureOpenAIClient;
}

export function getAzureOpenAIClient(): OpenAI {
  if (!azureOpenAIClient) {
    throw new Error('Azure OpenAI client not initialized. Call initializeAzureOpenAI() first.');
  }
  return azureOpenAIClient;
}

export function getDeploymentId(): string {
  return process.env.AZURE_OPENAI_DEPLOYMENT_ID || 'gpt-4';
}

export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  apiVersion: string;
  deploymentId: string;
}

export function getConfig(): AzureOpenAIConfig {
  return {
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || '',
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
    deploymentId: process.env.AZURE_OPENAI_DEPLOYMENT_ID || 'gpt-4',
  };
}
