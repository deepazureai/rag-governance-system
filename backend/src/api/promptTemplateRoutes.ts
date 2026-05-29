import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import { Types } from 'mongoose';
import { PromptTemplate } from '../models/PromptTemplate.js';
import { promptTemplateService } from '../services/PromptTemplateService.js';
import { llmProviderService } from '../services/LLMProviderService.js';
import { llmAssistanceService } from '../services/LLMAssistanceService.js';
import { llmConfigService } from '../services/LLMConfigService.js';
import { logger } from '../utils/logger.js';
import { getQueryString } from '../utils/queryParamUtils.js';
import type { IPromptTemplate, TemplateSource } from '../models/PromptTemplate.js';
import type { ApiResponse } from '../types/models.js';

const promptTemplateRouter: ExpressRouter = Router();

/**
 * POST /api/prompt-templates/app/:appId
 * Create a new prompt template with source tracking
 */
promptTemplateRouter.post('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const body = req.body as unknown;

    if (!appId?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    const templateData = (body && typeof body === 'object' ? (body as Record<string, unknown>) : {}) as Record<string, unknown>;

    const newTemplate = new PromptTemplate({
      applicationId: appId.toString(),
      name: (templateData.name as string) || 'Untitled Template',
      description: (templateData.description as string) || '',
      templateText: (templateData.templateText as string) || '',
      category: (templateData.category as string) || '',
      tags: Array.isArray(templateData.tags) ? templateData.tags : [],
      sourceRecommendationIds: Array.isArray(templateData.sourceRecommendationIds) ? (templateData.sourceRecommendationIds as Types.ObjectId[]) : [],
      sourceKBPromptIds: Array.isArray(templateData.sourceKBPromptIds) ? (templateData.sourceKBPromptIds as Types.ObjectId[]) : [],
      sources: [],
      status: 'draft',
      version: 1,
      isPublic: false,
      usageMetrics: { totalUsageCount: 0 },
      createdBy: 'system',
    });

    await newTemplate.save();
    logger.info(`[promptTemplateRoutes] Template created: ${newTemplate._id}`);

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: newTemplate,
    } as ApiResponse<IPromptTemplate>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error creating template: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * GET /api/prompt-templates/app/:appId
 * List templates for an application with filters
 */
promptTemplateRouter.get('/app/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const { status = 'published', limit = 50, skip = 0 } = req.query;

    if (!appId?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    const numLimit = Math.min(parseInt(limit as string) || 50, 100);
    const numSkip = parseInt(skip as string) || 0;

    const templates = await PromptTemplate.find({
      applicationId: appId.toString(),
      status: (status as string) || 'published',
    } as Record<string, unknown>)
      .sort({ createdAt: -1 })
      .skip(numSkip)
      .limit(numLimit);

    const total = await PromptTemplate.countDocuments({
      applicationId: appId.toString(),
      status: (status as string) || 'published',
    } as Record<string, unknown>);

    logger.info(`[promptTemplateRoutes] Retrieved ${templates.length} templates for app ${appId}`);

    res.json({
      success: true,
      data: templates,
      pagination: { page: Math.floor(numSkip / numLimit) + 1, pageSize: numLimit, total },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error fetching templates: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * GET /api/prompt-templates/:id
 * Get single template by ID
 */
promptTemplateRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const id = getQueryString(req.params.id);

    if (!id || !Types.ObjectId.isValid(id)) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    const template = await PromptTemplate.findById(id);

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    res.json({ success: true, data: template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error fetching template: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * POST /api/prompt-templates/refine/:appId
 * Refine template using LLM based on sources
 */
promptTemplateRouter.post('/refine/:appId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const body = req.body as unknown;
    const sources = body && typeof body === 'object' && 'sources' in body
      ? Array.isArray(body.sources)
        ? body.sources
        : []
      : [];

    if (!appId?.toString().trim()) {
      res.status(400).json({ success: false, error: 'Application ID is required' });
      return;
    }

    if (!Array.isArray(sources) || sources.length === 0) {
      res.status(400).json({ success: false, error: 'Sources are required for refinement' });
      return;
    }

    // Get LLM provider and check for app-specific config
    const providerResult = await llmProviderService.getRecommendationLLMProvider(appId.toString());
    const provider = providerResult.provider;
    
    // Try to retrieve app-specific LLM config
    let appLLMConfig = null;
    try {
      appLLMConfig = await llmConfigService.getDefaultConfig(appId.toString());
      logger.info(`[promptTemplateRoutes] Using saved LLM config for app ${appId}`);
    } catch (error: any) {
      logger.info(`[promptTemplateRoutes] No saved LLM config found for app, using default provider`);
    }

    // Extract source content
    const sourceContent = sources
      .map((s: Record<string, unknown>) => (s.content as string) ?? '')
      .join('\n\n---\n\n');

    const systemPrompt = `You are an expert at creating reusable prompt templates. 
Analyze the provided examples and create a generalized template that captures the best practices.
Include placeholders for variable content like {{context}}, {{query}}, {{response}}, etc.`;

    const userPrompt = `Based on these examples, create a reusable prompt template:

${sourceContent}

Respond with JSON:
{
  "refinedTemplate": "The template text with {{placeholders}}",
  "rationale": "Why this template works",
  "suggestions": ["suggestion1", "suggestion2"]
}`;

    const refinement = await provider.generate(userPrompt, {
      systemPrompt,
    });

    // Parse response
    let result = { refinedTemplate: '', rationale: '', suggestions: [] as readonly string[] };
    try {
      const parsed = JSON.parse(refinement);
      result = {
        refinedTemplate: typeof parsed.refinedTemplate === 'string' ? parsed.refinedTemplate : '',
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale : '',
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      };
    } catch {
      result = {
        refinedTemplate: refinement,
        rationale: 'Template generated successfully',
        suggestions: [],
      };
    }

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error refining template: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PUT /api/prompt-templates/:id
 * Update template (including publish/archive)
 */
promptTemplateRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const body = req.body as unknown;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid template ID' });
      return;
    }

    const template = await PromptTemplate.findByIdAndUpdate(id, body as Record<string, unknown>, { new: true });

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    logger.info(`[promptTemplateRoutes] Template updated: ${id}`);
    res.json({ success: true, data: template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error updating template: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * POST /api/prompt-templates/:id/publish
 * Publish a template (draft -> published)
 */
promptTemplateRouter.post('/:id/publish', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid template ID' });
      return;
    }

    const template = await PromptTemplate.findByIdAndUpdate(
      id,
      {
        status: 'published',
        publishedAt: new Date(),
      },
      { new: true }
    );

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    logger.info(`[promptTemplateRoutes] Template published: ${id}`);
    res.json({ success: true, message: 'Template published', data: template });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error publishing template: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * DELETE /api/prompt-templates/:id
 * Archive/delete a template
 */
promptTemplateRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!id?.trim() || !Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid template ID' });
      return;
    }

    await PromptTemplate.findByIdAndUpdate(id, {
      status: 'archived',
      archivedAt: new Date(),
    });

    logger.info(`[promptTemplateRoutes] Template archived: ${id}`);
    res.json({ success: true, message: 'Template archived' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error archiving template: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * GET /api/prompt-templates/app/:appId/export
 * Export templates as JSON or CSV
 */
promptTemplateRouter.get('/app/:appId/export', async (req: Request, res: Response): Promise<void> => {
  try {
    const { appId } = req.params;
    const format = (req.query.format as string) || 'json';

    if (!appId?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    const templates = await PromptTemplate.find({
      applicationId: appId.toString(),
      status: 'published',
    });

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="templates_${appId}_${new Date().toISOString().split('T')[0]}.json"`
      );
      res.send(JSON.stringify(templates, null, 2));
    } else if (format === 'csv') {
      const csv = convertTemplatesToCSV(templates);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="templates_${appId}_${new Date().toISOString().split('T')[0]}.csv"`
      );
      res.send(csv);
    } else {
      res.status(400).json({ success: false, message: 'Invalid format. Use json or csv' });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error exporting templates: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * Helper: Convert templates to CSV
 */
function convertTemplatesToCSV(templates: IPromptTemplate[]): string {
  const headers = ['ID', 'Name', 'Category', 'Tags', 'Status', 'Sources', 'Usage', 'Created At'];
  const rows = templates.map((t) => [
    t._id?.toString() ?? '',
    t.name,
    t.category ?? '',
    Array.isArray(t.tags) ? t.tags.join(';') : '',
    t.status,
    `${(t.sourceRecommendationIds?.length ?? 0) + (t.sourceKBPromptIds?.length ?? 0)} sources`,
    t.usageMetrics?.totalUsageCount ?? 0,
    new Date(t.createdAt).toISOString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * POST /api/prompt-templates/assist/combine-prompts
 * LLM-assisted template generation by combining multiple prompts
 * User must edit the suggestion before saving as a new template
 */
promptTemplateRouter.post('/assist/combine-prompts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, selectedPromptIds, userContext } = req.body as Record<string, unknown>;

    if (!applicationId?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    if (!Array.isArray(selectedPromptIds) || selectedPromptIds.length === 0) {
      res.status(400).json({ success: false, message: 'At least one prompt ID is required' });
      return;
    }

    if (selectedPromptIds.length > 10) {
      res.status(400).json({ success: false, message: 'Cannot combine more than 10 prompts' });
      return;
    }

    // Fetch prompts from database
    const prompts = await PromptTemplate.find({
      _id: { $in: selectedPromptIds },
      applicationId: applicationId.toString(),
    });

    if (prompts.length === 0) {
      res.status(404).json({ success: false, message: 'No prompts found with the provided IDs' });
      return;
    }

    const promptTexts = prompts
      .map((p) => p.templateText ?? '')
      .filter((text) => text.trim().length > 0);

    if (promptTexts.length === 0) {
      res.status(400).json({ success: false, message: 'Selected prompts have no text content' });
      return;
    }

    console.log(`[promptTemplateRoutes] Generating combined prompt suggestion for app: ${applicationId}, prompts: ${selectedPromptIds.length}`);

    // Get LLM assistance
    const suggestion = await llmAssistanceService.assistCombinePrompts(
      applicationId.toString(),
      promptTexts,
      userContext as string | undefined
    );

    // Validate response
    const validatedSuggestion = llmAssistanceService.validateLLMResponse(suggestion, 20, 5000);

    logger.info(`[promptTemplateRoutes] Generated combined prompt suggestion (${validatedSuggestion.length} chars)`);

    res.status(200).json({
      success: true,
      message: 'LLM suggestion generated successfully',
      data: {
        suggestion: validatedSuggestion,
        selectedPromptIds,
        llmProvider: 'configured-provider',
        generatedAt: new Date().toISOString(),
      },
    } as ApiResponse<Record<string, unknown>>);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[promptTemplateRoutes] Error in combine-prompts assistance: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

export default promptTemplateRouter;
