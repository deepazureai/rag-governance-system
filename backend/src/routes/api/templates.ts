import { Router, Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { PromptTemplate } from '../../models/PromptTemplate';
import { promptSynthesisService } from '../../services/PromptSynthesisService';
import { templateDistributionService } from '../../services/TemplateDistributionService';
import { logger } from '../../utils/logger';
import {
  PromptSynthesisRequestSchema,
  CreateTemplateRequestSchema,
  UpdateTemplateRequestSchema,
  DistributeTemplateRequestSchema,
  ListTemplatesQuerySchema,
} from '../../utils/validation/templates-validation';

// Extend Express Request type to include user and role
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

const router: Router = Router();

/**
 * Middleware to validate request with Zod schema
 */
const validateRequest = (schema: any) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = await schema.parseAsync(req.body);
    req.body = validated;
    next();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Validation error: ${errorMessage}`);
    res.status(400).json({ error: `Validation failed: ${errorMessage}` });
  }
};

/**
 * POST /api/templates/synthesize
 * Synthesize multiple prompts into a single optimized prompt
 */
router.post('/synthesize', validateRequest(PromptSynthesisRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'system'; // Assuming auth middleware sets req.user
    const response = await promptSynthesisService.synthesizePrompts(req.body, userId);
    res.json(response);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Synthesis failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/templates
 * Create a new template
 */
router.post('/', validateRequest(CreateTemplateRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'system';

    const template = new PromptTemplate({
      applicationId: req.body.applicationId,
      name: req.body.name,
      description: req.body.description,
      templateText: req.body.templateText,
      crewAITemplate: req.body.crewAITemplate,
      sourceKBPromptIds: req.body.sourceKBThreadIds?.map((id: string) => new Types.ObjectId(id)) || [],
      sourceRecommendationIds: req.body.sourceRecommendationIds?.map((id: string) => new Types.ObjectId(id)) || [],
      synthesisMetadata: req.body.synthesisMetadata,
      distributionTargets: req.body.distributionTargets || [],
      llmConfigUsedForRefinement: new Types.ObjectId(process.env.DEFAULT_LLM_CONFIG_ID || '000000000000000000000001'),
      status: 'draft',
      createdBy: userId,
    });

    await template.save();

    logger.info(`[TemplatesAPI] Template created: ${template._id}`);
    res.status(201).json(template);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Create failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /api/templates
 * List templates with role-based filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'system';
    const userRole = req.user?.role || 'business_user';

    // Validate query params
    const query = await ListTemplatesQuerySchema.parseAsync(req.query);

    const applicationId = query.applicationId;
    if (!applicationId) {
      return res.status(400).json({ error: 'applicationId is required' });
    }

    // Get templates based on role and permissions
    const templates = await templateDistributionService.getTemplatesForRole(
      applicationId,
      userId,
      userRole,
      {
        status: query.status,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
      }
    );

    res.json(templates);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] List failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * GET /api/templates/:id
 * Get template details with permission check
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'system';
    const userRole = req.user?.role || 'business_user';
    
    const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await PromptTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check permission: Admin sees all, others only see distributed or public templates
    if (userRole !== 'admin') {
      const hasAccess = template.isPublic || 
        templateDistributionService.canUserEditTemplate(template, userId, userRole);
      
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied to this template' });
      }
    }

    res.json(template);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Get failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * PATCH /api/templates/:id
 * Update template
 */
router.patch('/:id', validateRequest(UpdateTemplateRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'system';
    const userRole = req.user?.role || 'business_user';

    const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await PromptTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check permissions
    if (!templateDistributionService.canUserEditTemplate(template, userId, userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to edit template' });
    }

    // Update fields
    if (req.body.name !== undefined) template.name = req.body.name;
    if (req.body.description !== undefined) template.description = req.body.description;
    if (req.body.templateText !== undefined) template.templateText = req.body.templateText;
    if (req.body.crewAITemplate !== undefined) {
      template.crewAITemplate = { ...template.crewAITemplate, ...req.body.crewAITemplate };
    }

    await template.save();

    logger.info(`[TemplatesAPI] Template updated: ${template._id}`);
    res.json(template);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Update failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/templates/:id/distribute
 * Distribute template to roles/groups/individuals
 */
router.post('/:id/distribute', validateRequest(DistributeTemplateRequestSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'system';
    const userRole = req.user?.role || 'business_user';

    const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await PromptTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Check permissions (only admin, BA, or creator can distribute)
    const allowedRoles = ['admin', 'ba'];
    if (!allowedRoles.includes(userRole) && template.createdBy !== userId) {
      return res.status(403).json({ error: 'Only admin, BA, or template creator can distribute' });
    }

    const updated = await templateDistributionService.distributeTemplate(templateId, {
      templateId,
      distributionTargets: req.body.distributionTargets,
    });

    logger.info(`[TemplatesAPI] Template distributed: ${templateId}`);
    res.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Distribution failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/templates/:id/publish
 * Publish template
 */
router.post('/:id/publish', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id || 'system';

    const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await PromptTemplate.findByIdAndUpdate(
      templateId,
      {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: userId,
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    logger.info(`[TemplatesAPI] Template published: ${template._id}`);
    res.json(template);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Publish failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * POST /api/templates/:id/archive
 * Archive template
 */
router.post('/:id/archive', async (req: Request, res: Response) => {
  try {
    const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await PromptTemplate.findByIdAndUpdate(
      templateId,
      {
        status: 'archived',
        archivedAt: new Date(),
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    logger.info(`[TemplatesAPI] Template archived: ${template._id}`);
    res.json(template);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Archive failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

/**
 * DELETE /api/templates/:id
 * Delete template
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const userRole = req.user?.role || 'business_user';

    // Only admin can delete
    if (userRole !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete templates' });
    }

    const templateId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!templateId) {
      return res.status(400).json({ error: 'Template ID is required' });
    }

    const template = await PromptTemplate.findByIdAndDelete(templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    logger.info(`[TemplatesAPI] Template deleted: ${templateId}`);
    res.json({ message: 'Template deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TemplatesAPI] Delete failed: ${errorMessage}`);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
