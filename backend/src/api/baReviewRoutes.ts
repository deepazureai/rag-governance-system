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

export default baReviewRouter;
