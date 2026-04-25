import { Router, Request, Response } from 'express';
import { ApplicationMetricsService } from '../services/ApplicationMetricsService';
import { AlertCalculationEngine } from '../services/AlertCalculationEngine';
import { logger } from '../utils/logger';

const metricsRouter = Router();
const metricsService = new ApplicationMetricsService();

/**
 * GET /api/metrics/:applicationId
 * Fetch metrics for a single application
 */
metricsRouter.get('/:applicationId', async (req: Request, res: Response) => {
  try {
    const { applicationId } = req.params;
    logger.info(`[v0] Fetching metrics for app: ${applicationId}`);

    const metrics = await metricsService.fetchMetricsForApp(applicationId);

    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'No metrics found for this application',
      });
    }

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error(`[v0] Metrics fetch error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});

/**
 * POST /api/metrics/fetch-multiple
 * Fetch and aggregate metrics for multiple applications
 */
metricsRouter.post('/fetch-multiple', async (req: Request, res: Response) => {
  try {
    const { applicationIds } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'applicationIds must be a non-empty array',
      });
    }

    logger.info(`[v0] Fetching metrics for ${applicationIds.length} applications`);

    const metricsArray = await metricsService.fetchMetricsForApps(applicationIds);

    if (metricsArray.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No metrics found for the specified applications',
      });
    }

    // If only one app, return its metrics directly
    if (metricsArray.length === 1) {
      return res.json({
        success: true,
        data: {
          type: 'single',
          metrics: metricsArray[0],
        },
      });
    }

    // If multiple apps, aggregate their metrics
    const aggregatedMetrics = metricsService.aggregateMetrics(metricsArray);

    res.json({
      success: true,
      data: {
        type: 'aggregated',
        metrics: aggregatedMetrics,
        individualMetrics: metricsArray,
      },
    });
  } catch (error) {
    logger.error(`[v0] Metrics aggregation error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate metrics',
    });
  }
});

/**
 * POST /api/metrics/refresh
 * Refresh metrics data for selected applications
 */
metricsRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { applicationIds } = req.body;

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'applicationIds must be a non-empty array',
      });
    }

    logger.info(`[v0] Refreshing metrics for ${applicationIds.length} applications`);

    // Fetch latest metrics
    const metricsArray = await metricsService.fetchMetricsForApps(applicationIds);

    if (metricsArray.length === 0) {
      return res.json({
        success: true,
        data: {
          type: 'empty',
          message: 'No metrics data available yet for selected applications',
        },
      });
    }

    // Aggregate if multiple apps
    if (metricsArray.length === 1) {
      return res.json({
        success: true,
        data: {
          type: 'single',
          metrics: metricsArray[0],
        },
      });
    }

    const aggregatedMetrics = metricsService.aggregateMetrics(metricsArray);

    res.json({
      success: true,
      data: {
        type: 'aggregated',
        metrics: aggregatedMetrics,
        applicationCount: metricsArray.length,
      },
    });
  } catch (error) {
    logger.error(`[v0] Metrics refresh error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh metrics',
    });
  }
});

/**
 * POST /api/metrics/calculate-alerts
 * Calculate alerts based on metrics and thresholds for one or more applications
 */
metricsRouter.post('/calculate-alerts', async (req: Request, res: Response) => {
  try {
    const { applicationIds, metricsData } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds)) {
      return res.status(400).json({
        success: false,
        error: 'applicationIds must be a non-empty array',
      });
    }

    if (!metricsData || typeof metricsData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'metricsData is required',
      });
    }

    logger.info(`[v0] Calculating alerts for ${applicationIds.length} applications`);

    // TODO: When database is connected, fetch threshold configs for each app
    // For now, use industry defaults
    const INDUSTRY_STANDARD_THRESHOLDS = {
      faithfulness: { min: 0.7, warning: 0.8 },
      answerRelevancy: { min: 0.7, warning: 0.8 },
      contextPrecision: { min: 0.7, warning: 0.8 },
      contextRecall: { min: 0.7, warning: 0.8 },
      correctness: { min: 0.7, warning: 0.8 },
    };

    const allAlerts = [];

    // Calculate alerts for each application
    for (const appId of applicationIds) {
      // TODO: Load app-specific thresholds from database
      // const appThresholds = await db.collection('AlertThresholds').findOne({ appId });
      const thresholds = INDUSTRY_STANDARD_THRESHOLDS;

      const appMetrics = metricsData[appId] || metricsData;
      const alerts = AlertCalculationEngine.generateAlertsForApp(appId, appMetrics, thresholds);
      allAlerts.push(...alerts);
    }

    // Calculate collective severity
    const collectiveSeverity = AlertCalculationEngine.calculateCollectiveSeverity(allAlerts);
    const aggregatedStats = AlertCalculationEngine.getAggregatedStats(allAlerts);
    const perAppSummary = AlertCalculationEngine.getPerAppAlertSummary(allAlerts);

    res.json({
      success: true,
      data: {
        alerts: allAlerts,
        collectiveSeverity,
        aggregatedStats,
        perAppSummary,
      },
    });
  } catch (error) {
    logger.error(`[v0] Alert calculation error:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate alerts',
    });
  }
});

export { metricsRouter };
