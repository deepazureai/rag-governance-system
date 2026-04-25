import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { getStringParam } from '../utils/paramParser.js';
import mongoose from 'mongoose';

const router = Router();

/**
 * GET /api/applications/:applicationId/records
 * Get evaluation records for an application
 */
router.get('/:applicationId/records', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    logger.info(`[ApplicationRecordsAPI] Fetching records for application: ${applicationId}`);
    const EvaluationCollection = mongoose.connection.collection('evaluationrecords');

    // Fetch evaluation records for the application
    const records = await EvaluationCollection.find({ applicationId })
      .sort({ evaluatedAt: -1 })
      .limit(1000)
      .toArray();

    logger.info(`[ApplicationRecordsAPI] Found ${records.length} evaluation records for application ${applicationId}`);

    res.json({
      success: true,
      data: {
        applicationId,
        records: records.map((record: any) => ({
          _id: record._id?.toString() || '',
          applicationId: record.applicationId,
          query: record.query || record.recordData?.query || '',
          response: record.response || record.recordData?.response || '',
          retrievedDocuments: record.retrievedDocuments || record.recordData?.retrieved_documents || [],
          evaluation: {
            faithfulness: record.evaluation?.faithfulness || 0,
            answer_relevancy: record.evaluation?.answer_relevancy || 0,
            context_relevancy: record.evaluation?.context_relevancy || 0,
            context_precision: record.evaluation?.context_precision || 0,
            context_recall: record.evaluation?.context_recall || 0,
            correctness: record.evaluation?.correctness || 0,
            overall_score: record.evaluation?.overall_score || 0,
          },
          evaluatedAt: record.evaluatedAt,
          status: record.status,
        })),
        count: records.length,
      },
    });
  } catch (error: any) {
    logger.error(`[ApplicationRecordsAPI] Error fetching records:`, error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch records',
    });
  }
});

/**
 * GET /api/applications/:applicationId
 * Get a specific application by ID
 */
router.get('/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    logger.info(`[ApplicationRecordsAPI] Fetching application: ${applicationId}`);

    const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');

    const application = await ApplicationMasterCollection.findOne({ id: applicationId });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: `Application ${applicationId} not found`,
      });
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (error: any) {
    logger.error(`[ApplicationRecordsAPI] Error fetching application:`, error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch application',
    });
  }
});

export const applicationRecordsRouter = router;
