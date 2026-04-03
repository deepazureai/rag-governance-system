/**
 * API Routes - Evaluation Endpoints
 */

import { Router, Request, Response } from 'express';
import { EvaluationService } from '../services/evaluation';
import { FrameworkType } from '../frameworks/registry';
import { z } from 'zod';

const evaluationRouter = Router();

// Validation schemas
const retrievedDocumentSchema = z.object({
  content: z.string().min(1),
  source: z.string(),
  relevance: z.number().optional(),
});

const evaluateQuerySchema = z.object({
  appId: z.string().min(1),
  query: z.string().min(1),
  response: z.string().min(1),
  retrievedDocuments: z.array(retrievedDocumentSchema),
  framework: z.enum(['ragas', 'microsoft']).optional(),
});

const evaluateBatchSchema = z.object({
  appId: z.string().min(1),
  evaluations: z
    .array(
      z.object({
        query: z.string().min(1),
        response: z.string().min(1),
        retrievedDocuments: z.array(retrievedDocumentSchema),
      })
    )
    .min(1)
    .max(100),
  framework: z.enum(['ragas', 'microsoft']).optional(),
});

export function createEvaluationRouter(evaluationService: EvaluationService): Router {
  /**
   * GET /api/frameworks
   * Get available evaluation frameworks
   */
  evaluationRouter.get('/frameworks', (req: Request, res: Response) => {
    try {
      const frameworks = evaluationService.getAvailableFrameworks();
      res.json({
        success: true,
        data: frameworks,
      });
    } catch (error) {
      console.error('[API] Framework list error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve frameworks',
      });
    }
  });

  /**
   * POST /api/evaluations/query
   * Evaluate a single query
   */
  evaluationRouter.post('/query', async (req: Request, res: Response) => {
    try {
      const validation = evaluateQuerySchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validation.error.errors,
        });
      }

      const { appId, query, response, retrievedDocuments, framework } = validation.data;

      const result = await evaluationService.evaluateQuery(
        appId,
        query,
        response,
        retrievedDocuments,
        framework as FrameworkType | undefined
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('[API] Evaluation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Evaluation failed',
      });
    }
  });

  /**
   * POST /api/evaluations/batch
   * Evaluate multiple queries
   */
  evaluationRouter.post('/batch', async (req: Request, res: Response) => {
    try {
      const validation = evaluateBatchSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          details: validation.error.errors,
        });
      }

      const { appId, evaluations, framework } = validation.data;

      const results = await evaluationService.evaluateBatch(
        appId,
        evaluations,
        framework as FrameworkType | undefined,
        (progress) => {
          // Progress tracking would be sent via WebSocket in real implementation
          console.log(
            `[API] Batch progress: ${progress.completed}/${progress.total} (${progress.percentComplete}%)`
          );
        }
      );

      res.json({
        success: true,
        data: {
          count: results.length,
          results,
        },
      });
    } catch (error: any) {
      console.error('[API] Batch evaluation error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Batch evaluation failed',
      });
    }
  });

  /**
   * GET /api/evaluations/history/:appId
   * Get evaluation history for an app
   */
  evaluationRouter.get('/history/:appId', async (req: Request, res: Response) => {
    try {
      const { appId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const history = await evaluationService.getAppEvaluationHistory(appId, limit, offset);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('[API] History retrieval error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve history',
      });
    }
  });

  /**
   * POST /api/evaluations/switch-framework
   * Switch active evaluation framework
   */
  evaluationRouter.post('/switch-framework', async (req: Request, res: Response) => {
    try {
      const { framework } = req.body;

      if (!['ragas', 'microsoft'].includes(framework)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid framework',
        });
      }

      await evaluationService.switchFramework(framework as FrameworkType);

      res.json({
        success: true,
        message: `Framework switched to ${framework}`,
      });
    } catch (error: any) {
      console.error('[API] Framework switch error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Framework switch failed',
      });
    }
  });

  /**
   * GET /api/evaluations/health
   * Health check for all frameworks
   */
  evaluationRouter.get('/health', async (req: Request, res: Response) => {
    try {
      const health = await evaluationService.healthCheck();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error('[API] Health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
      });
    }
  });

  return evaluationRouter;
}
