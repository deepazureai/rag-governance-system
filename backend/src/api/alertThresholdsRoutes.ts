import { Router, Request, Response } from 'express';
import { INDUSTRY_STANDARD_THRESHOLDS, AlertThresholdConfig } from '@/types';

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
    console.log('[API] GET /api/alert-thresholds/app/:appId - appId:', appId);

    // TODO: Query MongoDB when connected
    // const db = getDatabase();
    // const thresholds = await db.collection('AlertThresholds')
    //   .findOne({ appId });
    //
    // if (thresholds) {
    //   return res.json({
    //     success: true,
    //     data: thresholds,
    //     isCustom: true,
    //   });
    // }

    // Return defaults for now
    res.json({
      success: true,
      data: { ...INDUSTRY_STANDARD_THRESHOLDS, appId, isCustom: false },
      isCustom: false,
      message: 'Using industry standard thresholds',
    });
  } catch (error: any) {
    console.error('[API] Get app thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve thresholds for application',
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

    // Validate threshold configuration
    if (!thresholdConfig || typeof thresholdConfig !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid threshold configuration',
      });
    }

    // Save to MongoDB
    try {
      const db = mongoose.connection;
      const alertThresholdsCollection = db.collection('alertthresholds');
      
      const result = await alertThresholdsCollection.updateOne(
        { appId },
        {
          $set: {
            appId,
            ...thresholdConfig,
            isCustom: true,
            updatedAt: new Date().toISOString(),
          },
        },
        { upsert: true }
      );

      console.log('[v0] Thresholds saved for app:', appId, 'Result:', result);

      res.json({
        success: true,
        data: {
          appId,
          ...thresholdConfig,
          isCustom: true,
          updatedAt: new Date().toISOString(),
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
      error: 'Failed to save threshold configuration',
      details: error.message,
    });
  }
});

/**
 * Get threshold configuration for a specific application
 * Returns custom config if exists, otherwise returns defaults
 */
alertThresholdsRouter.get('/app/:appId', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    console.log('[v0] GET /api/alert-thresholds/app/:appId - appId:', appId);

    // Query MongoDB for custom thresholds
    try {
      const db = mongoose.connection;
      const alertThresholdsCollection = db.collection('alertthresholds');
      const customThresholds = await alertThresholdsCollection.findOne({ appId });

      if (customThresholds) {
        console.log('[v0] Found custom thresholds for app:', appId);
        return res.json({
          success: true,
          data: customThresholds,
          isCustom: true,
          source: 'custom',
        });
      }
    } catch (dbErr: unknown) {
      const dbErrorMsg = dbErr instanceof Error ? dbErr.message : String(dbErr);
      console.log('[v0] Error querying MongoDB for thresholds:', dbErrorMsg);
      // Fall through to defaults
    }

    // Return defaults if no custom config found
    console.log('[v0] Using industry standard thresholds for app:', appId);
    res.json({
      success: true,
      data: { ...INDUSTRY_STANDARD_THRESHOLDS, appId, isCustom: false },
      isCustom: false,
      source: 'industry_standard',
      message: 'Using industry standard thresholds',
    });
  } catch (error: any) {
    console.error('[v0] Get app thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve thresholds for application',
      details: error.message,
    });
  }
});
  } catch (error: any) {
    console.error('[API] Reset thresholds error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset threshold configuration',
      details: error.message,
    });
  }
});

/**
 * POST /api/alert-thresholds/validate
 * Validate a threshold configuration without saving
 * Used for preview functionality in UI
 */
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
