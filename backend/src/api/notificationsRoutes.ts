import { Router, Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose'; // Added for future DB integration

const notificationsRouter = Router();
const notificationService = new NotificationService();

/**
 * GET /api/notifications/channels
 */
notificationsRouter.get('/channels', async (req: Request, res: Response) => {
  try {
    const NotificationChannels = mongoose.connection.collection('notificationchannels');
    const channels = await NotificationChannels.find({}).toArray();

    res.json({
      success: true,
      data: channels,
      count: channels.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[API] Get notification channels error:', msg);
    res.status(500).json({ success: false, error: 'Failed to fetch notification channels' });
  }
});

/**
 * POST /api/notifications/channels
 */
notificationsRouter.post('/channels', async (req: Request, res: Response) => {
  try {
    const { name, type, emailConfig, webhookConfig } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Channel name and type are required' });
    }

    const validTypes = ['email', 'webhook', 'slack', 'teams'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: `Invalid type. Use: ${validTypes.join(', ')}` });
    }

    const newChannel = {
      id: `ch-${Date.now()}`,
      name,
      type,
      enabled: true,
      emailConfig,
      webhookConfig,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const NotificationChannels = mongoose.connection.collection('notificationchannels');
    await NotificationChannels.insertOne(newChannel);

    logger.info('[API] Notification channel created:', { channelId: newChannel.id, type });
    return res.status(201).json({ success: true, data: newChannel });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[API] Create notification channel error:', msg);
    return res.status(500).json({ success: false, error: 'Failed to create notification channel' });
  }
});

/**
 * POST /api/notifications/channels/:id/test
 */
notificationsRouter.post('/channels/:id/test', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const NotificationChannels = mongoose.connection.collection('notificationchannels');
    const channel = await NotificationChannels.findOne({ id });

    if (!channel) {
      return res.status(404).json({ success: false, error: 'Channel not found' });
    }

    const result = await notificationService.testChannel(channel as any);
    logger.info('[API] Channel test completed:', { channelId: id, success: result.success });

    return res.json({
      success: result.success,
      message: result.message,
      error: result.error,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[API] Test notification channel error:', msg);
    return res.status(500).json({ success: false, error: 'Failed to test notification channel' });
  }
});

/**
 * GET /api/notifications/rules
 */
notificationsRouter.get('/rules', async (req: Request, res: Response) => {
  try {
    const NotificationRules = mongoose.connection.collection('notificationrules');
    const rules = await NotificationRules.find({}).toArray();

    return res.json({
      success: true,
      data: rules,
      count: rules.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[API] Get notification rules error:', msg);
    return res.status(500).json({ success: false, error: 'Failed to fetch notification rules' });
  }
});

/**
 * POST /api/notifications/rules
 */
notificationsRouter.post('/rules', async (req: Request, res: Response) => {
  try {
    const { appId, name, triggerOn, channelIds, metricNames } = req.body;

    if (!appId || !name || !triggerOn || !channelIds) {
      return res.status(400).json({
        success: false,
        error: 'appId, name, triggerOn, and channelIds are required',
      });
    }

    const newRule = {
      id: `rule-${Date.now()}`,
      appId,
      name,
      enabled: true,
      triggerOn,
      channelIds,
      metricNames: metricNames || [],
      maxNotificationsPerHour: 10,
      includeMetricValue: true,
      includeThreshold: true,
      includeRecommendation: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const NotificationRules = mongoose.connection.collection('notificationrules');
    await NotificationRules.insertOne(newRule);

    logger.info('[API] Notification rule created:', { ruleId: newRule.id, appId });
    return res.status(201).json({ success: true, data: newRule });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[API] Create notification rule error:', msg);
    return res.status(500).json({ success: false, error: 'Failed to create notification rule' });
  }
});

/**
 * GET /api/notifications/logs
 */
notificationsRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const { appId, status, limit = 50, skip = 0 } = req.query;
    const NotificationLogs = mongoose.connection.collection('notificationlogs');
    
    const query: any = {};
    if (appId) query.appId = appId;
    if (status) query.status = status;

    const logs = await NotificationLogs.find(query)
      .skip(Number(skip))
      .limit(Number(limit))
      .sort({ timestamp: -1 })
      .toArray();

    return res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error('[API] Get notification logs error:', msg);
    return res.status(500).json({ success: false, error: 'Failed to fetch notification logs' });
  }
});

// Implementation for PUT/DELETE/RESEND follows same pattern...

export { notificationsRouter };
