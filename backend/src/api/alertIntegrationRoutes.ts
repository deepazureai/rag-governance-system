import { Router, Request, Response } from 'express';
import { AlertIntegrationLayerService } from '../services/AlertIntegrationLayerService.js';
import { logger } from '../utils/logger.js';

export const alertIntegrationRouter = Router();

/**
 * GET /api/alert-integration/app/:appId/thresholds
 * Fetch thresholds for application (custom or defaults)
 */
alertIntegrationRouter.get('/app/:appId/thresholds', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    logger.info(`[API] GET alert-integration thresholds for app: ${appId}`);

    const thresholds = await AlertIntegrationLayerService.getApplicationThresholds(appId);

    res.json({
      success: true,
      data: {
        applicationId: appId,
        thresholds,
        isCustom: thresholds !== AlertIntegrationLayerService.getIndustryStandardThresholds(),
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[API] Get thresholds error: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thresholds',
      details: errorMessage,
    });
  }
});

/**
 * POST /api/alert-integration/app/:appId/thresholds
 * Save custom thresholds for application
 */
alertIntegrationRouter.post('/app/:appId/thresholds', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    const { thresholds } = req.body;

    logger.info(`[API] POST alert-integration thresholds for app: ${appId}`);

    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid thresholds configuration',
      });
    }

    await AlertIntegrationLayerService.saveApplicationThresholds(appId, thresholds);

    res.json({
      success: true,
      message: 'Thresholds saved successfully',
      data: { applicationId: appId, thresholds },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[API] Save thresholds error: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: 'Failed to save thresholds',
      details: errorMessage,
    });
  }
});

/**
 * GET /api/alert-integration/app/:appId/sla-compliance
 * Get SLA compliance score for application
 */
alertIntegrationRouter.get('/app/:appId/sla-compliance', async (req: Request, res: Response) => {
  try {
    const { appId } = req.params;
    logger.info(`[API] GET SLA compliance for app: ${appId}`);

    const compliance = await AlertIntegrationLayerService.getApplicationSLACompliance(appId);

    res.json({
      success: true,
      data: compliance,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[API] Get SLA compliance error: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate SLA compliance',
      details: errorMessage,
    });
  }
});

/**
 * POST /api/alert-integration/ingest/generate-alerts
 * Generate real-time alerts for ingested records
 * Called after DataProcessingService saves records to database
 */
alertIntegrationRouter.post('/ingest/generate-alerts', async (req: Request, res: Response) => {
  try {
    const { applicationId, records, dataSourceType = 'ingestion' } = req.body;

    logger.info(`[API] POST generate alerts for app: ${applicationId}, records: ${records?.length}`);

    if (!applicationId || !Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        error: 'Missing applicationId or records array',
      });
    }

    await AlertIntegrationLayerService.generateIngestionTimeAlerts(applicationId, records, dataSourceType);

    res.json({
      success: true,
      message: `Alerts generated for ${records.length} records`,
      data: { applicationId, recordCount: records.length },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[API] Generate alerts error: ${errorMessage}`);
    res.status(500).json({
      success: false,
      error: 'Failed to generate alerts',
      details: errorMessage,
    });
  }
});
