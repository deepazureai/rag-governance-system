import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { kbPromptService } from '../services/KBPromptService';
import { KBPromptSchema } from '../schemas/index';
import type { IKBPrompt, ApiResponse } from '../types/models';

const router = Router();

/**
 * GET /api/kb-prompts/app/:appId
 * List all KB prompts for an application with filtering
 */
router.get('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const { category, minRelevance, limit = 50, skip = 0 } = req.query;

    if (!appId?.toString().trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      } as ApiResponse<IKBPrompt[]>);
      return;
    }

    const numLimit = Math.min(parseInt(limit as string) || 50, 100);
    const numSkip = parseInt(skip as string) || 0;
    const numMinRelevance = minRelevance ? parseFloat(minRelevance as string) : undefined;

    const prompts = await kbPromptService.getByApplicationId(
      appId.toString(),
      { category: category as string | undefined, minRelevance: numMinRelevance, limit: numLimit, skip: numSkip }
    );

    res.json({
      success: true,
      data: prompts,
    } as ApiResponse<KBPrompt[]>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/kb-prompts/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<KBPrompt[]>);
  }
});

/**
 * GET /api/kb-prompts/:id
 * Get a single KB prompt with full details
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Valid KB prompt ID is required',
      } as ApiResponse<IKBPrompt>);
      return;
    }

    const prompt = await kbPromptService.getById(new Types.ObjectId(id));

    if (!prompt) {
      res.status(404).json({
        success: false,
        error: 'KB prompt not found',
      } as ApiResponse<IKBPrompt>);
      return;
    }

    res.json({
      success: true,
      data: prompt,
    } as ApiResponse<KBPrompt>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/kb-prompts/:id Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<KBPrompt>);
  }
});

/**
 * POST /api/kb-prompts/app/:appId
 * Save a KB prompt from knowledge base query
 */
router.post('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const body = req.body as unknown;

    if (!appId?.toString().trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      } as ApiResponse<IKBPrompt>);
      return;
    }

    // Validate input
    const validation = KBPromptSchema.safeParse({
      ...body,
      applicationId: appId.toString(),
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: `Validation failed: ${JSON.stringify(validation.error.errors)}`,
      } as ApiResponse<IKBPrompt>);
      return;
    }

    const prompt = await kbPromptService.create(validation.data);

    res.status(201).json({
      success: true,
      data: prompt,
    } as ApiResponse<KBPrompt>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/kb-prompts/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<KBPrompt>);
  }
});

/**
 * PUT /api/kb-prompts/:id
 * Update KB prompt (mark as useful, add tags, etc.)
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as unknown;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Valid KB prompt ID is required',
      } as ApiResponse<IKBPrompt>);
      return;
    }

    const updated = await kbPromptService.update(new Types.ObjectId(id), body);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'KB prompt not found',
      } as ApiResponse<IKBPrompt>);
      return;
    }

    res.json({
      success: true,
      data: updated,
    } as ApiResponse<KBPrompt>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] PUT /api/kb-prompts/:id Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<KBPrompt>);
  }
});

/**
 * DELETE /api/kb-prompts/:id
 * Mark KB prompt as deleted (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Valid KB prompt ID is required',
      });
      return;
    }

    await kbPromptService.delete(new Types.ObjectId(id));

    res.json({
      success: true,
      message: 'KB prompt deleted',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] DELETE /api/kb-prompts/:id Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/kb-prompts/app/:appId/stats
 * Get analytics and statistics for KB prompts
 */
router.get('/app/:appId/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;

    if (!appId?.toString().trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    const stats = await kbPromptService.getStats(appId.toString());

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/kb-prompts/app/:appId/stats Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export const kbPromptRouter = router;
