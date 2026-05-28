import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import DeepEvalClient, { EvaluationRequest, EvaluationResponse } from '../services/DeepEvalClient.js';
import { RawDataRecord } from '../models/RawDataRecord.js';
import { BAReviewQueue } from '../models/BAReviewQueue.js';
import { llmConfigService } from '../services/LLMConfigService.js';

const router: ExpressRouter = Router();

// Initialize DeepEval client
const deepEvalServiceUrl = process.env.DEEPEVAL_SERVICE_URL || 'http://deepeval:8000';
const isMockMode = process.env.DEEPEVAL_MOCK_MODE === 'true';
const deepEvalApiKey = process.env.DEEPEVAL_API_KEY || (isMockMode ? 'mock-api-key-dev' : '');

if (!deepEvalApiKey && !isMockMode) {
  throw new Error('DEEPEVAL_API_KEY environment variable is required when DEEPEVAL_MOCK_MODE is not enabled');
}

const deepEvalClient = new DeepEvalClient(deepEvalServiceUrl, deepEvalApiKey);

// POST /evaluate/:applicationId/:recordId - Evaluate a single record
router.post('/evaluate/:applicationId/:recordId', async (req: Request, res: Response) => {
  try {
    const { applicationId, recordId } = req.params;

    // Fetch the raw data record
    const record = await RawDataRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // Retrieve app-specific LLM config from MongoDB (for potential Azure OpenAI overrides)
    let appLLMConfig: Awaited<ReturnType<typeof llmConfigService.getDefaultConfig>> | null = null;
    try {
      appLLMConfig = await llmConfigService.getDefaultConfig(applicationId);
      console.log('[v0] Retrieved saved LLM config for app:', applicationId);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('[v0] No saved LLM config found for app, using default:', error.message);
      } else {
        console.log('[v0] No saved LLM config found for app, using default');
      }
    }

    // Prepare evaluation request
    const evaluationRequest: EvaluationRequest = {
      user_prompt: record.recordData?.query || '',
      context: record.recordData?.context || '',
      llm_response: record.recordData?.response || '',
      record_id: recordId,
    };

    console.log('[v0] Sending evaluation request to DeepEval with app config:', {
      applicationId,
      hasAppConfig: !!appLLMConfig,
      configType: appLLMConfig?.provider || 'default',
    });

    // Call DeepEval service
    const evaluationResponse = await deepEvalClient.evaluate(evaluationRequest);

    // Update record with evaluation scores
    const updatedRecord = await RawDataRecord.findByIdAndUpdate(
      recordId,
      {
        $push: {
          evaluationScores: {
            framework: evaluationResponse.framework,
            scores: evaluationResponse.scores,
            generatedAt: new Date(evaluationResponse.timestamp),
            usedAppConfig: !!appLLMConfig,
          },
        },
      },
      { new: true }
    );

    console.log('[v0] Record updated with DeepEval scores, used app config:', !!appLLMConfig);

    res.json({
      success: true,
      record: updatedRecord,
      evaluation: evaluationResponse,
      usedAppConfig: !!appLLMConfig,
    });
  } catch (error: any) {
    console.error('[v0] Evaluation error:', error.message);
    res.status(500).json({
      error: 'Evaluation failed',
      details: error.message,
    });
  }
});

// POST /evaluate-batch/:applicationId - Evaluate multiple records
router.post('/evaluate-batch/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { recordIds } = req.body;

    if (!recordIds || !Array.isArray(recordIds)) {
      return res.status(400).json({ error: 'recordIds array required' });
    }

    // Fetch all records
    const records = await RawDataRecord.find({
      _id: { $in: recordIds },
      applicationId,
    });

    // Prepare batch evaluation requests
    const evaluationRequests: EvaluationRequest[] = records.map((record) => ({
      user_prompt: record.recordData?.query || '',
      context: record.recordData?.context || '',
      llm_response: record.recordData?.response || '',
      record_id: record._id.toString(),
    }));

    console.log('[v0] Sending batch evaluation request:', evaluationRequests.length, 'records');

    // Call DeepEval batch endpoint
    const evaluationResponses = await deepEvalClient.evaluateBatch(evaluationRequests);

    // Update records with scores
    const updates = await Promise.all(
      evaluationResponses.map((evalResponse) =>
        RawDataRecord.findByIdAndUpdate(
          evalResponse.record_id,
          {
            $push: {
              evaluationScores: {
                framework: evalResponse.framework,
                scores: evalResponse.scores,
                generatedAt: new Date(evalResponse.timestamp),
              },
            },
          },
          { new: true }
        )
      )
    );

    console.log('[v0] Batch update completed for', updates.length, 'records');

    res.json({
      success: true,
      evaluations: evaluationResponses,
      updatedRecords: updates.length,
    });
  } catch (error: any) {
    console.error('[v0] Batch evaluation error:', error.message);
    res.status(500).json({
      error: 'Batch evaluation failed',
      details: error.message,
    });
  }
});

// POST /queue-evaluation/:applicationId - Queue records for evaluation
router.post('/queue-evaluation/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    const { recordIds, priority } = req.body;

    if (!recordIds || !Array.isArray(recordIds)) {
      return res.status(400).json({ error: 'recordIds array required' });
    }

    // Queue evaluations in BA review queue with evaluation flag
    const queuedItems = await Promise.all(
      recordIds.map((recordId) =>
        BAReviewQueue.findOneAndUpdate(
          { rawDataRecordId: recordId, applicationId },
          {
            $set: {
              status: 'pending',
              priority: priority || 'medium',
              priorityReason: 'evaluation_pending',
            },
          },
          { new: true, upsert: true }
        )
      )
    );

    console.log('[v0] Queued', queuedItems.length, 'records for evaluation');

    res.json({
      success: true,
      queuedItems: queuedItems.length,
    });
  } catch (error: any) {
    console.error('[v0] Queue evaluation error:', error.message);
    res.status(500).json({
      error: 'Failed to queue evaluations',
      details: error.message,
    });
  }
});

// GET /metrics - Get available DeepEval metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const metrics = await deepEvalClient.getMetrics();

    res.json({
      success: true,
      metrics,
    });
  } catch (error: any) {
    console.error('[v0] Failed to get metrics:', error.message);
    res.status(500).json({
      error: 'Failed to get metrics',
      details: error.message,
    });
  }
});

// GET /health - Health check
router.get('/health', async (req: Request, res: Response) => {
  try {
    const isHealthy = await deepEvalClient.healthCheck();

    res.json({
      success: isHealthy,
      service: 'DeepEval',
      status: isHealthy ? 'healthy' : 'unhealthy',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      service: 'DeepEval',
      status: 'unhealthy',
      error: error.message,
    });
  }
});

export default router;
