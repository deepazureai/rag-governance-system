import { Router, Request, Response } from 'express';
import { PromptTemplate } from '../models/PromptTemplate.js';
import { RawDataRecord } from '../models/RawDataRecord.js';
import { logger } from '../utils/logger.js';

const promptTemplateRouter = Router();

/**
 * Create a new prompt template from similar BA-reviewed prompts
 * POST /api/prompt-templates/create
 */
promptTemplateRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const { applicationId, templateName, description, promptTemplate, qualityGuidelines, category, tags, baEmail, matchingPatterns, autoApply } = req.body;

    if (!applicationId || !templateName || !promptTemplate || !qualityGuidelines) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    logger.info(`[promptTemplateRoutes] Creating template "${templateName}" for app ${applicationId}`);

    const newTemplate = new PromptTemplate({
      applicationId,
      templateName,
      description,
      promptTemplate,
      qualityGuidelines,
      category,
      tags: tags || [],
      matchingPatterns: matchingPatterns || [],
      autoApply: autoApply || false,
      status: 'draft',
      versions: [
        {
          version: 1,
          promptTemplate,
          qualityGuidelines,
          createdBy: baEmail,
          description,
        },
      ],
      currentVersion: 1,
      usageMetrics: {
        totalUsageCount: 0,
      },
      createdBy: baEmail,
    });

    await newTemplate.save();

    logger.info(`[promptTemplateRoutes] Template created successfully: ${newTemplate._id}`);

    return res.status(201).json({
      success: true,
      message: 'Prompt template created successfully',
      data: newTemplate,
    });
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error creating template:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create prompt template',
      error: error.message,
    });
  }
});

/**
 * Get all templates for an application
 * GET /api/prompt-templates/:applicationId?status=published&category=customer-support&page=1&pageSize=10
 */
promptTemplateRouter.get('/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'applicationId is required' });
    }

    const query: any = { applicationId };
    if (status) query.status = status;
    if (category) query.category = category;

    const skip = (page - 1) * pageSize;

    const templates = await PromptTemplate.find(query)
      .sort({ 'usageMetrics.lastUsedAt': -1, createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await PromptTemplate.countDocuments(query);

    logger.info(`[promptTemplateRoutes] Retrieved ${templates.length} templates for app ${applicationId}`);

    return res.status(200).json({
      success: true,
      data: templates,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error fetching templates:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch prompt templates',
      error: error.message,
    });
  }
});

/**
 * Get single template by ID
 * GET /api/prompt-templates/detail/:templateId
 */
promptTemplateRouter.get('/detail/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    const template = await PromptTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    return res.status(200).json({
      success: true,
      data: template,
    });
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error fetching template:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch template',
      error: error.message,
    });
  }
});

/**
 * Publish a template (change status from draft to published)
 * POST /api/prompt-templates/:templateId/publish
 */
promptTemplateRouter.post('/:templateId/publish', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { baEmail } = req.body;

    if (!baEmail) {
      return res.status(400).json({ success: false, message: 'baEmail is required' });
    }

    const template = await PromptTemplate.findByIdAndUpdate(
      templateId,
      {
        status: 'published',
        publishedAt: new Date(),
        publishedBy: baEmail,
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    logger.info(`[promptTemplateRoutes] Template published: ${templateId}`);

    return res.status(200).json({
      success: true,
      message: 'Template published successfully',
      data: template,
    });
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error publishing template:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to publish template',
      error: error.message,
    });
  }
});

/**
 * Archive a template
 * POST /api/prompt-templates/:templateId/archive
 */
promptTemplateRouter.post('/:templateId/archive', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    const template = await PromptTemplate.findByIdAndUpdate(
      templateId,
      {
        status: 'archived',
        archivedAt: new Date(),
      },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    logger.info(`[promptTemplateRoutes] Template archived: ${templateId}`);

    return res.status(200).json({
      success: true,
      message: 'Template archived successfully',
      data: template,
    });
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error archiving template:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to archive template',
      error: error.message,
    });
  }
});

/**
 * Export templates as JSON
 * GET /api/prompt-templates/:applicationId/export?format=json&status=published
 */
promptTemplateRouter.get('/:applicationId/export', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const format = req.query.format as string || 'json';
    const status = req.query.status as string | undefined;

    const query: any = { applicationId };
    if (status) query.status = status;

    const templates = await PromptTemplate.find(query).lean();

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="templates_${applicationId}_${new Date().toISOString().split('T')[0]}.json"`);
      res.send(JSON.stringify(templates, null, 2));
    } else if (format === 'csv') {
      // Convert to CSV
      const csv = convertTemplatesToCSV(templates);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="templates_${applicationId}_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid format. Use json or csv' });
    }
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error exporting templates:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to export templates',
      error: error.message,
    });
  }
});

/**
 * Update template version (non-destructive versioning)
 * POST /api/prompt-templates/:templateId/new-version
 */
promptTemplateRouter.post('/:templateId/new-version', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { promptTemplate, qualityGuidelines, description, baEmail } = req.body;

    if (!promptTemplate || !qualityGuidelines || !baEmail) {
      return res.status(400).json({ success: false, message: 'Required fields missing' });
    }

    const template = await PromptTemplate.findById(templateId);

    if (!template) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    const newVersion = template.currentVersion + 1;

    template.versions.push({
      version: newVersion,
      promptTemplate,
      qualityGuidelines,
      createdBy: baEmail,
      description,
      createdAt: new Date(),
    });

    template.currentVersion = newVersion;
    template.promptTemplate = promptTemplate;
    template.qualityGuidelines = qualityGuidelines;

    await template.save();

    logger.info(`[promptTemplateRoutes] New version created for template ${templateId}: v${newVersion}`);

    return res.status(200).json({
      success: true,
      message: 'New template version created',
      data: template,
    });
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error creating version:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to create new template version',
      error: error.message,
    });
  }
});

/**
 * Delete a template
 * DELETE /api/prompt-templates/:templateId
 */
promptTemplateRouter.delete('/:templateId', async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;

    const result = await PromptTemplate.findByIdAndDelete(templateId);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Template not found' });
    }

    logger.info(`[promptTemplateRoutes] Template deleted: ${templateId}`);

    return res.status(200).json({
      success: true,
      message: 'Template deleted successfully',
    });
  } catch (error: any) {
    logger.error(`[promptTemplateRoutes] Error deleting template:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete template',
      error: error.message,
    });
  }
});

/**
 * Helper function to convert templates to CSV
 */
function convertTemplatesToCSV(templates: any[]): string {
  const headers = ['Template ID', 'Name', 'Description', 'Status', 'Category', 'Tags', 'Total Usage', 'Created By', 'Created At'];
  const rows = templates.map((t) => [
    t._id,
    t.templateName,
    t.description,
    t.status,
    t.category || '',
    (t.tags || []).join(';'),
    t.usageMetrics?.totalUsageCount || 0,
    t.createdBy,
    t.createdAt,
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export default promptTemplateRouter;
