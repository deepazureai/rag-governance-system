import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { llmConfigService } from '../services/LLMConfigService';
import { kbConfigService } from '../services/KnowledgeBaseConfigService';
import { llmProviderService } from '../services/LLMProviderService';
import { LLMClientFactory } from '../services/LLMClientFactory';
import { LLMConfigSchema, KnowledgeBaseConfigSchema } from '../schemas/index';
import { logger } from '../utils/logger.js';
import type { ILLMConfig, IKnowledgeBaseConfig, ApiResponse } from '../types/models';

const router = Router();

/**
 * GET /api/llm-config/app/:appId
 * Get LLM configuration for an application
 */
router.get('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    if (!appId?.trim()) {
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
    } as ApiResponse<LLMConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/llm-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<LLMConfig>);
  }
});

/**
 * POST /api/llm-config/app/:appId
 * Save or update LLM configuration
 */
router.post('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    if (!appId?.trim()) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const body = req.body as unknown;

    // Validate request body
    const validation = LLMConfigSchema.safeParse({ ...body, applicationId: appId });
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: `Validation failed: ${JSON.stringify(validation.error.errors)}`,
      } as ApiResponse<ILLMConfig>);
      return;
    }

    // Validate provider configuration
    const configValidation = llmConfigService['validateConfig'](validation.data);
    if (!configValidation.valid) {
      res.status(400).json({
        success: false,
        error: `Configuration validation failed: ${configValidation.errors.join(', ')}`,
      } as ApiResponse<ILLMConfig>);
      return;
    }

    const config = await llmConfigService.upsertConfig(validation.data);

    res.json({
      success: true,
      data: config,
    } as ApiResponse<LLMConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/llm-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<LLMConfig>);
  }
});

/**
 * POST /api/llm-config/validate/:appId
 * Test LLM connection
 */
router.post('/validate/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    if (!appId?.trim()) {
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
router.get('/providers', (_req: Request, res: Response): void => {
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
 * GET /api/kb-config/app/:appId
 * Get Knowledge Base configuration
 */
router.get('/kb-config/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    if (!appId?.trim()) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const config = await kbConfigService.getConfig(appId);

    if (!config) {
      res.status(404).json({
        success: false,
        error: 'KB configuration not found',
      } as ApiResponse<IKnowledgeBaseConfig>);
      return;
    }

    res.json({
      success: true,
      data: config,
    } as ApiResponse<KnowledgeBaseConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/kb-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<KnowledgeBaseConfig>);
  }
});

/**
 * POST /api/kb-config/app/:appId
 * Save or update Knowledge Base configuration
 */
router.post('/kb-config/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    if (!appId?.trim()) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    const body = req.body as unknown;

    // Validate request body
    const validation = KnowledgeBaseConfigSchema.safeParse({ ...body, applicationId: appId });
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: `Validation failed: ${JSON.stringify(validation.error.errors)}`,
      } as ApiResponse<IKnowledgeBaseConfig>);
      return;
    }

    // Validate KB configuration
    const configValidation = kbConfigService['validateConfig'](validation.data);
    if (!configValidation.valid) {
      res.status(400).json({
        success: false,
        error: `Configuration validation failed: ${configValidation.errors.join(', ')}`,
      } as ApiResponse<IKnowledgeBaseConfig>);
      return;
    }

    const config = await kbConfigService.upsertConfig(validation.data);

    res.json({
      success: true,
      data: config,
    } as ApiResponse<KnowledgeBaseConfig>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/kb-config/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<KnowledgeBaseConfig>);
  }
});

/**
 * POST /api/kb-config/validate/:appId
 * Test KB NLP LLM connection
 */
router.post('/kb-config/validate/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    if (!appId?.trim()) {
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

export const llmConfigRouter = router;
