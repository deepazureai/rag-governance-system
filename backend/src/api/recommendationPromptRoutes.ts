import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import { recommendationPromptService } from '../services/RecommendationPromptService';
import { RecommendationPromptSchema } from '../schemas/index';
import { RecommendationPrompt, ApiResponse } from '../../src/types/models';

const router = Router();

/**
 * GET /api/recommendations/app/:appId
 * List all recommendation prompts for an application with filtering
 */
router.get('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const { status, minScore, limit = 50, skip = 0 } = req.query;

    if (!appId?.toString().trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      } as ApiResponse<RecommendationPrompt[]>);
      return;
    }

    const numLimit = Math.min(parseInt(limit as string) || 50, 100);
    const numSkip = parseInt(skip as string) || 0;
    const numMinScore = minScore ? parseFloat(minScore as string) : undefined;

    const recommendations = await recommendationPromptService.getByApplicationId(
      appId.toString(),
      { status: status as string | undefined, minScore: numMinScore, limit: numLimit, skip: numSkip }
    );

    res.json({
      success: true,
      data: recommendations,
    } as ApiResponse<RecommendationPrompt[]>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/recommendations/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<RecommendationPrompt[]>);
  }
});

/**
 * GET /api/recommendations/:id
 * Get a single recommendation prompt with full details
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Valid recommendation ID is required',
      } as ApiResponse<RecommendationPrompt>);
      return;
    }

    const recommendation = await recommendationPromptService.getById(new Types.ObjectId(id));

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      } as ApiResponse<RecommendationPrompt>);
      return;
    }

    res.json({
      success: true,
      data: recommendation,
    } as ApiResponse<RecommendationPrompt>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/recommendations/:id Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<RecommendationPrompt>);
  }
});

/**
 * POST /api/recommendations/app/:appId
 * Save a recommendation prompt from raw data analysis
 */
router.post('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const body = req.body as unknown;

    if (!appId?.toString().trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      } as ApiResponse<RecommendationPrompt>);
      return;
    }

    // Validate input
    const validation = RecommendationPromptSchema.safeParse({
      ...body,
      applicationId: appId.toString(),
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: `Validation failed: ${JSON.stringify(validation.error.errors)}`,
      } as ApiResponse<RecommendationPrompt>);
      return;
    }

    const recommendation = await recommendationPromptService.create(validation.data);

    res.status(201).json({
      success: true,
      data: recommendation,
    } as ApiResponse<RecommendationPrompt>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] POST /api/recommendations/app/:appId Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<RecommendationPrompt>);
  }
});

/**
 * PUT /api/recommendations/:id
 * Update a recommendation prompt (mark as useful, add notes, etc.)
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as unknown;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Valid recommendation ID is required',
      } as ApiResponse<RecommendationPrompt>);
      return;
    }

    const updated = await recommendationPromptService.update(new Types.ObjectId(id), body);

    if (!updated) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      } as ApiResponse<RecommendationPrompt>);
      return;
    }

    res.json({
      success: true,
      data: updated,
    } as ApiResponse<RecommendationPrompt>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] PUT /api/recommendations/:id Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    } as ApiResponse<RecommendationPrompt>);
  }
});

/**
 * DELETE /api/recommendations/:id
 * Mark recommendation as deleted (soft delete)
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        error: 'Valid recommendation ID is required',
      });
      return;
    }

    await recommendationPromptService.delete(new Types.ObjectId(id));

    res.json({
      success: true,
      message: 'Recommendation deleted',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] DELETE /api/recommendations/:id Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/recommendations/app/:appId/stats
 * Get analytics and statistics for recommendations
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

    const stats = await recommendationPromptService.getStats(appId.toString());

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0] GET /api/recommendations/app/:appId/stats Error:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export const recommendationPromptRouter = router;
