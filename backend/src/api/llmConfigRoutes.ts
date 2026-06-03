import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import { Types } from 'mongoose';
import { llmConfigService } from '../services/LLMConfigService.js';
import { kbConfigService } from '../services/KBConfigService.js';
import { llmProviderService } from '../services/LLMProviderService.js';
import { LLMClientFactory } from '../services/LLMClientFactory.js';
import { LLMConfigSchema, KnowledgeBaseConfigSchema } from '../schemas/index.js';
import { logger } from '../utils/logger.js';
import { getQueryString } from '../utils/queryParamUtils.js';
import type { ILLMConfig, IKnowledgeBaseConfig, ApiResponse } from '../types/models.js';

const llmConfigRouter: ExpressRouter = Router();

/**
 * Normalize legacy field names to exact format for LLMClientFactory
 * Converts: azureApiKey → api_key, azureEndpoint → azure_endpoint, etc.
 * Also extracts base endpoint if full URL is provided
 */
function normalizeLegacyFieldNames(config: Record<string, unknown>): Record<string, unknown> {
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
      console.log('[v0] Extracted base endpoint from full URL:', {
        original: normalized.azure_endpoint,
        extracted: baseUrl,
      });
    }
  }

  return normalized;
}

/**
 * GET /api/llm-config/app/:appId
 * Get LLM configuration for an application
 */
llmConfigRouter.get('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const config = await llmConfigService.getConfig(appId);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'LLM configuration not found',
      } as ApiResponse<ILLMConfig>);
      return;
    }

    res.json({
      success: true,
      data: config,
    } as ApiResponse<ILLMConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/llm-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<ILLMConfig>);
  }
});

/**
 * POST /api/llm-config/app/:appId
 * Save or update LLM configuration
 */
llmConfigRouter.post('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // Log incoming request for debugging
    console.error('[v0] LLM Config POST request body:', JSON.stringify(body, null, 2));

    // Normalize legacy field names to exact format BEFORE validation
    const normalized = normalizeLegacyFieldNames(body);
    console.error('[v0] Normalized LLM Config:', JSON.stringify(normalized, null, 2));

    // Validate request body with normalized names
    const validation = LLMConfigSchema.safeParse({ ...normalized, applicationId: appId });
    if (!validation.success) {
      const errorDetails = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      console.error('[v0] LLM Config validation errors:', errorDetails);
      res.status(400).json({
        success: false,
        error: `Validation failed: ${errorDetails}`,
      } as ApiResponse<ILLMConfig>);
      return;
    }

    const configData = validation.data;

    // Validate provider-specific required fields
    if (configData.provider === 'azure-openai') {
      const requiredFields = ['api_key', 'azure_endpoint', 'api_version', 'deployment'];
      const missing = requiredFields.filter((field) => !configData[field as keyof typeof configData]);
      if (missing.length > 0) {
        console.error('[v0] Missing Azure fields:', missing);
        res.status(400).json({
          success: false,
          error: `For Azure OpenAI, these fields are required: ${missing.join(', ')}`,
        } as ApiResponse<ILLMConfig>);
        return;
      }
    }

    console.error('[v0] LLM Config validation passed, upserting config');
    const config = await llmConfigService.upsertConfig(configData);

    res.json({
      success: true,
      data: config,
      message: 'Configuration saved successfully',
    } as ApiResponse<ILLMConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/llm-config/app/:appId Error:', message, error);
    res.status(500).json({
      success: false,
      error: `Server error: ${message}`,
    } as ApiResponse<ILLMConfig>);
  }
});

/**
 * POST /api/llm-config/validate/:appId
 * Test LLM connection
 */
llmConfigRouter.post('/validate/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const result = await llmProviderService.validateLLMConnection(appId);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/llm-config/validate/:appId Error:', message);
    res.status(500).json({
      valid: false,
      error: message,
    });
  }
});

/**
 * GET /api/llm-config/providers
 * Get list of supported providers and their required fields
 */
llmConfigRouter.get('/providers', (_req: Request, res: Response): void => {
  try {
    const providers = LLMClientFactory.getSupportedProviders();
    res.json({
      success: true,
      data: providers,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/llm-config/providers Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * Normalize KB config legacy field names to exact format before validation
 * Maps camelCase fields from UI to snake_case format for storage
 */
function normalizeKBConfigFieldNames(config: Record<string, unknown>): Record<string, unknown> {
  const normalized = { ...config };

  // Ensure kbLlmProvider is set (use 'provider' if kbLlmProvider not provided)
  if (!normalized.kbLlmProvider && normalized.provider) {
    normalized.kbLlmProvider = normalized.provider;
  }

  // Azure OpenAI fields: map camelCase to snake_case
  if (normalized.azureEndpoint && !normalized.kbllm_azure_endpoint) {
    normalized.kbllm_azure_endpoint = normalized.azureEndpoint;
  }
  if (normalized.azureApiKey && !normalized.kbllm_api_key) {
    normalized.kbllm_api_key = normalized.azureApiKey;
  }
  if (normalized.azureDeploymentName && !normalized.kbllm_deployment) {
    normalized.kbllm_deployment = normalized.azureDeploymentName;
  }
  if (normalized.azureApiVersion && !normalized.kbllm_api_version) {
    normalized.kbllm_api_version = normalized.azureApiVersion;
  }

  // OpenAI fields
  if (normalized.openaiApiKey && !normalized.kbLlmOpenaiApiKey) {
    normalized.kbLlmOpenaiApiKey = normalized.openaiApiKey;
  }
  if (normalized.openaiModel && !normalized.kbLlmOpenaiModel) {
    normalized.kbLlmOpenaiModel = normalized.openaiModel;
  }

  // Claude fields
  if (normalized.claudeApiKey && !normalized.kbLlmClaudeApiKey) {
    normalized.kbLlmClaudeApiKey = normalized.claudeApiKey;
  }
  if (normalized.claudeModel && !normalized.kbLlmClaudeModel) {
    normalized.kbLlmClaudeModel = normalized.claudeModel;
  }

  // AWS Bedrock fields
  if (normalized.awsRegion && !normalized.kbLlmAwsRegion) {
    normalized.kbLlmAwsRegion = normalized.awsRegion;
  }
  if (normalized.awsAccessKeyId && !normalized.kbLlmAwsAccessKeyId) {
    normalized.kbLlmAwsAccessKeyId = normalized.awsAccessKeyId;
  }
  if (normalized.awsSecretAccessKey && !normalized.kbLlmAwsSecretAccessKey) {
    normalized.kbLlmAwsSecretAccessKey = normalized.awsSecretAccessKey;
  }
  if (normalized.bedrockModelId && !normalized.kbLlmBedrockModelId) {
    normalized.kbLlmBedrockModelId = normalized.bedrockModelId;
  }

  return normalized;
}

/**
 * GET /api/kb-config/app/:appId
 * Get Knowledge Base configuration for an application
 */
llmConfigRouter.get('/kb-config/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const config = await kbConfigService.getConfig(appId);

    if (!config) {
      res.json({
        success: true,
        data: null,
      } as any);
      return;
    }

    res.json({
      success: true,
      data: config,
    } as ApiResponse<IKnowledgeBaseConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/kb-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<IKnowledgeBaseConfig>);
  }
});

/**
 * POST /api/kb-config/app/:appId
 * Save or update Knowledge Base configuration
 */
llmConfigRouter.post('/kb-config/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // Normalize field names to standard format BEFORE validation
    const normalized = normalizeKBConfigFieldNames(body);

    // Validate request body
    const validation = KnowledgeBaseConfigSchema.safeParse({ ...normalized, applicationId: appId });
    if (!validation.success) {
      const errorDetails = validation.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      res.status(400).json({
        success: false,
        error: `Validation failed: ${errorDetails}`,
      } as ApiResponse<IKnowledgeBaseConfig>);
      return;
    }

    const configData = validation.data;

    // Validate provider-specific required fields
    if (configData.kbLlmProvider === 'azure-openai') {
      const requiredFields = ['kbllm_api_key', 'kbllm_azure_endpoint', 'kbllm_deployment'];
      const missing = requiredFields.filter((field) => !configData[field as keyof typeof configData]);
      if (missing.length > 0) {
        res.status(400).json({
          success: false,
          error: `For Azure OpenAI, these fields are required: ${missing.join(', ')}`,
        } as ApiResponse<IKnowledgeBaseConfig>);
        return;
      }
    }

    const config = await kbConfigService.upsertConfig(configData);

    res.json({
      success: true,
      data: config,
      message: 'Knowledge Base configuration saved successfully',
    } as ApiResponse<IKnowledgeBaseConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/kb-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<IKnowledgeBaseConfig>);
  }
});

/**
 * POST /api/kb-config/validate/:appId
 * Test KB LLM connection
 */
llmConfigRouter.post('/kb-config/validate/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const result = await llmProviderService.validateKBLLMConnection(appId);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/kb-config/validate/:appId Error:', message);
    res.status(500).json({
      valid: false,
      error: message,
    });
  }
});

export default llmConfigRouter;
