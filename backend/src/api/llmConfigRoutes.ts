import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import { Types } from 'mongoose';
import { llmConfigService } from '../services/LLMConfigService.js';
import { kbConfigService } from '../services/KBConfigService.js';
import { llmProviderService } from '../services/LLMProviderService.js';
import { LLMClientFactory } from '../services/LLMClientFactory.js';
import { logger } from '../utils/logger.js';
import { getQueryString } from '../utils/queryParamUtils.js';
import type { ILLMConfig, IKnowledgeBaseConfig, ApiResponse } from '../types/models.js';

const llmConfigRouter: ExpressRouter = Router();

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
    console.log('[v0] LLM Config POST request received for appId:', appId);

    // Add applicationId to data and save directly (no validation)
    const configData = { ...body, applicationId: appId };
    console.log('[v0] Upserting config to database');

    const config = await llmConfigService.upsertConfig(configData as any);

    res.json({
      success: true,
      data: config,
      message: 'Configuration saved successfully',
    } as ApiResponse<ILLMConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/llm-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<ILLMConfig>);
  }
});

/**
 * POST /api/llm-config/validate/:appId
 * Test LLM connection (removed - use KB config validate instead)
 */
llmConfigRouter.post('/validate/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      message: 'Use /kb-config/validate/:appId instead',
    });
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
    console.log('[v0-POST] 1. Received request for appId:', appId);
    
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    console.log('[v0-POST] 2. Request body received');

    // Add applicationId to data
    const dataWithAppId = { ...body, applicationId: appId };
    console.log('[v0-POST] 3. Calling upsertConfig...');

    // Upsert to database (no validation)
    const config = await kbConfigService.upsertConfig(dataWithAppId as any);
    console.log('[v0-POST] 4. upsertConfig returned successfully');

    res.json({
      success: true,
      data: config,
      message: 'Knowledge Base configuration saved successfully',
    } as ApiResponse<IKnowledgeBaseConfig>);
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0-POST] ERROR:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<IKnowledgeBaseConfig>);
  }
});

/**
 * POST /api/kb-config/validate/:appId
 * Log KB config parameters being passed to LLM models (Chat Completion & Embeddings)
 */
llmConfigRouter.post('/kb-config/validate/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    console.log('[v0-validate] 1. Starting validate endpoint for app:', appId);
    
    // Get KB config and log Chat Completion parameters
    console.log('[v0-validate] 2. Calling getKBChatCompletionProvider');
    const chatCompletionProvider = await llmProviderService.getKBChatCompletionProvider(appId);
    console.log('[v0-validate] 3. Chat Completion provider created successfully');
    
    // Get KB config and log Embeddings parameters
    console.log('[v0-validate] 4. Calling getKBEmbeddingsProvider');
    const embeddingsProvider = await llmProviderService.getKBEmbeddingsProvider(appId);
    console.log('[v0-validate] 5. Embeddings provider created successfully');
    
    console.log('[v0-validate] 6. Both providers created - returning success response');
    
    res.json({
      valid: true,
      error: undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : '';
    console.error('[v0-validate] ERROR:', message);
    console.error('[v0-validate] ERROR STACK:', stack);
    res.status(500).json({
      valid: false,
      error: message,
    });
  }
});

export default llmConfigRouter;
