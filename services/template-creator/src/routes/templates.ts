/**
 * Template API Routes
 * Endpoints for CRUD, clone, fork, search, and download operations
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  CreateTemplateSchema,
  UpdateTemplateSchema,
  CloneTemplateSchema,
  ForkTemplateSchema,
  SearchTemplatesSchema,
} from '../schemas/validation.js';
import { TemplateService } from '../services/TemplateService.js';
import { successResponse, errorResponse, isSuccess } from '../utils/apiResponse.js';

export function createTemplateRoutes(templateService: TemplateService): Router {
  const router = Router();

  // Middleware to validate request body
  const validateSchema =
    (schema: z.ZodSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = schema.parse(req.body);
        (req as any).validated = validated;
        next();
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: error.errors,
          });
        }
        next(error);
      }
    };

  // Create template
  router.post(
    '/',
    validateSchema(CreateTemplateSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const validated = (req as any).validated;
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
          return res.status(401).json(errorResponse('AUTHENTICATION_ERROR'));
        }

        const template = await templateService.createTemplate(
          validated.appId,
          validated.name,
          validated.promptText,
          userId,
          validated
        );

        res.status(201).json(
          successResponse(template, 'Template created successfully')
        );
      } catch (error) {
        next(error);
      }
    }
  );

  // Get template by ID
  router.get('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      const template = await templateService.getTemplate(templateId);

      if (!template) {
        return res.status(404).json(errorResponse('NOT_FOUND', 'Template not found'));
      }

      res.json(successResponse(template, 'Template retrieved successfully'));
    } catch (error) {
      next(error);
    }
  });

  // Update template
  router.patch(
    '/:templateId',
    validateSchema(UpdateTemplateSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { templateId } = req.params;
        const validated = (req as any).validated;
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
          return res.status(401).json(errorResponse('AUTHENTICATION_ERROR'));
        }

        const updated = await templateService.updateTemplate(templateId, validated, userId);

        if (!updated) {
          return res.status(404).json(errorResponse('NOT_FOUND', 'Template not found'));
        }

        res.json(successResponse(updated, 'Template updated successfully'));
      } catch (error) {
        next(error);
      }
    }
  );

  // Delete template
  router.delete('/:templateId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      const deleted = await templateService.deleteTemplate(templateId);

      if (!deleted) {
        return res.status(404).json(errorResponse('NOT_FOUND', 'Template not found'));
      }

      res.json(successResponse({ deleted: true }, 'Template deleted successfully'));
    } catch (error) {
      next(error);
    }
  });

  // Clone template
  router.post(
    '/:templateId/clone',
    validateSchema(CloneTemplateSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { templateId } = req.params;
        const validated = (req as any).validated;
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
          return res.status(401).json(errorResponse('AUTHENTICATION_ERROR'));
        }

        const cloned = await templateService.cloneTemplate(
          templateId,
          validated.newName,
          validated.appId,
          userId
        );

        if (!cloned) {
          return res.status(404).json(errorResponse('NOT_FOUND', 'Source template not found'));
        }

        res.status(201).json(successResponse(cloned, 'Template cloned successfully'));
      } catch (error) {
        next(error);
      }
    }
  );

  // Fork template
  router.post(
    '/:templateId/fork',
    validateSchema(ForkTemplateSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { templateId } = req.params;
        const validated = (req as any).validated;
        const userId = req.headers['x-user-id'] as string;

        if (!userId) {
          return res.status(401).json(errorResponse('AUTHENTICATION_ERROR'));
        }

        const forked = await templateService.forkTemplate(
          templateId,
          validated.newName,
          validated.appId,
          userId,
          validated.customizations
        );

        if (!forked) {
          return res.status(404).json(errorResponse('NOT_FOUND', 'Source template not found'));
        }

        res.status(201).json(successResponse(forked, 'Template forked successfully'));
      } catch (error) {
        next(error);
      }
    }
  );

  // Search templates
  router.post(
    '/search',
    validateSchema(SearchTemplatesSchema),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const criteria = (req as any).validated;
        const templates = await templateService.searchTemplates(criteria);

        res.json(
          successResponse(
            { templates, count: templates.length },
            'Search completed successfully'
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );

  // Get templates by app
  router.get(
    '/app/:appId/list',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { appId } = req.params;
        const templates = await templateService.getAppTemplates(appId);

        res.json(
          successResponse(
            { templates, count: templates.length },
            'Templates retrieved successfully'
          )
        );
      } catch (error) {
        next(error);
      }
    }
  );

  // Download templates (export)
  router.post(
    '/export',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { templateIds, format } = req.body as { templateIds: string[]; format: string };

        if (!Array.isArray(templateIds) || templateIds.length === 0) {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'templateIds array is required')
          );
        }

        if (!['json', 'yaml', 'csv'].includes(format)) {
          return res.status(400).json(
            errorResponse('VALIDATION_ERROR', 'Invalid export format')
          );
        }

        const content = await templateService.downloadTemplates(
          templateIds,
          format as 'json' | 'yaml' | 'csv'
        );

        const contentType =
          format === 'json' ? 'application/json' : format === 'yaml' ? 'text/yaml' : 'text/csv';

        res.setHeader('Content-Type', contentType);
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="templates.${format}"`
        );
        res.send(content);
      } catch (error) {
        next(error);
      }
    }
  );

  // Get metrics/stats
  router.get(
    '/app/:appId/metrics',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { appId } = req.params;
        const metrics = await templateService.getMetrics(appId);

        res.json(successResponse(metrics, 'Metrics retrieved successfully'));
      } catch (error) {
        next(error);
      }
    }
  );

  // Health check
  router.get('/health', (req: Request, res: Response) => {
    res.json(successResponse({ status: 'ok' }, 'Service is healthy'));
  });

  return router;
}
