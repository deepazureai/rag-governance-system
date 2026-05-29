import { OpenAI } from 'openai';
import { ILLMConfig } from '../models/LLMConfig.js';
import { cryptoUtil } from '../utils/CryptoUtil.js';

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

/**
 * Create an Azure OpenAI client from application-specific LLM config
 * Supports exact parameter names (api_key, azure_endpoint, etc.) and legacy names
 */
export function createAzureOpenAIClientFromConfig(llmConfig: ILLMConfig): OpenAI {
  if (llmConfig.provider !== 'azure-openai') {
    throw new Error(`Invalid provider: ${llmConfig.provider}. Expected 'azure-openai'.`);
  }

  // Get credentials from exact parameter names (new) or legacy names
  const apiKey = llmConfig.api_key || llmConfig.azureApiKey;
  const endpoint = llmConfig.azure_endpoint || llmConfig.azureEndpoint;
  const apiVersion = llmConfig.api_version || llmConfig.azureApiVersion || '2024-02-15-preview';
  const deploymentName = llmConfig.deployment || llmConfig.azureDeploymentName;

  if (!apiKey || !endpoint || !deploymentName) {
    throw new Error(
      `Incomplete Azure OpenAI config for app ${llmConfig.applicationId}. ` +
      `Missing: ${!apiKey ? 'api_key ' : ''}${!endpoint ? 'azure_endpoint ' : ''}${!deploymentName ? 'deployment' : ''}`
    );
  }

  // Decrypt credentials if encrypted
  let decryptedApiKey = apiKey;
  try {
    decryptedApiKey = cryptoUtil.decrypt(apiKey);
  } catch {
    // Already decrypted or not encrypted, use as-is
    decryptedApiKey = apiKey;
  }

  // Extract instance name from endpoint URL
  const instanceName = endpoint.replace('https://', '').replace('.openai.azure.com/', '');

  const client = new OpenAI({
    apiKey: decryptedApiKey,
    baseURL: `${endpoint}/openai/deployments`,
    defaultHeaders: {
      'api-key': decryptedApiKey,
    },
    defaultQuery: { 'api-version': apiVersion },
  });

  console.log(`[AzureOpenAI] Created client for app ${llmConfig.applicationId} using deployment: ${deploymentName}`);
  return client;
}

/**
 * Extract deployment name from LLMConfig
 */
export function getDeploymentNameFromConfig(llmConfig: ILLMConfig): string {
  if (llmConfig.provider !== 'azure-openai') {
    throw new Error(`Invalid provider: ${llmConfig.provider}`);
  }
  return llmConfig.deployment || llmConfig.azureDeploymentName || 'gpt-4-turbo';
}
