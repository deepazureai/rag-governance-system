import { Router, Request, Response } from 'express';
import { getStringParam } from '../utils/paramParser';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export const alertsRouter = Router();

/**
 * POST /api/alerts/batch-create
 * Create multiple alerts after data ingestion from polling service
 * Called after successful data upsert to rawdatarecords
 */
alertsRouter.post('/batch-create', async (req: Request, res: Response) => {
  try {
    const { applicationId, records } = req.body;

    if (!applicationId || !Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'applicationId and records array are required',
      });
    }

    const mongoose = require('mongoose');
    const alertsCollection = mongoose.connection.collection('alerts');
    const slaCollection = mongoose.connection.collection('applicationslas');

    // Fetch app SLA thresholds
    const appSLA = await slaCollection.findOne({ applicationId });
    if (!appSLA) {
      return res.status(404).json({
        success: false,
        message: `SLA configuration not found for application ${applicationId}`,
      });
    }

    const createdAlerts = [];
    const currentTime = new Date();

    // Process each record and create alerts for SLA violations
    for (const record of records) {
      if (!record.evaluation || !record.evaluation.metrics) {
        continue; // Skip records without evaluation data
      }

      const metrics = record.evaluation.metrics;
      const userId = record.userId || 'unknown';

      // Check each metric against SLA threshold
      for (const [metricName, slaThreshold] of Object.entries(appSLA.metrics)) {
        const metricValue = metrics[metricName];

        if (typeof metricValue === 'number' && typeof slaThreshold === 'number') {
          // Create alert if metric falls below "good" threshold
          if (metricValue < slaThreshold) {
            const deviation = ((slaThreshold - metricValue) / slaThreshold) * 100;

            const alert = {
              alertId: uuidv4(),
              applicationId,
              alertLevel: 'row',
              sourceRecordId: record._id || record.id,
              metricName,
              actualValue: metricValue,
              slaThreshold,
              deviation: Math.round(deviation * 100) / 100,
              status: 'open',
              createdAt: currentTime,
              updatedAt: currentTime,
            };

            const result = await alertsCollection.insertOne(alert);
            createdAlerts.push({ ...alert, _id: result.insertedId });

            logger.info(
              `[Alerts] Created row-level alert for app ${applicationId}, metric ${metricName}, user ${userId}`
            );
          }
        }
      }
    }

    return res.status(201).json({
      success: true,
      data: {
        alertsCreated: createdAlerts.length,
        alerts: createdAlerts,
      },
      message: `Created ${createdAlerts.length} alerts`,
    });
  } catch (error: any) {
    logger.error('[Alerts] Batch create error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create alerts',
    });
  }
});

/**
 * GET /api/alerts/applications/:applicationId
 * Fetch alerts with filtering and pagination
 * Supports: status, metricName, dateRange, alertLevel
 */
alertsRouter.get('/applications/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const { status, metricName, dateStart, dateEnd, alertLevel, page = 1, pageSize = 25 } = req.query;

    const mongoose = require('mongoose');
    const alertsCollection = mongoose.connection.collection('alerts');

    // Build query filter
    const filter: any = { applicationId };

    if (status) {
      filter.status = String(status);
    }

    if (metricName) {
      filter.metricName = String(metricName);
    }

    if (alertLevel) {
      filter.alertLevel = String(alertLevel);
    }

    // Date range filter
    if (dateStart || dateEnd) {
      filter.createdAt = {};
      if (dateStart) {
        filter.createdAt.$gte = new Date(String(dateStart));
      }
      if (dateEnd) {
        filter.createdAt.$lte = new Date(String(dateEnd));
      }
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 25));
    const skip = (pageNum - 1) * size;

    // Fetch alerts with pagination
    const alerts = await alertsCollection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(size)
      .toArray();

    const totalCount = await alertsCollection.countDocuments(filter);

    return res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page: pageNum,
          pageSize: size,
          total: totalCount,
          totalPages: Math.ceil(totalCount / size),
        },
      },
      message: `Retrieved ${alerts.length} alerts`,
    });
  } catch (error: any) {
    logger.error('[Alerts] Get alerts error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch alerts',
    });
  }
});

/**
 * PATCH /api/alerts/:alertId/acknowledge
 * Mark alert as acknowledged with optional comment
 */
alertsRouter.patch('/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const alertId = getStringParam(req.params.alertId);
    if (!alertId) {
      return res.status(400).json({
        success: false,
        message: 'alertId is required',
      });
    }

    const { acknowledgedBy, userComment } = req.body;

    const mongoose = require('mongoose');
    const alertsCollection = mongoose.connection.collection('alerts');

    const updateData = {
      $set: {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: acknowledgedBy || 'system',
        userComment: userComment || '',
        updatedAt: new Date(),
      },
    };

    const result = await alertsCollection.findOneAndUpdate(
      { alertId },
      updateData,
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: `Alert ${alertId} not found`,
      });
    }

    logger.info(`[Alerts] Acknowledged alert ${alertId}`);

    return res.json({
      success: true,
      data: result.value,
      message: 'Alert acknowledged',
    });
  } catch (error: any) {
    logger.error('[Alerts] Acknowledge error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to acknowledge alert',
    });
  }
});

/**
 * PATCH /api/alerts/:alertId/dismiss
 * Mark alert as dismissed with optional comment
 */
alertsRouter.patch('/:alertId/dismiss', async (req: Request, res: Response) => {
  try {
    const alertId = getStringParam(req.params.alertId);
    if (!alertId) {
      return res.status(400).json({
        success: false,
        message: 'alertId is required',
      });
    }

    const { dismissedBy, userComment } = req.body;

    const mongoose = require('mongoose');
    const alertsCollection = mongoose.connection.collection('alerts');

    const updateData = {
      $set: {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: dismissedBy || 'system',
        userComment: userComment || '',
        updatedAt: new Date(),
      },
    };

    const result = await alertsCollection.findOneAndUpdate(
      { alertId },
      updateData,
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: `Alert ${alertId} not found`,
      });
    }

    logger.info(`[Alerts] Dismissed alert ${alertId}`);

    return res.json({
      success: true,
      data: result.value,
      message: 'Alert dismissed',
    });
  } catch (error: any) {
    logger.error('[Alerts] Dismiss error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to dismiss alert',
    });
  }
});

/**
 * POST /api/alerts/bulk-action
 * Perform bulk actions on alerts (close all, acknowledge all)
 */
alertsRouter.post('/bulk-action', async (req: Request, res: Response) => {
  try {
    const { applicationId, action, alertIds, userComment, actionBy } = req.body;

    if (!applicationId || !action || !['close', 'acknowledge'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'applicationId, action (close|acknowledge), and valid alertIds required',
      });
    }

    const mongoose = require('mongoose');
    const alertsCollection = mongoose.connection.collection('alerts');

    let filter: any = { applicationId, status: 'open' };
    let updateData: any = { updatedAt: new Date(), userComment: userComment || '' };

    if (action === 'close') {
      updateData.$set = {
        status: 'dismissed',
        dismissedAt: new Date(),
        dismissedBy: actionBy || 'system',
        ...updateData,
      };
    } else if (action === 'acknowledge') {
      updateData.$set = {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy: actionBy || 'system',
        ...updateData,
      };
    }

    // If specific alertIds provided, filter to those
    if (Array.isArray(alertIds) && alertIds.length > 0) {
      filter.alertId = { $in: alertIds };
    }

    const result = await alertsCollection.updateMany(filter, updateData);

    logger.info(
      `[Alerts] Bulk ${action} action for app ${applicationId}: ${result.modifiedCount} alerts updated`
    );

    return res.json({
      success: true,
      data: {
        modifiedCount: result.modifiedCount,
        action,
      },
      message: `${result.modifiedCount} alerts ${action}d`,
    });
  } catch (error: any) {
    logger.error('[Alerts] Bulk action error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to perform bulk action',
    });
  }
});

/**
 * GET /api/alerts/summary/:applicationId
 * Get summary counts of alerts by status and metric
 */
alertsRouter.get('/summary/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const mongoose = require('mongoose');
    const alertsCollection = mongoose.connection.collection('alerts');

    // Count by status
    const openCount = await alertsCollection.countDocuments({
      applicationId,
      status: 'open',
    });

    const acknowledgedCount = await alertsCollection.countDocuments({
      applicationId,
      status: 'acknowledged',
    });

    const dismissedCount = await alertsCollection.countDocuments({
      applicationId,
      status: 'dismissed',
    });

    // Get count by metric
    const byMetric = await alertsCollection
      .aggregate([
        { $match: { applicationId, status: 'open' } },
        {
          $group: {
            _id: '$metricName',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const metricCounts = byMetric.reduce(
      (acc: any, item: any) => {
        acc[item._id] = item.count;
        return acc;
      },
      {}
    );

    return res.json({
      success: true,
      data: {
        summary: {
          open: openCount,
          acknowledged: acknowledgedCount,
          dismissed: dismissedCount,
          byMetric: metricCounts,
        },
      },
      message: 'Alert summary retrieved',
    });
  } catch (error: any) {
    logger.error('[Alerts] Summary error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch alert summary',
    });
  }
});
