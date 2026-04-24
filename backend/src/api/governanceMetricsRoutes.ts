import { Router, Request, Response } from 'express';
import { getStringParam } from '../utils/paramParser';
import { logger } from '../utils/logger';

export const governanceMetricsRouter = Router();

/**
 * POST /api/governance-metrics/calculate/:applicationId
 * Calculate governance metrics for an application
 * Called on-demand or periodically from scheduled job
 */
governanceMetricsRouter.post('/calculate/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const { period = 'daily' } = req.body;
    const mongoose = require('mongoose');
    const rawDataCollection = mongoose.connection.collection('rawdatarecords');
    const metricsCollection = mongoose.connection.collection('governancemetrics');
    const appsCollection = mongoose.connection.collection('applicationmaster');
    const slaCollection = mongoose.connection.collection('applicationslas');

    // Fetch application name
    const app = await appsCollection.findOne({ applicationId });
    if (!app) {
      return res.status(404).json({
        success: false,
        message: `Application ${applicationId} not found`,
      });
    }

    // Fetch SLA for metric compliance comparison
    const appSLA = await slaCollection.findOne({ applicationId });

    // Calculate date range for period
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date = new Date(now);

    if (period === 'daily') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'weekly') {
      const dayOfWeek = now.getDay();
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - dayOfWeek);
    } else if (period === 'monthly') {
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      return res.status(400).json({
        success: false,
        message: 'period must be daily, weekly, or monthly',
      });
    }

    // Fetch records for period
    const records = await rawDataCollection
      .find({
        applicationId,
        createdAt: { $gte: periodStart, $lte: periodEnd },
      })
      .toArray();

    if (records.length === 0) {
      return res.json({
        success: true,
        data: null,
        message: 'No records found for calculation period',
      });
    }

    // Calculate all governance metrics
    const metrics = calculateMetrics(records, appSLA);

    // Fetch previous period metrics for trend analysis
    const previousPeriodStart = new Date(periodStart);
    previousPeriodStart.setDate(periodStart.getDate() - (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30));

    const previousMetricsDoc = await metricsCollection.findOne({
      applicationId,
      period,
      periodDate: { $gte: previousPeriodStart, $lt: periodStart },
    });

    const trends = calculateTrends(metrics, previousMetricsDoc);

    // Prepare governance metrics document
    const governanceMetrics = {
      applicationId,
      applicationName: app.name,
      period,
      periodDate: periodStart,
      ...metrics,
      previousPeriodMetrics: previousMetricsDoc
        ? {
            complianceRate: previousMetricsDoc.complianceRate,
            throughputQueriesPerMin: previousMetricsDoc.throughputQueriesPerMin,
            avgResponseLatency: previousMetricsDoc.avgResponseLatency,
            errorRate: previousMetricsDoc.errorRate,
          }
        : null,
      trend: trends,
      calculatedAt: new Date(),
      createdAt: new Date(),
    };

    // Upsert metrics document
    const result = await metricsCollection.updateOne(
      { applicationId, period, periodDate: periodStart },
      { $set: governanceMetrics },
      { upsert: true }
    );

    logger.info(`[Governance] Calculated metrics for app ${applicationId}, period ${period}`);

    return res.status(201).json({
      success: true,
      data: governanceMetrics,
      message: 'Governance metrics calculated and stored',
    });
  } catch (error: any) {
    logger.error('[Governance] Calculate metrics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate governance metrics',
    });
  }
});

/**
 * GET /api/governance-metrics/applications/:applicationId
 * Fetch governance metrics for an application with optional period filter
 */
governanceMetricsRouter.get('/applications/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const { period = 'daily', limit = 10 } = req.query;

    const mongoose = require('mongoose');
    const metricsCollection = mongoose.connection.collection('governancemetrics');

    // Validate period
    if (!['daily', 'weekly', 'monthly'].includes(String(period))) {
      return res.status(400).json({
        success: false,
        message: 'period must be daily, weekly, or monthly',
      });
    }

    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));

    // Fetch metrics sorted by date (latest first)
    const metrics = await metricsCollection
      .find({
        applicationId,
        period: String(period),
      })
      .sort({ periodDate: -1 })
      .limit(limitNum)
      .toArray();

    if (metrics.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No governance metrics found for this application',
      });
    }

    return res.json({
      success: true,
      data: metrics,
      message: `Retrieved ${metrics.length} governance metrics records`,
    });
  } catch (error: any) {
    logger.error('[Governance] Get metrics error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch governance metrics',
    });
  }
});

/**
 * Calculate all governance metrics from raw records
 */
function calculateMetrics(records: any[], appSLA: any): any {
  const totalRecords = records.length;
  let totalTokens = 0;
  let totalLatency = 0;
  let latencies: number[] = [];
  let errorCount = 0;
  let complianceCount = 0;
  let totalPromptWords = 0;
  let totalContextWords = 0;
  let totalResponseWords = 0;
  const userIds = new Set<string>();

  const metricCompliance: any = {};
  if (appSLA?.metrics) {
    for (const metricName of Object.keys(appSLA.metrics)) {
      metricCompliance[metricName] = 0;
    }
  }

  // Process each record
  for (const record of records) {
    // Count users
    if (record.userId) {
      userIds.add(record.userId);
    }

    // Calculate token approximation (avg 1.3 tokens per word, using 0.75 words per token)
    const promptWords = (record.query || '').split(/\s+/).length;
    const responseWords = (record.response || '').split(/\s+/).length;
    const contextWords = (record.context || '').split(/\s+/).length;

    totalTokens += (promptWords + responseWords) / 0.75;
    totalPromptWords += promptWords;
    totalContextWords += contextWords;
    totalResponseWords += responseWords;

    // Calculate latency (if timestamps available)
    if (record.createdAt && record.evaluatedAt) {
      const latency = new Date(record.evaluatedAt).getTime() - new Date(record.createdAt).getTime();
      totalLatency += latency;
      latencies.push(latency);
    }

    // Check for errors
    if (record.status === 'failed' || record.status === 'error') {
      errorCount++;
    }

    // Check SLA compliance
    let recordCompliant = true;
    if (record.evaluation?.metrics && appSLA?.metrics) {
      for (const [metricName, threshold] of Object.entries(appSLA.metrics)) {
        const metricValue = record.evaluation.metrics[metricName as string];
        if (typeof metricValue === 'number' && typeof threshold === 'number') {
          if (metricValue >= threshold) {
            metricCompliance[metricName] = (metricCompliance[metricName] || 0) + 1;
          } else {
            recordCompliant = false;
          }
        }
      }
    }

    if (recordCompliant) {
      complianceCount++;
    }
  }

  // Calculate averages and percentages
  const avgLatency = latencies.length > 0 ? totalLatency / latencies.length : 0;
  const p95Latency = calculatePercentile(latencies, 95);
  const errorRate = (errorCount / totalRecords) * 100;
  const complianceRate = (complianceCount / totalRecords) * 100;

  // Calculate throughput (queries per minute assuming records created over ~24 hours)
  const throughput = (totalRecords / (24 * 60)) * 100; // Approximate

  // Normalize metric compliance percentages
  for (const metricName of Object.keys(metricCompliance)) {
    metricCompliance[metricName] = (metricCompliance[metricName] / totalRecords) * 100;
  }

  return {
    totalTokensUsed: Math.round(totalTokens),
    avgResponseLatency: Math.round(avgLatency),
    throughputQueriesPerMin: Math.round(throughput * 100) / 100,
    p95Latency: Math.round(p95Latency),
    errorRate: Math.round(errorRate * 100) / 100,
    complianceRate: Math.round(complianceRate * 100) / 100,
    slaDeviationRate: Math.round((100 - complianceRate) * 100) / 100,
    avgPromptLength: Math.round(totalPromptWords / totalRecords),
    avgContextLength: Math.round(totalContextWords / totalRecords),
    avgResponseLength: Math.round(totalResponseWords / totalRecords),
    uniqueUsers: userIds.size,
    recordsPerUser: Math.round((totalRecords / userIds.size) * 100) / 100,
    metricCompliance,
  };
}

/**
 * Calculate trend indicators for metrics
 */
function calculateTrends(currentMetrics: any, previousMetricsDoc: any): any {
  const trends: any = {
    complianceRateTrend: 'stable',
    latencyTrend: 'stable',
    errorRateTrend: 'stable',
  };

  if (!previousMetricsDoc) {
    return trends;
  }

  const threshold = 2; // % change threshold

  // Compliance rate trend (up is good)
  if (currentMetrics.complianceRate > previousMetricsDoc.complianceRate + threshold) {
    trends.complianceRateTrend = 'up';
  } else if (currentMetrics.complianceRate < previousMetricsDoc.complianceRate - threshold) {
    trends.complianceRateTrend = 'down';
  }

  // Latency trend (down is good)
  if (currentMetrics.avgResponseLatency < previousMetricsDoc.avgResponseLatency - threshold) {
    trends.latencyTrend = 'down';
  } else if (currentMetrics.avgResponseLatency > previousMetricsDoc.avgResponseLatency + threshold) {
    trends.latencyTrend = 'up';
  }

  // Error rate trend (down is good)
  if (currentMetrics.errorRate < previousMetricsDoc.errorRate - threshold) {
    trends.errorRateTrend = 'down';
  } else if (currentMetrics.errorRate > previousMetricsDoc.errorRate + threshold) {
    trends.errorRateTrend = 'up';
  }

  return trends;
}

/**
 * Calculate percentile from array of values
 */
function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}
