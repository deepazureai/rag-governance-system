import { Router, Request, Response } from 'express';
import { INDUSTRY_STANDARD_THRESHOLDS, AlertThresholdConfig } from '@/types';
import mongoose from 'mongoose';

export const alertThresholdsRouter = Router();

/**
 * GET /api/alert-thresholds/defaults
 * Get industry standard default thresholds
 */
alertThresholdsRouter.get('/defaults', (req: Request, res: Response) => {
  try {
    console.log('[API] GET /api/alert-thresholds/defaults');
    res.json({
      success: true,
      data: INDUSTRY_STANDARD_THRESHOLDS,
      message: 'Industry standard thresholds retrieved',
    });
  } catch (error: any) {
    console.error('[API] Get defaults error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve default thresholds',
      details: error.message,
    });
  }
});

/**
 * GET /api/alert-thresholds/app/:appId
 * Get threshold configuration for a specific application
 * Returns custom config if exists, otherwise returns defaults
 */
alertThresholdsRouter.get('/app/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    console.log('[v0] GET /api/alert-thresholds/app/:appId - appId:', appId);

    // Query MongoDB for custom thresholds with string conversion
    const AppThresholdsCollection = mongoose.connection.collection('alertthresholds');
    const customThresholds = await AppThresholdsCollection.findOne({ applicationId: String(appId) });

    console.log('[v0] Query result for appId:', String(appId), 'Found:', customThresholds ? 'Yes' : 'No');

    if (customThresholds && customThresholds.thresholds) {
      console.log('[v0] Returning custom thresholds for app:', appId);
      return res.json({
        success: true,
        data: customThresholds.thresholds,
        isCustom: true,
        source: 'custom',
      });
    }

    // Return defaults if no custom config found
    console.log('[v0] Using industry standard thresholds for app:', appId);
    res.json({
      success: true,
      data: INDUSTRY_STANDARD_THRESHOLDS,
      isCustom: false,
      source: 'industry_standard',
      message: 'Using industry standard thresholds',
    });
  } catch (error: any) {
    console.error('[v0] Get app thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thresholds for application',
      details: error.message,
    });
  }
});

/**
 * POST /api/alert-thresholds/app/:appId
 * Create or update threshold configuration for a specific application
 */
alertThresholdsRouter.post('/app/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const thresholdConfig = req.body;

    console.log('[v0] POST /api/alert-thresholds/app/:appId - appId:', appId);
    console.log('[v0] Threshold config received:', JSON.stringify(thresholdConfig).substring(0, 200));

    // Validate threshold configuration
    if (!thresholdConfig || typeof thresholdConfig !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid threshold configuration',
      });
    }

    // Validate appId is a string
    if (!appId || typeof appId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID',
      });
    }

    // Save to MongoDB
    try {
      const db = mongoose.connection;
      const alertThresholdsCollection = db.collection('alertthresholds');
      
      // Ensure applicationId is stored as string
      const updateData = {
        applicationId: String(appId),
        thresholds: thresholdConfig,
        isCustom: true,
        updatedAt: new Date(),
      };

      console.log('[v0] Saving to MongoDB with applicationId:', String(appId));

      const result = await alertThresholdsCollection.updateOne(
        { applicationId: String(appId) },
        {
          $set: updateData,
        },
        { upsert: true }
      );

      console.log('[v0] MongoDB updateOne result:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedId: result.upsertedId,
      });

      // Verify the save was successful
      const verify = await alertThresholdsCollection.findOne({ applicationId: String(appId) });
      console.log('[v0] Verification - Document after save:', verify ? 'Found' : 'NOT FOUND');

      res.json({
        success: true,
        data: {
          applicationId: String(appId),
          thresholds: thresholdConfig,
          isCustom: true,
          updatedAt: new Date(),
        },
        message: 'Threshold configuration saved successfully',
        upserted: result.upsertedId ? true : false,
      });
    } catch (dbErr: unknown) {
      const dbErrorMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.error('[v0] MongoDB save error:', dbErrorMsg);
      throw dbErr;
    }
  } catch (error: any) {
    console.error('[v0] Save thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save threshold configuration',
      details: error.message,
    });
  }
});

/**
 * DELETE /api/alert-thresholds/app/:appId
 * Delete custom threshold configuration for a specific application
 * Next load will use industry standard defaults
 */
alertThresholdsRouter.delete('/app/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    console.log('[v0] DELETE /api/alert-thresholds/app/:appId - appId:', appId);

    if (!appId || typeof appId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID',
      });
    }

    const db = mongoose.connection;
    const alertThresholdsCollection = db.collection('alertthresholds');
    
    const result = await alertThresholdsCollection.deleteOne({ applicationId: String(appId) });

    console.log('[v0] DELETE result:', {
      deletedCount: result.deletedCount,
    });

    res.json({
      success: true,
      message: 'Threshold configuration deleted. Industry standards will be used next time.',
      deletedCount: result.deletedCount,
    });
  } catch (error: any) {
    console.error('[v0] Delete thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete threshold configuration',
      details: error.message,
    });
  }
});

alertThresholdsRouter.post('/validate', (req: Request, res: Response) => {
  try {
    const config = req.body as AlertThresholdConfig;
    console.log('[API] POST /api/alert-thresholds/validate');

    // Basic validation
    const errors: string[] = [];

    const validateThreshold = (name: string, threshold: any) => {
      if (!threshold || typeof threshold !== 'object') {
        errors.push(`${name}: Invalid threshold object`);
        return;
      }
      if (threshold.critical === undefined || threshold.warning === undefined) {
        errors.push(`${name}: Missing critical or warning value`);
      }
      if (threshold.critical >= threshold.warning) {
        errors.push(`${name}: Critical threshold must be less than warning threshold`);
      }
    };

    // Validate all metric thresholds
    validateThreshold('groundedness', config.groundedness);
    validateThreshold('relevance', config.relevance);
    validateThreshold('contextPrecision', config.contextPrecision);
    validateThreshold('contextRecall', config.contextRecall);
    validateThreshold('answerRelevancy', config.answerRelevancy);
    validateThreshold('coherence', config.coherence);
    validateThreshold('faithfulness', config.faithfulness);
    validateThreshold('successRate', config.successRate);
    validateThreshold('latency', config.latency);
    validateThreshold('tokenEfficiency', config.tokenEfficiency);
    validateThreshold('errorRate', config.errorRate);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        errors,
        message: 'Threshold configuration validation failed',
      });
    }

    res.json({
      success: true,
      message: 'Threshold configuration is valid',
    });
  } catch (error: any) {
    console.error('[API] Validate thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate threshold configuration',
      details: error.message,
    });
  }
});
