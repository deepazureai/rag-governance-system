import { Router, Request, Response } from 'express';
import { getStringParam } from '../utils/paramParser';
import { logger } from '../utils/logger';
import { INDUSTRY_STANDARD_SLA } from '../utils/sla-benchmarks';
import mongoose from 'mongoose';

export const slaConfigRouter = Router();

/**
 * POST /api/applications/:applicationId/sla
 * Create SLA configuration for an application (called on app creation with defaults)
 */
slaConfigRouter.post('/:applicationId/sla', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const { applicationName, customThresholds } = req.body;

    // Prepare SLA config with industry defaults or custom thresholds
    const slaConfig = {
      applicationId,
      applicationName: applicationName || 'Unknown',
      metrics: customThresholds?.metrics || INDUSTRY_STANDARD_SLA.metrics,
      overallScoreThresholds: customThresholds?.overallScoreThresholds || INDUSTRY_STANDARD_SLA.overallScoreThresholds,
      usesCustomThresholds: !!customThresholds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const SLACollection = mongoose.connection.collection('applicationslas');
    const result = await SLACollection.insertOne(slaConfig);

    logger.info(`[SLA] Created SLA configuration for app ${applicationId}`);

    return res.status(201).json({
      success: true,
      data: slaConfig,
      message: 'SLA configuration created',
    });
  } catch (error: any) {
    logger.error('[SLA] Create SLA error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create SLA configuration',
    });
  }
});

/**
 * GET /api/applications/:applicationId/sla
 * Get SLA configuration for an application
 */
slaConfigRouter.get('/:applicationId/sla', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const SLACollection = mongoose.connection.collection('applicationslas');
    
    const slaConfig = await SLACollection.findOne({ applicationId });

    if (!slaConfig) {
      // Return industry defaults if no custom config exists
      return res.json({
        success: true,
        data: {
          applicationId,
          metrics: INDUSTRY_STANDARD_SLA.metrics,
          overallScoreThresholds: INDUSTRY_STANDARD_SLA.overallScoreThresholds,
          usesCustomThresholds: false,
        },
        message: 'Using industry standard SLA',
      });
    }

    return res.json({
      success: true,
      data: slaConfig,
      message: 'SLA configuration retrieved',
    });
  } catch (error: any) {
    logger.error('[SLA] Get SLA error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch SLA configuration',
    });
  }
});

/**
 * PUT /api/applications/:applicationId/sla
 * Update SLA configuration for an application
 */
slaConfigRouter.put('/:applicationId/sla', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const { metrics, overallScoreThresholds } = req.body;
    const SLACollection = mongoose.connection.collection('applicationslas');

    const updateData = {
      $set: {
        metrics: metrics || INDUSTRY_STANDARD_SLA.metrics,
        overallScoreThresholds: overallScoreThresholds || INDUSTRY_STANDARD_SLA.overallScoreThresholds,
        usesCustomThresholds: true,
        updatedAt: new Date(),
      },
    };

    const result = await SLACollection.findOneAndUpdate(
      { applicationId },
      updateData,
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `SLA configuration not found for app ${applicationId}`,
      });
    }

    logger.info(`[SLA] Updated SLA configuration for app ${applicationId}`);

    return res.json({
      success: true,
      data: result.value,
      message: 'SLA configuration updated',
    });
  } catch (error: any) {
    logger.error('[SLA] Update SLA error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to update SLA configuration',
    });
  }
});

/**
 * DELETE /api/applications/:applicationId/sla
 * Reset SLA configuration to industry defaults
 */
slaConfigRouter.delete('/:applicationId/sla', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const SLACollection = mongoose.connection.collection('applicationslas');

    const result = await SLACollection.findOneAndUpdate(
      { applicationId },
      {
        $set: {
          metrics: INDUSTRY_STANDARD_SLA.metrics,
          overallScoreThresholds: INDUSTRY_STANDARD_SLA.overallScoreThresholds,
          usesCustomThresholds: false,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: `SLA configuration not found for app ${applicationId}`,
      });
    }

    logger.info(`[SLA] Reset SLA configuration for app ${applicationId} to industry defaults`);

    return res.json({
      success: true,
      data: result.value,
      message: 'SLA configuration reset to industry defaults',
    });
  } catch (error: any) {
    logger.error('[SLA] Delete SLA error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset SLA configuration',
    });
  }
});

/**
 * GET /api/applications/:applicationId/sla/defaults
 * Get industry standard SLA defaults (read-only reference)
 */
slaConfigRouter.get('/:applicationId/sla/defaults', (req: Request, res: Response) => {
  return res.json({
    success: true,
    data: INDUSTRY_STANDARD_SLA,
    message: 'Industry standard SLA benchmarks',
  });
});
