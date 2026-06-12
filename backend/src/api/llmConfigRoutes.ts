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

    // Add applicationId to data
    const dataWithAppId = { ...body, applicationId: appId };

    // Upsert to database using llmConfigService (for regular LLM config, not KB config)
    const config = await llmConfigService.upsertConfig(dataWithAppId as any);

    res.json({
      success: true,
      data: config,
      message: 'LLM Configuration saved successfully',
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
 * GET /api/llm-config/kb/app/:appId
 * Retrieve Knowledge Base LLM configuration for an application
 * 
 * Used by KB Settings frontend to load saved configuration for editing.
 * Returns all KB provider settings (both chat completion and embeddings).
 */
llmConfigRouter.get('/kb/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const config = await kbConfigService.getConfig(appId);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'Knowledge Base configuration not found',
      } as ApiResponse<IKnowledgeBaseConfig>);
      return;
    }

    res.json({
      success: true,
      data: config,
    } as ApiResponse<IKnowledgeBaseConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/llm-config/kb/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<IKnowledgeBaseConfig>);
  }
});

/**
 * POST /api/llm-config/kb/app/:appId
 * Save Knowledge Base LLM configuration (for embeddings and chat)
 */
llmConfigRouter.post('/kb/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const body = req.body as Record<string, unknown>;

    // Add applicationId to data
    const dataWithAppId = { ...body, applicationId: appId };

    // Upsert to database using kbConfigService (for KB config with kb prefixed fields)
    const config = await kbConfigService.upsertConfig(dataWithAppId as any);

    res.json({
      success: true,
      data: config,
      message: 'Knowledge Base configuration saved successfully',
    } as ApiResponse<IKnowledgeBaseConfig>);
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/llm-config/kb/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<IKnowledgeBaseConfig>);
  }
});

/**
 * POST /api/llm-config/validate/:appId
 * Validate KB LLM configuration by testing actual providers
 * 
 * Flow:
 * 1. Fetch saved KB config from MongoDB for this application
 * 2. Test Chat Completion provider connection
 * 3. Test Embeddings provider connection
 * 4. Return success/failure
 * 
 * This validates that saved credentials work with actual providers.
 * Same config is reused by KB Services (upload and chat tabs).
 */
llmConfigRouter.post('/validate/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const appId = getQueryString(req.params.appId);
    if (!appId) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    console.log('[v0-validate] 1. Starting validate endpoint for app:', appId);
    
    // Step 1: Fetch saved KB config and test Chat Completion provider
    console.log('[v0-validate] 2. Calling getKBChatCompletionProvider');
    const chatCompletionProvider = await llmProviderService.getKBChatCompletionProvider(appId);
    console.log('[v0-validate] 3. Chat Completion provider created successfully');
    
    // Step 2: Test Embeddings provider
    console.log('[v0-validate] 4. Calling getKBEmbeddingsProvider');
    const embeddingsProvider = await llmProviderService.getKBEmbeddingsProvider(appId);
    console.log('[v0-validate] 5. Embeddings provider created successfully');
    
    console.log('[v0-validate] 6. Both providers validated - returning success');
    
    res.json({
      valid: true,
      message: 'KB Configuration validated successfully',
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

export default llmConfigRouter;
