import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import { asString } from '../utils/queryParamUtils.js';
import { baReviewQueueService } from '../services/BAReviewQueueService.js';
import { llmAssistanceService } from '../services/LLMAssistanceService.js';
import { metricsAnalysisService } from '../services/MetricsAnalysisService.js';
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
    const RawDataRecordCollection = mongoose.connection.collection('rawdatarecords');
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
    const BAImprovementCollection = mongoose.connection.collection('baimprovements');
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

    console.log('[v0] GET /recommendations - applicationId:', applicationId, 'recommendationId:', recommendationId);
    logger.info(`[baReviewRoutes] Fetching recommendation: ${recommendationId} for app ${applicationId}`);

    // Query the RawDataRecord collection (contains all recommendations + improvements)
    const RawDataRecordCollection = mongoose.connection.collection('rawdatarecords');

    let query: Record<string, unknown> = {
      applicationId: applicationId,
    };

    // Try to match by MongoDB ObjectId if recommendationId looks like one
    if (recommendationId.match(/^[0-9a-f]{24}$/i)) {
      query._id = new mongoose.Types.ObjectId(recommendationId);
      console.log('[v0] Query using ObjectId:', recommendationId);
    } else {
      // Fallback to string comparison
      query._id = recommendationId;
      console.log('[v0] Query using string:', recommendationId);
    }

    const record = await RawDataRecordCollection.findOne(query);
    console.log('[v0] Query result - record found:', !!record);

    if (!record) {
      console.log('[v0] Record not found for recommendationId:', recommendationId);
      res.status(404).json({ success: false, error: 'Recommendation not found' });
      return;
    }

    // Extract recommendation data from the record
    const baReview = record.baReview || {};
    const recommendations = baReview.recommendations || [];
    const improvement = baReview.improvement || '';
    const improvementReason = baReview.improvementReason || '';
    const IsImprovementSaved = baReview.IsImprovementSaved || 0;
    
    console.log('[v0] Response data - improvement saved:', IsImprovementSaved);

    res.json({
      success: true,
      data: {
        userPrompt: record.userPrompt || '',
        llmResponse: record.llmResponse || '',
        recommendations,
        improvement,
        improvementReason,
        IsImprovementSaved,
        lastSavedAt: baReview.lastSavedAt,
        hasRecommendations: recommendations.length > 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching recommendation: ${message}`);
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

    const RawDataCollection = mongoose.connection.collection('rawdatas');

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
    const BAImprovementCollection = mongoose.connection.collection('baimprovements');

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

/**
 * POST /api/ba-review/get-recommendations
 * Generate LLM recommendations based on raw data record and DeepEval analysis
 * Requires: recordId and applicationId in body, or metric-based query params
 * Returns: DeepEval findings + LLM-generated recommendations
 */
baReviewRouter.post('/get-recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recordId, applicationId, userPrompt, llmResponse, contextRetrieved, evaluationScores } = req.body as {
      recordId?: string;
      applicationId?: string;
      userPrompt?: string;
      llmResponse?: string;
      contextRetrieved?: string[];
      evaluationScores?: Array<{ metricName: string; value: number }>;
    };

    if (!applicationId) {
      res.status(400).json({ success: false, message: 'applicationId is required' });
      return;
    }

    if (!userPrompt || !llmResponse || !evaluationScores || evaluationScores.length === 0) {
      res.status(400).json({
        success: false,
        message: 'userPrompt, llmResponse, and evaluationScores are required',
      });
      return;
    }

    logger.info(`[baReviewRoutes] Generating recommendations for app ${applicationId}, record ${recordId || 'new'}`);

    // Check if recommendations already exist for this record (duplicate prevention)
    if (recordId && mongoose.Types.ObjectId.isValid(recordId)) {
      const RawDataRecordCollection = mongoose.connection.collection('rawdatarecords');
      const existingRecord = await RawDataRecordCollection.findOne({ 
        _id: new mongoose.Types.ObjectId(recordId) 
      });
      
      if (existingRecord?.baReview?.recommendations && existingRecord.baReview.recommendations.length > 0) {
        logger.info(`[baReviewRoutes] Recommendations already exist for record ${recordId}, returning cached`);
        res.status(200).json({
          success: true,
          data: {
            recordId,
            applicationId,
            deepevalAnalysis: existingRecord.baReview.recommendations[0]?.deepevalAnalysis || {},
            llmRecommendations: existingRecord.baReview.recommendations[0]?.suggestions?.[0]?.suggestion || '',
            generatedAt: existingRecord.baReview.recommendations[0]?.generatedAt || new Date().toISOString(),
            cached: true,
          },
        });
        return;
      }
    }

    // Convert evaluation scores to metrics object for analysis
    const metricsObject: Record<string, number> = {};
    evaluationScores.forEach(score => {
      metricsObject[score.metricName] = score.value;
    });

    // Analyze metrics using DeepEval
    const deepevalAnalysis = metricsAnalysisService.analyzeMetrics(metricsObject);

    console.log('[v0] DeepEval analysis completed:', {
      overallHealth: deepevalAnalysis.overallHealth,
      criticalIssuesCount: deepevalAnalysis.criticalIssues.length,
      warningsCount: deepevalAnalysis.warnings.length,
    });

    // Generate LLM recommendations using saved LLM config
    const llmRecommendations = await llmAssistanceService.generateRecommendations(
      applicationId,
      userPrompt,
      llmResponse,
      contextRetrieved || [],
      deepevalAnalysis
    );

    const response = {
      success: true,
      data: {
        recordId: recordId || 'direct',
        applicationId,
        deepevalAnalysis,
        llmRecommendations,
        generatedAt: new Date().toISOString(),
        cached: false,
      },
    };

    logger.info(`[baReviewRoutes] Successfully generated recommendations for app ${applicationId}`);

    res.status(200).json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error generating recommendations: ${message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to generate recommendations',
      error: message,
    });
  }
});

/**
 * Curate and refine a prompt based on identified issues
 * POST /api/ba-review/curate-prompt
 * 
 * Generates an ACTUAL REVISED PROMPT (not just recommendations)
 * that incorporates the identified issues and improvements
 */
baReviewRouter.post('/curate-prompt', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, originalPrompt, issues } = req.body as {
      applicationId?: string;
      originalPrompt?: string;
      issues?: string[];
    };

    // Validation
    if (!applicationId || typeof applicationId !== 'string') {
      res.status(400).json({ success: false, error: 'applicationId is required' });
      return;
    }

    if (!originalPrompt || typeof originalPrompt !== 'string') {
      res.status(400).json({ success: false, error: 'originalPrompt is required' });
      return;
    }

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      res.status(400).json({ success: false, error: 'issues array is required with at least one item' });
      return;
    }

    logger.info(`[baReviewRoutes] Curating prompt for app ${applicationId} with ${issues.length} issues`);
    console.log('[v0] Curating prompt - originalPrompt length:', originalPrompt.length, 'issues count:', issues.length);
    console.log('[v0] Issues received:', JSON.stringify(issues, null, 2));

    // Call the service to curate and refine the prompt
    const result = await llmAssistanceService.curateAndRefinePrompt(
      applicationId,
      originalPrompt,
      issues
    );

    logger.info(`[baReviewRoutes] Successfully curated prompt for app ${applicationId}`);
    console.log('[v0] Curated prompt result - revisedPrompt length:', result.revisedPrompt.length);
    console.log('[v0] Curated prompt result - reasoning:', result.reasoning.substring(0, 100));

    res.status(200).json({
      success: true,
      data: result,
      message: 'Prompt successfully curated and refined',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error curating prompt: ${message}`);
    console.error('[v0] Error in curate-prompt:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to curate and refine prompt',
    });
  }
});

/**
 * Get prompts with revisions for an application (for Recommendations tab)
 * GET /api/ba-review/prompts-with-revisions/:applicationId
 * Query params: page=1, limit=20
 */
baReviewRouter.get('/prompts-with-revisions/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);
    const pageStr = typeof req.query.page === 'string' ? req.query.page : '1';
    const limitStr = typeof req.query.limit === 'string' ? req.query.limit : '20';
    const page = parseInt(pageStr, 10);
    const limit = parseInt(limitStr, 10);
    const skip = (page - 1) * limit;

    if (!applicationId || typeof applicationId !== 'string') {
      res.status(400).json({ success: false, error: 'applicationId is required' });
      return;
    }

    const EvaluationCollection = mongoose.connection.collection('evaluationrecords');

    // Fetch total count for pagination
    const totalCount = await EvaluationCollection.countDocuments({ applicationId });

    // Fetch prompts with revisions, with pagination
    const prompts = await EvaluationCollection.find(
      { applicationId },
      {
        projection: {
          _id: 1,
          applicationId: 1,
          userPrompt: 1,
          'baReview.promptImprovements': 1,
          'baReview.approvalStatus': 1,
          'baReview.approvedRevisedPrompt': 1,
          'baReview.approvalReason': 1,
          'baReview.approvedBy': 1,
          'baReview.approvedAt': 1,
          llmResponse: 1,
          context: 1,
          deepEvalAnalysis: 1,
          'baReview.reviewStatus': 1,
          updatedAt: 1,
        },
      }
    )
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    console.log(`[v0] Fetched ${prompts.length} prompts for app ${applicationId}, total: ${totalCount}`);

    res.status(200).json({
      success: true,
      data: {
        prompts: prompts.map((p: any) => {
          const firstImprovement = p.baReview?.promptImprovements?.[0];
          return {
            _id: p._id?.toString?.(),
            applicationId: p.applicationId,
            userPrompt: p.userPrompt,
            revisedPrompt: firstImprovement?.revisedPrompt || null,
            improvementReason: firstImprovement?.improvementReason || null,
            estimatedScoreIncrease: firstImprovement?.estimatedScoreIncrease || 0,
            generatedAt: firstImprovement?.generatedAt || null,
            llmResponse: p.llmResponse,
            hasRevision: !!firstImprovement?.revisedPrompt,
            approvalStatus: p.baReview?.approvalStatus || 'pending',
            approvedRevisedPrompt: p.baReview?.approvedRevisedPrompt || null,
            approvalReason: p.baReview?.approvalReason || null,
            approvedBy: p.baReview?.approvedBy || null,
            approvedAt: p.baReview?.approvedAt || null,
            updatedAt: p.updatedAt,
          };
        }),
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit),
        },
      },
      message: 'Prompts fetched successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching prompts with revisions: ${message}`);
    console.error('[v0] Error in prompts-with-revisions:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to fetch prompts',
    });
  }
});

/**
 * Approve/Reject a prompt revision (for Recommendations tab)
 * PATCH /api/ba-review/approve-prompt/:recordId
 * Body: { approvalStatus: 'approved'|'rejected', approvedRevisedPrompt: string, approvalReason: string }
 */
baReviewRouter.patch('/approve-prompt/:recordId', async (req: Request, res: Response): Promise<void> => {
  try {
    const recordId = asString(req.params.recordId);
    const { approvalStatus, approvedRevisedPrompt, approvalReason } = req.body as any;

    if (!recordId) {
      res.status(400).json({ success: false, error: 'recordId is required' });
      return;
    }

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      res.status(400).json({ success: false, error: 'approvalStatus must be "approved" or "rejected"' });
      return;
    }

    const EvaluationCollection = mongoose.connection.collection('evaluationrecords');

    // Find record
    let objectId: mongoose.Types.ObjectId | null = null;
    try {
      if (recordId.length === 24) {
        objectId = new mongoose.Types.ObjectId(recordId);
      }
    } catch (e) {
      // Not a valid ObjectId, try string lookup
    }

    const query = objectId ? { _id: objectId } : { _id: recordId };
    const record = await EvaluationCollection.findOne(query as any);

    if (!record) {
      res.status(404).json({ success: false, error: `Record not found: ${recordId}` });
      return;
    }

    // Update with approval status
    const updateData: any = {
      $set: {
        'baReview.approvalStatus': approvalStatus,
        'baReview.approvedRevisedPrompt': approvedRevisedPrompt,
        'baReview.approvalReason': approvalReason,
        'baReview.approvedBy': 'ba@company.com',
        'baReview.approvedAt': new Date(),
        updatedAt: new Date(),
      },
    };

    const updateResult = await EvaluationCollection.updateOne(query as any, updateData);

    if (updateResult.modifiedCount === 0) {
      res.status(500).json({ success: false, error: 'Failed to update record' });
      return;
    }

    console.log(`[v0] Prompt ${approvalStatus} for record ${recordId}`);

    res.status(200).json({
      success: true,
      message: `Prompt ${approvalStatus} successfully`,
      data: {
        recordId,
        approvalStatus,
        approvedRevisedPrompt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error approving prompt: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * PATCH /api/ba-review/kb-prompts/:promptId/approve
 * Approve or reject a KB prompt (same structure as recommendation approval)
 * Body: { approvalStatus: 'approved'|'rejected', approvalReason: string }
 */
baReviewRouter.patch('/kb-prompts/:promptId/approve', async (req: Request, res: Response): Promise<void> => {
  try {
    const promptId = asString(req.params.promptId);
    const { approvalStatus, approvalReason } = req.body as any;

    if (!promptId) {
      res.status(400).json({ success: false, error: 'promptId is required' });
      return;
    }

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      res.status(400).json({ success: false, error: 'approvalStatus must be "approved" or "rejected"' });
      return;
    }

    const KBPromptCollection = mongoose.connection.collection('kbprompts');

    let objectId: mongoose.Types.ObjectId | null = null;
    try {
      if (promptId.length === 24) {
        objectId = new mongoose.Types.ObjectId(promptId);
      }
    } catch (e) {
      // Not a valid ObjectId
    }

    const query = objectId ? { _id: objectId } : { _id: promptId };
    const prompt = await KBPromptCollection.findOne(query as any);

    if (!prompt) {
      res.status(404).json({ success: false, error: `KB Prompt not found: ${promptId}` });
      return;
    }

    // Update KB prompt with approval status
    const updateData: any = {
      $set: {
        badgeStatus: approvalStatus,
        approvalReason: approvalReason,
        approvedBy: 'ba@company.com',
        approvedAt: new Date(),
        updatedAt: new Date(),
      },
    };

    const updateResult = await KBPromptCollection.updateOne(query as any, updateData);

    if (updateResult.modifiedCount === 0) {
      res.status(500).json({ success: false, error: 'Failed to update KB prompt' });
      return;
    }

    logger.info(`[baReviewRoutes] KB Prompt ${approvalStatus} for ID ${promptId}`);

    res.status(200).json({
      success: true,
      message: `KB Prompt ${approvalStatus} successfully`,
      data: {
        promptId,
        approvalStatus,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error approving KB prompt: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Get approved prompts for template building from BOTH sources
 * GET /api/ba-review/approved-prompts/:applicationId
 * 
 * UNIFIED ENDPOINT: Fetches from BOTH evaluationrecords (recommendations) AND kbprompts
 * Returns unified array with source field indicating origin
 */
baReviewRouter.get('/approved-prompts/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);

    if (!applicationId) {
      res.status(400).json({ success: false, error: 'applicationId is required' });
      return;
    }

    const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
    const KBPromptCollection = mongoose.connection.collection('kbprompts');

    // Fetch approved RECOMMENDATIONS
    const approvedRecommendations = await EvaluationCollection.find(
      {
        applicationId,
        'baReview.approvalStatus': 'approved',
      },
      {
        projection: {
          _id: 1,
          applicationId: 1,
          userPrompt: 1,
          'baReview.approvedRevisedPrompt': 1,
          'baReview.approvalReason': 1,
          'baReview.promptImprovements': 1,
          updatedAt: 1,
        },
      }
    )
      .sort({ 'baReview.approvedAt': -1 })
      .toArray();

    // Fetch approved KB PROMPTS
    const approvedKBPrompts = await KBPromptCollection.find(
      {
        applicationId,
        badgeStatus: 'approved',
      },
      {
        projection: {
          _id: 1,
          applicationId: 1,
          userQuery: 1,
          llmGeneratedResponse: 1,
          contextRetrieved: 1,
          approvalReason: 1,
          badgedAt: 1,
        },
      }
    )
      .sort({ approvedAt: -1, badgedAt: -1 })
      .toArray();

    // Normalize recommendations to unified format
    const normalizedRecommendations = approvedRecommendations.map((p: any) => ({
      _id: p._id?.toString?.(),
      applicationId: p.applicationId,
      source: 'recommendation',
      originalPrompt: p.userPrompt,
      userPrompt: p.userPrompt,
      revisedPrompt: p.baReview?.approvedRevisedPrompt || '',
      improvementReason: p.baReview?.promptImprovements?.[0]?.improvementReason || '',
      approvedAt: p.baReview?.approvedAt,
      approvalReason: p.baReview?.approvalReason,
    }));

    // Normalize KB prompts to unified format
    const normalizedKBPrompts = approvedKBPrompts.map((p: any) => ({
      _id: p._id?.toString?.(),
      applicationId: p.applicationId,
      source: 'kb_prompt',
      originalPrompt: p.userQuery,
      userPrompt: p.userQuery,
      revisedPrompt: p.llmGeneratedResponse,
      improvementReason: `Generated from RAG: ${p.contextRetrieved?.length || 0} sources`,
      approvedAt: p.approvedAt || p.badgedAt,
      approvalReason: p.approvalReason || 'KB Prompt',
      contextUsed: p.contextRetrieved,
    }));

    // Combine and deduplicate (if any)
    const allApprovedPrompts = [...normalizedRecommendations, ...normalizedKBPrompts];

    logger.info(
      `[baReviewRoutes] Fetched ${normalizedRecommendations.length} recommendations + ${normalizedKBPrompts.length} KB prompts for app ${applicationId}`
    );

    res.status(200).json({
      success: true,
      data: {
        prompts: allApprovedPrompts,
        count: allApprovedPrompts.length,
        breakdown: {
          recommendations: normalizedRecommendations.length,
          kbPrompts: normalizedKBPrompts.length,
        },
      },
      message: 'Approved prompts fetched successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error fetching approved prompts: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});


/**
 * Synthesize approved prompts into CrewAI template format
 * POST /api/ba-review/synthesize-template
 * Body: { applicationId: string, selectedPromptIds: string[], templateName: string }
 * 
 * UNIFIED: Handles prompts from BOTH sources (recommendations + KB prompts)
 */
baReviewRouter.post('/synthesize-template', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, selectedPromptIds, templateName } = req.body as any;

    if (!applicationId || !selectedPromptIds || selectedPromptIds.length === 0) {
      res.status(400).json({ success: false, error: 'applicationId and selectedPromptIds are required' });
      return;
    }

    const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
    const KBPromptCollection = mongoose.connection.collection('kbprompts');

    // Convert IDs to ObjectIds for recommendations
    const objectIds = selectedPromptIds
      .map((id: string) => {
        try {
          return id.length === 24 ? new mongoose.Types.ObjectId(id) : id;
        } catch {
          return id;
        }
      });

    // Fetch BOTH approved recommendations AND KB prompts
    const [selectedRecommendations, selectedKBPrompts] = await Promise.all([
      EvaluationCollection.find(
        {
          _id: { $in: objectIds },
          'baReview.approvalStatus': 'approved',
        }
      ).toArray(),
      KBPromptCollection.find(
        {
          _id: { $in: objectIds },
          badgeStatus: 'approved',
        }
      ).toArray(),
    ]);

    // Combine prompts from both sources
    const allSelectedPrompts = [...selectedRecommendations, ...selectedKBPrompts];

    if (allSelectedPrompts.length === 0) {
      res.status(400).json({ success: false, error: 'No approved prompts found with provided IDs' });
      return;
    }

    // Normalize prompts to extraction logic that handles both types
    const normalizePrompt = (p: any, isKB: boolean = false) => {
      if (isKB) {
        return {
          promptText: p.llmGeneratedResponse,
          originalPrompt: p.userQuery,
          goal: p.llmGeneratedResponse.substring(0, 200),
          source: 'KB Prompt',
        };
      } else {
        return {
          promptText: p.baReview?.approvedRevisedPrompt || p.userPrompt,
          originalPrompt: p.userPrompt,
          goal: p.baReview?.approvedRevisedPrompt || p.userPrompt,
          source: 'Recommendation',
        };
      }
    };

    const normalizedPrompts = [
      ...selectedRecommendations.map((p) => ({ ...normalizePrompt(p, false), _id: p._id })),
      ...selectedKBPrompts.map((p) => ({ ...normalizePrompt(p, true), _id: p._id })),
    ];

    // Synthesize into CrewAI format with mixed sources
    const crewAITemplate = {
      name: templateName || 'Unified Template',
      description: `CrewAI template synthesized from ${selectedRecommendations.length} recommendations + ${selectedKBPrompts.length} KB prompts`,
      metadata: {
        sourceBreakdown: {
          recommendations: selectedRecommendations.length,
          kbPrompts: selectedKBPrompts.length,
          total: allSelectedPrompts.length,
        },
        createdAt: new Date().toISOString(),
        applicationId,
      },
      actors: normalizedPrompts.map((p: any, idx: number) => ({
        id: `actor_${idx + 1}`,
        role: `${p.source} Specialist ${idx + 1}`,
        goal: p.goal,
        source: p.source,
      })),
      tasks: normalizedPrompts.map((p: any, idx: number) => ({
        id: `task_${idx + 1}`,
        description: p.promptText,
        source: p.source,
        expected_output: `Comprehensive response addressing task from ${p.source}`,
      })),
      workflow: {
        steps: normalizedPrompts.map((_, idx: number) => ({
          step: idx + 1,
          task_id: `task_${idx + 1}`,
          actor_id: `actor_${idx + 1}`,
        })),
      },
      context: {
        all_prompts: normalizedPrompts.map((p: any) => ({
          text: p.promptText,
          source: p.source,
          original: p.originalPrompt,
        })),
        template_type: 'unified_mixed_source',
      },
    };

    logger.info(
      `[baReviewRoutes] Synthesized CrewAI template from ${selectedRecommendations.length} recommendations + ${selectedKBPrompts.length} KB prompts`
    );

    res.status(200).json({
      success: true,
      data: {
        template: crewAITemplate,
        promptsIncluded: allSelectedPrompts.length,
        breakdown: {
          recommendations: selectedRecommendations.length,
          kbPrompts: selectedKBPrompts.length,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error synthesizing template: ${message}`);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Save recommendations and improvements to RawDataRecord
 * POST /api/ba-review/save-recommendations
 * Persists generated recommendations and user improvements to database for retrieval later
 */
baReviewRouter.post('/save-recommendations', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, rawDataId, recommendations, improvement, improvementReason } = req.body as {
      applicationId?: string;
      rawDataId?: string;
      recommendations?: any[];
      improvement?: string;
      improvementReason?: string;
    };

    if (!applicationId || typeof applicationId !== 'string') {
      res.status(400).json({ success: false, error: 'applicationId is required' });
      return;
    }

    if (!rawDataId || typeof rawDataId !== 'string') {
      res.status(400).json({ success: false, error: 'rawDataId is required' });
      return;
    }

    logger.info(`[baReviewRoutes] Saving recommendations for app ${applicationId}, rawData ${rawDataId}`);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(rawDataId)) {
      logger.warn(`[baReviewRoutes] Invalid ObjectId format: ${rawDataId}`);
      res.status(400).json({ success: false, error: 'Invalid rawDataId format' });
      return;
    }

    const RawDataRecordCollection = mongoose.connection.collection('rawdatarecords');

    // Build update data - set flag to 1 when saving, only set fields that have values
    const updateData: Record<string, any> = {
      'baReview.lastSavedAt': new Date(),
      'baReview.IsImprovementSaved': 1, // Mark as saved
    };

    // Add recommendations if provided
    if (recommendations && Array.isArray(recommendations) && recommendations.length > 0) {
      updateData['baReview.recommendations'] = recommendations;
    }

    // Add improvement if provided
    if (improvement && typeof improvement === 'string' && improvement.trim()) {
      updateData['baReview.improvement'] = improvement.trim();
    }

    // Add improvement reason if provided
    if (improvementReason && typeof improvementReason === 'string' && improvementReason.trim()) {
      updateData['baReview.improvementReason'] = improvementReason.trim();
    }

    const result = await RawDataRecordCollection.updateOne(
      { _id: new mongoose.Types.ObjectId(rawDataId) },
      { $set: updateData },
      { upsert: true } // Create record if it doesn't exist
    );

    // Log result for debugging
    console.log('[v0] Save recommendations result:', {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      upsertedId: result.upsertedId,
    });
    
    // Verify the record was actually saved
    const savedRecord = await RawDataRecordCollection.findOne({ _id: new mongoose.Types.ObjectId(rawDataId) });
    console.log('[v0] Verification after save - Record found:', !!savedRecord);
    if (savedRecord) {
      console.log('[v0] Verification - Record has baReview:', !!savedRecord.baReview);
      console.log('[v0] Verification - Improvement saved:', savedRecord.baReview?.improvement ? 'YES' : 'NO');
      console.log('[v0] Verification - IsImprovementSaved flag:', savedRecord.baReview?.IsImprovementSaved);
    }

    logger.info(`[baReviewRoutes] Successfully saved recommendations for rawData ${rawDataId}`);

    res.status(200).json({
      success: true,
      data: {
        rawDataId,
        recommendationsSaved: recommendations?.length || 0,
        improvementSaved: !!improvement,
        savedAt: new Date(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error saving recommendations: ${message}`);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * Get saved recommendations for a RawDataRecord
 * GET /api/ba-review/recommendations/:applicationId/:rawDataId
 * Retrieves previously saved recommendations and improvements
 */
baReviewRouter.get('/recommendations/:applicationId/:rawDataId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);
    const rawDataId = asString(req.params.rawDataId);

    if (!applicationId || !rawDataId) {
      res.status(400).json({ success: false, error: 'applicationId and rawDataId are required' });
      return;
    }

    logger.info(`[baReviewRoutes] Getting recommendations for rawData ${rawDataId}`);

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(rawDataId)) {
      logger.warn(`[baReviewRoutes] Invalid ObjectId format: ${rawDataId}`);
      res.status(400).json({
        success: false,
        error: 'Invalid rawDataId format',
      });
      return;
    }

    const RawDataRecordCollection = mongoose.connection.collection('rawdatarecords');

    console.log('[v0] GET recommendations - Looking for recordId:', rawDataId, 'applicationId:', applicationId);
    console.log('[v0] MongoDB connection state:', mongoose.connection.readyState, '(1=connected, 0=disconnected)');
    
    // Debug: Check total records in collection
    const totalRecords = await RawDataRecordCollection.countDocuments();
    console.log('[v0] Total records in rawdatarecords collection:', totalRecords);
    
    const record = await RawDataRecordCollection.findOne({ _id: new mongoose.Types.ObjectId(rawDataId) });

    if (!record) {
      console.log('[v0] GET recommendations - Record NOT found for:', rawDataId);
      logger.info(`[baReviewRoutes] RawDataRecord not found for ${rawDataId}`);
      
      // Debug: Show what records exist for this application
      const appRecords = await RawDataRecordCollection.find({ applicationId }).toArray();
      console.log('[v0] Records for applicationId:', applicationId, '- count:', appRecords.length);
      if (appRecords.length > 0) {
        console.log('[v0] Record IDs for this app:', appRecords.slice(0, 5).map(r => ({ id: r._id.toString(), hasBarReview: !!r.baReview })));
      }
      
      // Try alternative query method as fallback
      const allRecords = await RawDataRecordCollection.find({ applicationId }).limit(5).toArray();
      console.log('[v0] Alternative query - Found records with same appId:', allRecords.length);
      if (allRecords.length > 0) {
        console.log('[v0] Sample record IDs:', allRecords.map(r => r._id.toString()));
      }
      
      res.status(404).json({
        success: false,
        error: 'RawDataRecord not found',
      });
      return;
    }
    
    console.log('[v0] GET recommendations - Record FOUND for:', rawDataId);

    const baReview = record.baReview || {};
    const recommendations = baReview.recommendations || [];
    const improvement = baReview.improvement || '';
    const improvementReason = baReview.improvementReason || '';
    const IsImprovementSaved = baReview.IsImprovementSaved || 0; // 0 or 1
    const userPrompt = record.userPrompt || 'No original prompt available';
    const llmResponse = record.llmResponse || '';

    logger.info(`[baReviewRoutes] Retrieved ${recommendations.length} recommendations for rawData ${rawDataId}`);

    res.status(200).json({
      success: true,
      data: {
        userPrompt,
        llmResponse,
        recommendations,
        improvement,
        improvementReason,
        IsImprovementSaved, // 0 = not saved, 1 = saved
        lastSavedAt: baReview.lastSavedAt,
        hasRecommendations: recommendations.length > 0,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`[baReviewRoutes] Error getting recommendations: ${message}`);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default baReviewRouter;
