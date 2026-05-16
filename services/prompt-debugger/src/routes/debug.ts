/**
 * Express routes for Prompt Debugger Service
 * All routes have Zod validation with type safety
 */

import express, { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { DebugAnalyzer } from '../services/DebugAnalyzer.js';
import { DebugRepository } from '../persistence/DebugRepository.js';
import { PromptAnalysisRequestSchema } from '../schemas/validation.js';

interface ValidatedRequest<T> extends Request {
  validatedBody?: T;
}

interface ErrorResponse {
  error: {
    message: string;
    code: string;
  };
}

export function createDebugRoutes(
  debugAnalyzer: DebugAnalyzer,
  debugRepository: DebugRepository,
): Router {
  const router = express.Router();

  /**
   * Middleware: Validate request body with Zod
   */
  const validateRequest = <T extends z.ZodType>(schema: T) => {
    return (req: ValidatedRequest<z.infer<T>>, res: Response, next: NextFunction): void => {
      try {
        const parsed = schema.parse(req.body);
        req.validatedBody = parsed;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          const message = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
          const errorRes: ErrorResponse = {
            error: { message, code: 'VALIDATION_ERROR' },
          };
          res.status(400).json(errorRes);
        } else {
          res.status(500).json({ error: { message: 'Validation failed', code: 'INTERNAL_ERROR' } });
        }
      }
    };
  };

  /**
   * POST /api/debug
   * Analyze a low-scoring prompt
   */
  router.post(
    '/debug',
    validateRequest(PromptAnalysisRequestSchema),
    async (req: ValidatedRequest<z.infer<typeof PromptAnalysisRequestSchema>>, res: Response): Promise<void> => {
      try {
        if (!req.validatedBody) {
          res.status(400).json({ error: { message: 'Invalid request body', code: 'INVALID_REQUEST' } });
          return;
        }

        const { appId, promptId, promptText, actualOutput, scores } = req.validatedBody;

        console.log(`[v0] Debug request for prompt ${promptId}`);

        // Convert array of scores to record format
        const scoreRecord: Record<string, number> = {};
        scores.forEach((score) => {
          scoreRecord[score.frameworkName] = score.score;
        });

        // Run analysis
        const analysis = await debugAnalyzer.analyzePrompt(
          promptId,
          appId,
          promptText,
          actualOutput,
          scoreRecord,
        );

        // Save to database
        await debugRepository.saveDebugAnalysis(analysis);

        res.status(200).json({
          success: true,
          data: analysis,
        });
      } catch (error) {
        console.error('[v0] Error in /debug route:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({
          error: {
            message: error instanceof Error ? error.message : 'Failed to analyze prompt',
            code: 'ANALYSIS_FAILED',
          },
        });
      }
    },
  );

  /**
   * GET /api/debug/:appId/:promptId
   * Retrieve previous debug analysis
   */
  router.get(
    '/debug/:appId/:promptId',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { appId, promptId } = req.params;

        if (!appId || !promptId) {
          res.status(400).json({ error: { message: 'Missing appId or promptId', code: 'INVALID_REQUEST' } });
          return;
        }

        const analysis = await debugRepository.getDebugAnalysis(promptId, appId);

        if (!analysis) {
          res.status(404).json({ error: { message: 'Analysis not found', code: 'NOT_FOUND' } });
          return;
        }

        res.status(200).json({ success: true, data: analysis });
      } catch (error) {
        console.error('[v0] Error in GET debug route:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({
          error: { message: 'Failed to retrieve analysis', code: 'FETCH_FAILED' },
        });
      }
    },
  );

  /**
   * GET /api/debug/app/:appId
   * Get recent analyses for an app
   */
  router.get(
    '/app/:appId',
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { appId } = req.params;
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

        if (!appId) {
          res.status(400).json({ error: { message: 'Missing appId', code: 'INVALID_REQUEST' } });
          return;
        }

        const analyses = await debugRepository.getRecentAnalyses(appId, Math.min(limit, 100));

        res.status(200).json({
          success: true,
          data: analyses,
          count: analyses.length,
        });
      } catch (error) {
        console.error('[v0] Error in GET app analyses route:', error instanceof Error ? error.message : 'Unknown error');
        res.status(500).json({
          error: { message: 'Failed to retrieve analyses', code: 'FETCH_FAILED' },
        });
      }
    },
  );

  /**
   * Health check endpoint
   */
  router.get('/health', (_req: Request, res: Response): void => {
    res.status(200).json({ status: 'healthy', service: 'prompt-debugger' });
  });

  return router;
}
