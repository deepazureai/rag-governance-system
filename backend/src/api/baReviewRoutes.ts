import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import { asString } from '../utils/queryParamUtils.js';
import { baReviewQueueService } from '../services/BAReviewQueueService.js';
import { llmAssistanceService } from '../services/LLMAssistanceService.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

const baReviewRouter: ExpressRouter = Router();

/**
 * Populate BA review queue from raw data records
 * POST /api/ba-review/populate-queue
 */
baReviewRouter.post('/populate-queue', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, limit } = req.body as { applicationId?: string; limit?: number };

    if (!applicationId || typeof applicationId !== 'string') {
      res.status(400).json({ success: false, message: 'applicationId is required' });
      return;
    }

    logger.info(`[baReviewRoutes] Populating queue for app ${applicationId}`);

    const result = await baReviewQueueService.populateReviewQueue(applicationId, limit || 50);

    res.status(200).json({
      success: true,
      message: 'Review queue populated successfully',
      data: result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[baReviewRoutes] Error populating queue: ${message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to populate review queue',
      error: message,
    });
  }
});

/**
 * Get BA review queue statistics
 * GET /api/ba-review/stats/:applicationId
 */
baReviewRouter.get('/stats/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);

    if (!applicationId) {
      res.status(400).json({ success: false, message: 'applicationId is required' });
      return;
    }

    logger.info(`[baReviewRoutes] Getting queue stats for app ${applicationId}`);

    const stats = await baReviewQueueService.getQueueStats(applicationId);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[baReviewRoutes] Error getting queue stats: ${message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics',
      error: message,
    });
  }
});

/**
 * Get BA's review queue - paginated and prioritized
 * GET /api/ba-review/queue/:applicationId?page=1&pageSize=10
 */
baReviewRouter.get('/queue/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = asString(req.params.applicationId);
    const page = parseInt((req.query.page as string) || '1', 10) || 1;
    const pageSize = parseInt((req.query.pageSize as string) || '10', 10) || 10;

    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'applicationId is required' });
    }

    logger.info(`[baReviewRoutes] Getting queue for app ${applicationId}, page ${page}`);

    const result = await baReviewQueueService.getReviewQueue(applicationId as string, page, pageSize);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error(`[baReviewRoutes] Error getting queue:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get review queue',
      error: error.message,
    });
  }
});

/**
 * GET /api/ba-review/raw-data/:recordId
 * Fetch a specific raw data record with all details including saved improvements
 */
baReviewRouter.get('/raw-data/:recordId', async (req: Request, res: Response): Promise<void> => {
  try {
    const recordId = asString(req.params.recordId);

    if (!recordId) {
      res.status(400).json({ success: false, message: 'recordId is required' });
      return;
    }

    // Validate recordId is valid MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      res.status(400).json({ success: false, message: 'Invalid recordId format' });
      return;
    }

    logger.info(`[baReviewRoutes] Fetching raw data record: ${recordId}`);

    const RawDataCollection = mongoose.connection.collection('rawdatarecords');
    const record = await RawDataCollection.findOne({
      _id: new mongoose.Types.ObjectId(recordId),
    });

    if (!record) {
      res.status(404).json({ success: false, message: 'Raw data record not found' });
      return;
    }

    // Format the response
    const response = {
      _id: record._id?.toString(),
      applicationId: record.applicationId,
      userPrompt: record.userPrompt,
      llmResponse: record.llmResponse,
      context: record.context,
      evaluationScores: record.evaluationScores,
      userFeedback: record.userFeedback,
      totalLatency: record.totalLatency,
      baReview: record.baReview || {
        promptImprovements: [],
        reviewStatus: 'pending',
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    logger.info(`[baReviewRoutes] Successfully retrieved record ${recordId} with ${response.baReview.promptImprovements?.length || 0} improvements`);

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching raw data record: ${message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch raw data record',
      error: message,
    });
  }
});

/**
 * POST /api/ba-review/add-improvement
 */
baReviewRouter.post('/add-improvement', async (req: Request, res: Response) => {
  try {
    const {
      queueItemId,
      rawDataRecordId,
      improvedPrompt,
      reason,
      baName,
      baEmail,
      estimatedScoreImpact,
    } = req.body;

    // Validate required fields
    if (!rawDataRecordId || !improvedPrompt || !reason || !baEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: rawDataRecordId, improvedPrompt, reason, baEmail',
      });
    }

    logger.info(`[baReviewRoutes] Adding prompt improvement for record ${rawDataRecordId}`);

    const result = await baReviewQueueService.addPromptImprovement(
      queueItemId || '',
      rawDataRecordId,
      improvedPrompt,
      reason,
      baName || 'Business Analyst',
      baEmail,
      estimatedScoreImpact
    );

    return res.status(200).json({
      success: true,
      message: 'Prompt improvement added successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error(`[baReviewRoutes] Error adding improvement:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to add prompt improvement',
      error: error.message,
    });
  }
});

/**
 * Find similar records for template creation
 * GET /api/ba-review/similar-records/:applicationId?userPrompt=...&limit=10
 */
baReviewRouter.get('/similar-records/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = asString(req.params.applicationId);
    const userPrompt = (req.query.userPrompt as string) || '';
    const limit = (req.query.limit as string) || '10';
    const threshold = (req.query.threshold as string) || '0.7';

    if (!applicationId || !userPrompt) {
      return res.status(400).json({
        success: false,
        message: 'applicationId and userPrompt are required',
      });
    }

    logger.info(`[baReviewRoutes] Finding similar records for app ${applicationId}`);

    const result = await baReviewQueueService.findSimilarRecords(
      applicationId as string,
      userPrompt as string,
      parseFloat(threshold as string) || 0.7,
      parseInt(limit as string) || 10
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error(`[baReviewRoutes] Error finding similar records:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to find similar records',
      error: error.message,
    });
  }
});

/**
 * Get a specific queue item with full raw data
 * GET /api/ba-review/item/:queueItemId
 */
baReviewRouter.get('/item/:queueItemId', async (req: Request, res: Response) => {
  try {
    const { queueItemId } = req.params;

    if (!queueItemId) {
      return res.status(400).json({ success: false, message: 'queueItemId is required' });
    }

    // TODO: Implement fetching full queue item with raw data details
    logger.info(`[baReviewRoutes] Getting queue item ${queueItemId}`);

    return res.status(200).json({
      success: true,
      message: 'Queue item retrieved',
      // data will be populated when fully implemented
    });
  } catch (error: any) {
    logger.error(`[baReviewRoutes] Error getting queue item:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get queue item',
      error: error.message,
    });
  }
});

/**
 * POST /api/ba-review/assist/refine-recommendation
 * LLM-assisted recommendation refinement
 * User provides original recommendation, gets LLM suggestion, must edit before saving
 */
baReviewRouter.post('/assist/refine-recommendation', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, queueItemId, recommendationText } = req.body as Record<string, unknown>;

    if (!applicationId?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    if (!recommendationText?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Recommendation text is required' });
      return;
    }

    const textContent = recommendationText.toString().trim();

    if (textContent.length < 10 || textContent.length > 5000) {
      res.status(400).json({ success: false, message: 'Recommendation text must be between 10 and 5000 characters' });
      return;
    }

    logger.info(`[baReviewRoutes] Generating refined recommendation suggestion for app: ${applicationId}, queue item: ${queueItemId || 'N/A'}`);

    const suggestion = await llmAssistanceService.assistRefineRecommendation(
      applicationId.toString(),
      textContent
    );

    const validatedSuggestion = llmAssistanceService.validateLLMResponse(suggestion, 20, 5000);

    logger.info(`[baReviewRoutes] Generated refined recommendation suggestion (${validatedSuggestion.length} chars)`);

    res.status(200).json({
      success: true,
      message: 'LLM suggestion generated successfully',
      data: {
        suggestion: validatedSuggestion,
        originalRecommendation: textContent,
        queueItemId: queueItemId || null,
        llmProvider: 'configured-provider',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[baReviewRoutes] Error in refine-recommendation assistance: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * GET /api/recommendations/app/:applicationId
 * Fetch LLM-generated recommendations for an application from raw data records
 * Retrieves saved Azure config from MongoDB and uses it for recommendation generation
 */
baReviewRouter.get('/app/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    if (!applicationId?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    logger.info(`[baReviewRoutes] Fetching recommendations for app: ${applicationId}`);

    // Fetch raw data records with evaluation data for this application
    const RawDataRecordCollection = require('mongoose').connection.collection('rawdatarecords');
    const records = await RawDataRecordCollection.find({
      applicationId: applicationId.toString(),
      'llm_recommendations': { $exists: true, $ne: null }
    })
      .limit(50)
      .toArray();

    if (!records || records.length === 0) {
      logger.info(`[baReviewRoutes] No recommendations found for app ${applicationId}`);
      res.status(200).json({
        success: true,
        message: 'No recommendations available',
        data: [],
      });
      return;
    }

    // Extract and format recommendations
    const recommendations = records.map((record: any) => ({
      recordId: record._id?.toString(),
      applicationId: record.applicationId,
      userPrompt: record.user_prompt,
      context: record.context,
      llmResponse: record.llm_response,
      recommendation: record.llm_recommendations,
      evaluationScores: record.evaluationScores,
      createdAt: record.createdAt || new Date().toISOString(),
    }));

    logger.info(`[baReviewRoutes] Retrieved ${recommendations.length} recommendations`);

    res.status(200).json({
      success: true,
      message: 'Recommendations fetched successfully',
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching recommendations: ${message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations',
      error: message,
    });
  }
});

/**
 * GET /api/ba-review/recommendations/:applicationId
 * Fetch BA-approved recommendations for template synthesis
 * Returns formatted recommendations for recommendation-selector.tsx
 */
baReviewRouter.get('/recommendations/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);

    if (!applicationId) {
      res.status(400).json({ success: false, error: 'Missing applicationId' });
      return;
    }

    logger.info(`[baReviewRoutes] Fetching recommendations for template synthesis: ${applicationId}`);

    // Fetch BA improvements/recommendations for this application
    const BAImprovementCollection = require('mongoose').connection.collection('baimprovements');
    const improvements = await BAImprovementCollection.find({
      applicationId: applicationId,
      status: { $in: ['approved', 'suggested'] }
    })
      .limit(100)
      .toArray();

    if (!improvements || improvements.length === 0) {
      logger.info(`[baReviewRoutes] No approved improvements found for app ${applicationId}`);
      res.json({
        success: true,
        data: [],
        count: 0,
      });
      return;
    }

    // Format recommendations for frontend selector
    interface FormattedRecommendation {
      _id: string;
      userPrompt: string;
      llmResponse: string;
      suggestion: string;
      priority: string;
      priorityScore: number;
    }

    const recommendations: FormattedRecommendation[] = improvements.map((imp: any) => ({
      _id: imp._id?.toString(),
      userPrompt: imp.originalPrompt || '',
      llmResponse: imp.improvedPrompt || '',
      suggestion: imp.reason || '',
      priority: imp.priority || 'medium',
      priorityScore: imp.estimatedScoreImpact || 0,
    }));

    logger.info(`[baReviewRoutes] Retrieved ${recommendations.length} approved recommendations`);

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      applicationId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching recommendations: ${message}`);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/ba-review/recommendations/:applicationId/:recommendationId
 * Fetch single recommendation by ID for template synthesis enrichment
 */
baReviewRouter.get('/recommendations/:applicationId/:recommendationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);
    const recommendationId = asString(req.params.recommendationId);

    if (!applicationId || !recommendationId) {
      res.status(400).json({ success: false, error: 'Missing applicationId or recommendationId' });
      return;
    }

    logger.info(`[baReviewRoutes] Fetching single recommendation: ${recommendationId} for app ${applicationId}`);

    const BAImprovementCollection = require('mongoose').connection.collection('baimprovements');
    
    let query: Record<string, unknown> = {
      applicationId: applicationId,
      status: { $in: ['approved', 'suggested'] }
    };

    // Try to match by MongoDB ObjectId if recommendationId looks like one
    if (recommendationId.match(/^[0-9a-f]{24}$/i)) {
      query._id = new (require('mongoose')).Types.ObjectId(recommendationId);
    } else {
      // Fallback to string comparison
      query._id = recommendationId;
    }

    const improvement = await BAImprovementCollection.findOne(query);

    if (!improvement) {
      res.status(404).json({ success: false, error: 'Recommendation not found' });
      return;
    }

    interface FormattedRecommendation {
      _id: string;
      userPrompt: string;
      llmResponse: string;
      suggestion: string;
      priority: string;
      priorityScore: number;
    }

    const recommendation: FormattedRecommendation = {
      _id: improvement._id?.toString() || recommendationId,
      userPrompt: improvement.originalPrompt || '',
      llmResponse: improvement.improvedPrompt || '',
      suggestion: improvement.reason || '',
      priority: improvement.priority || 'medium',
      priorityScore: improvement.estimatedScoreImpact || 0,
    };

    res.json({
      success: true,
      data: recommendation,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching single recommendation: ${message}`);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/ba-review/curate-recommendation
 * Use Settings LLM to curate/refine recommendation based on metrics and initial suggestion
 */
baReviewRouter.post('/curate-recommendation', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const applicationId = typeof body.applicationId === 'string' ? body.applicationId : '';
    const originalPrompt = typeof body.originalPrompt === 'string' ? body.originalPrompt : '';
    const improvedPrompt = typeof body.improvedPrompt === 'string' ? body.improvedPrompt : '';
    const initialReason = typeof body.initialReason === 'string' ? body.initialReason : '';
    const priority = typeof body.priority === 'string' ? body.priority : 'medium';
    const metrics = typeof body.metrics === 'object' && body.metrics !== null ? body.metrics : {};

    if (!applicationId || !originalPrompt || !improvedPrompt) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    logger.info(`[baReviewRoutes] Curating recommendation for app ${applicationId}`);

    // Build context for LLM curation
    let metricsContext = '';
    if (typeof metrics === 'object' && metrics !== null) {
      metricsContext = '\n\nDeepEval Metrics:\n' + 
        Object.entries(metrics as Record<string, unknown>)
          .map(([key, value]) => `- ${key}: ${(typeof value === 'number' ? (value * 100).toFixed(0) : value)}%`)
          .join('\n');
    }

    const curationPrompt = `
You are a BA (Business Analyst) assistant. Refine and enhance this recommendation based on metrics and initial suggestion.

Original Prompt: "${originalPrompt}"
Improved Prompt: "${improvedPrompt}"
Initial LLM Suggestion: "${initialReason}"
Priority: ${priority}
${metricsContext}

INSTRUCTIONS:
1. Combine the metrics insights with the initial suggestion
2. Create a clear, actionable recommendation
3. Reference specific metrics where relevant
4. Keep it concise but comprehensive (2-3 sentences max)

Provide only the curated recommendation text, nothing else.
    `;

    // Use LLM assistance service to refine recommendation
    const curatedSuggestion = await llmAssistanceService.assistRefineRecommendation(
      applicationId,
      initialReason,
      `Combine with metrics: ${JSON.stringify(metrics)}`
    );

    logger.info(`[baReviewRoutes] Recommendation curated successfully`);

    res.status(200).json({
      success: true,
      data: {
        curatedSuggestion: curatedSuggestion.trim(),
        priority,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[baReviewRoutes] Error curating recommendation: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/ba-review/low-score-prompts/:applicationId
 * Fetch all prompts with score below threshold (for bulk processing)
 */
baReviewRouter.get('/low-score-prompts/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);
    const thresholdValue = req.query.threshold;
    const thresholdStr = Array.isArray(thresholdValue) ? thresholdValue[0] : (thresholdValue || '70');
    const threshold = parseInt(thresholdStr as string, 10) / 100;

    if (!applicationId) {
      res.status(400).json({ success: false, error: 'Missing applicationId' });
      return;
    }

    logger.info(`[baReviewRoutes] Fetching low-score prompts for app ${applicationId} (threshold: ${threshold})`);

    const RawDataCollection = require('mongoose').connection.collection('rawdatas');

    // Query for prompts with low scores
    const lowScorePrompts = await RawDataCollection.find({
      applicationId: applicationId,
      'metrics.averageScore': { $lt: threshold },
    })
      .sort({ 'metrics.averageScore': 1 })
      .limit(100)
      .toArray();

    interface FormattedLowScorePrompt {
      _id: string;
      userPrompt: string;
      currentScore: number;
      priority: string;
      llmSuggestion: string;
    }

    const formattedPrompts: FormattedLowScorePrompt[] = lowScorePrompts.map((prompt: any) => ({
      _id: prompt._id?.toString() || '',
      userPrompt: prompt.userInput || '',
      currentScore: prompt.metrics?.averageScore || 0,
      priority: prompt.metrics?.averageScore < 0.5 ? 'critical' : 'high',
      llmSuggestion: prompt.llmOutput || '',
    }));

    logger.info(`[baReviewRoutes] Found ${formattedPrompts.length} low-score prompts`);

    res.json({
      success: true,
      data: formattedPrompts,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching low-score prompts: ${message}`);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/ba-review/process-low-score-prompt
 * Process a single low-score prompt: generate recommendation and add to queue
 */
baReviewRouter.post('/process-low-score-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Record<string, unknown>;

    const applicationId = typeof body.applicationId === 'string' ? body.applicationId : '';
    const promptId = typeof body.promptId === 'string' ? body.promptId : '';
    const userPrompt = typeof body.userPrompt === 'string' ? body.userPrompt : '';
    const currentScore = typeof body.currentScore === 'number' ? body.currentScore : 0;
    const llmSuggestion = typeof body.llmSuggestion === 'string' ? body.llmSuggestion : '';

    if (!applicationId || !promptId || !userPrompt) {
      res.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    logger.info(`[baReviewRoutes] Processing low-score prompt: ${promptId}`);

    // Generate improvement suggestion using LLM assistance service
    const improvementSuggestion = await llmAssistanceService.assistRefineRecommendation(
      applicationId,
      userPrompt,
      `Current performance score: ${(currentScore * 100).toFixed(0)}%. Suggest improvements.`
    );

    // Add to BA review queue
    const BAImprovementCollection = require('mongoose').connection.collection('baimprovements');

    const improvement = {
      applicationId,
      originalPrompt: userPrompt,
      improvedPrompt: llmSuggestion,
      reason: improvementSuggestion.trim(),
      priority: currentScore < 0.5 ? 'critical' : 'high',
      estimatedScoreImpact: Math.min(0.3, 1 - currentScore),
      status: 'suggested',
      createdAt: new Date(),
      sourcePromptId: promptId,
    };

    await BAImprovementCollection.insertOne(improvement);

    logger.info(`[baReviewRoutes] Low-score prompt processed and added to queue`);

    res.json({
      success: true,
      data: {
        promptId,
        suggestion: improvementSuggestion.trim(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[baReviewRoutes] Error processing low-score prompt: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/ba-review/raw-data-by-metric
 * Fetch raw data records matching a specific metric and value for recommendations
 * Query params:
 *   - applicationId: Application ID (required)
 *   - metric: Metric name (required)
 *   - value: Metric value (required)
 */
baReviewRouter.get('/raw-data-by-metric', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationIdParam = req.query.applicationId;
    const metricParam = req.query.metric;
    const valueParam = req.query.value;

    const applicationId = Array.isArray(applicationIdParam) ? applicationIdParam[0] : applicationIdParam;
    const metric = Array.isArray(metricParam) ? metricParam[0] : metricParam;
    const valueStr = Array.isArray(valueParam) ? valueParam[0] : valueParam;

    if (!applicationId || !metric || !valueStr) {
      res.status(400).json({
        success: false,
        message: 'applicationId, metric, and value query parameters are required',
      });
      return;
    }

    const value = parseFloat(valueStr as string);
    if (isNaN(value)) {
      res.status(400).json({
        success: false,
        message: 'value must be a valid number',
      });
      return;
    }

    logger.info(`[baReviewRoutes] Fetching raw data for app ${applicationId}, metric ${metric}, value ${value}`);

    const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
    
    // Search for evaluation records with the metric
    const metricStr = metric as string;
    const queryField = `evaluation.${metricStr}`;
    
    // Build query to find records with metric value close to the requested value
    const query: Record<string, unknown> = {
      applicationId: applicationId as string,
    };
    
    // Query with range (±0.5 tolerance)
    (query as Record<string, unknown>)[queryField] = {
      $gte: value - 0.5,
      $lte: value + 0.5,
    };

    console.log('[v0] Query for raw-data-by-metric:', JSON.stringify(query));

    const records = await EvaluationCollection.find(query).limit(1).toArray();

    console.log('[v0] Found records count:', records?.length || 0);

    if (!records || records.length === 0) {
      logger.warn(
        `[baReviewRoutes] No records found for app ${applicationId}, metric ${metric}, value ${value}. ` +
        'This may indicate no evaluation data exists yet. Please ensure data has been uploaded and evaluated.'
      );
      
      res.status(404).json({
        success: false,
        message: `No evaluation data found for metric: ${metric}. Please check that data has been uploaded and DeepEval metrics have been calculated.`,
      });
      return;
    }

    const record = records[0] as any;

    // Build complete evaluation scores from all available metrics in the record
    const allEvaluationScores = record.evaluation || {};
    const evaluationScoresArray = Object.entries(allEvaluationScores).map(([metricName, value]: [string, unknown]) => ({
      metricName,
      value: typeof value === 'number' ? value : 0,
      timestamp: record.timestamp || record.createdAt,
    }));

    // Format the response with all available data
    const response = {
      _id: record._id?.toString(),
      applicationId: record.applicationId,
      userPrompt: record.userPrompt || record.query || '',
      llmResponse: record.llmResponse || record.response || '',
      context: record.context || '',
      contextRetrieved: record.contextRetrieved || [],
      
      // Include ALL evaluation scores, not just one
      evaluationScores: evaluationScoresArray.length > 0 ? evaluationScoresArray : [
        {
          metricName: metric,
          value: value,
          timestamp: record.timestamp || record.createdAt,
        },
      ],
      
      // Timing information for LLM and context retrieval
      userPromptEnteredAt: record.userPromptEnteredAt || record.createdAt,
      llmResponseGeneratedAt: record.llmResponseGeneratedAt || record.updatedAt,
      contextRetrievalTime: record.contextRetrievalTime,
      llmGenerationTime: record.llmGenerationTime,
      totalLatency: record.totalLatency,
      tokensUsed: record.tokensUsed,
      
      userFeedback: record.userFeedback,
      baReview: record.baReview || {
        promptImprovements: [],
        reviewStatus: 'pending',
      },
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };

    console.log('[v0] Response data structure:', {
      prompt: response.userPrompt?.substring(0, 50),
      response: response.llmResponse?.substring(0, 50),
      contextCount: response.contextRetrieved?.length || 0,
      metricsCount: response.evaluationScores?.length || 0,
      metricsNames: response.evaluationScores?.map((s: any) => s.metricName),
    });

    logger.info(
      `[baReviewRoutes] Successfully retrieved record ${record._id?.toString()} with metric ${metric}. ` +
      `Evaluation scores: ${evaluationScoresArray.map((s: any) => `${s.metricName}=${s.value}`).join(', ')}`
    );

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching raw data by metric: ${message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch raw data record',
      error: message,
    });
  }
});

export default baReviewRouter;
