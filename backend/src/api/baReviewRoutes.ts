import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import { asString } from '../utils/queryParamUtils.js';
import { baReviewQueueService } from '../services/BAReviewQueueService.js';
import { llmAssistanceService } from '../services/LLMAssistanceService.js';
import { logger } from '../utils/logger.js';

const baReviewRouter: ExpressRouter = Router();

/**
 * Populate BA review queue from raw data records
 * POST /api/ba-review/populate-queue
 */
baReviewRouter.post('/populate-queue', async (req: Request, res: Response) => {
  try {
    const { applicationId, limit } = req.body;

    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'applicationId is required' });
    }

    logger.info(`[baReviewRoutes] Populating queue for app ${applicationId}`);

    const result = await baReviewQueueService.populateReviewQueue(applicationId, limit || 50);

    return res.status(200).json({
      success: true,
      message: 'Review queue populated successfully',
      data: result,
    });
  } catch (error: any) {
    logger.error(`[baReviewRoutes] Error populating queue:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to populate review queue',
      error: error.message,
    });
  }
});

/**
 * Get BA's review queue - paginated and prioritized
 * GET /api/ba-review/queue/:applicationId?page=1&pageSize=10
 */
baReviewRouter.get('/queue/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'applicationId is required' });
    }

    logger.info(`[baReviewRoutes] Getting queue for app ${applicationId}, page ${page}`);

    const result = await baReviewQueueService.getReviewQueue(applicationId, page, pageSize);

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
 * Add prompt improvement for a record
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
    if (!queueItemId || !rawDataRecordId || !improvedPrompt || !reason || !baName || !baEmail) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: queueItemId, rawDataRecordId, improvedPrompt, reason, baName, baEmail',
      });
    }

    logger.info(`[baReviewRoutes] Adding prompt improvement for record ${rawDataRecordId}`);

    const result = await baReviewQueueService.addPromptImprovement(
      queueItemId,
      rawDataRecordId,
      improvedPrompt,
      reason,
      baName,
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
    const { applicationId } = req.params;
    const { userPrompt, limit, threshold } = req.query;

    if (!applicationId || !userPrompt) {
      return res.status(400).json({
        success: false,
        message: 'applicationId and userPrompt are required',
      });
    }

    logger.info(`[baReviewRoutes] Finding similar records for app ${applicationId}`);

    const result = await baReviewQueueService.findSimilarRecords(
      applicationId,
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

export default baReviewRouter;
