import { Router, Request, Response } from 'express';
import { getStringParam } from '../utils/paramParser.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import GovernanceMetricsService from '../services/GovernanceMetricsService.js';
import AIActivityGovernanceService from '../services/AIActivityGovernanceService.js';

export const governanceMetricsRouter = Router();

/**
 * GET /api/governance-metrics/ai-activity/:applicationId
 * Get AI Activity Governance metrics (latency, tokens, cost, errors)
 * Query params:
 *   - startDate: ISO date string (optional)
 *   - endDate: ISO date string (optional)
 */
governanceMetricsRouter.get('/ai-activity/:applicationId', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const { startDate, endDate } = req.query;
    
    logger.info('[Governance] GET AI Activity metrics:', { applicationId });

    // Build date range
    let dateRange: { startDate: Date; endDate: Date } | undefined;
    if (startDate && endDate) {
      dateRange = {
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string),
      };
    }

    // Calculate metrics
    const metrics = await AIActivityGovernanceService.calculateAIActivityMetrics(applicationId, dateRange);

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error: any) {
    logger.error('[Governance] Error getting AI activity metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/governance-metrics/ai-activity/:applicationId/latest
 * Get latest stored AI Activity governance metrics for an application
 */
governanceMetricsRouter.get('/ai-activity/:applicationId/latest', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    logger.info('[Governance] GET latest AI Activity metrics:', { applicationId });

    const GovernanceCollection = mongoose.connection.collection('governancemetrics');
    const latestMetrics = await GovernanceCollection.findOne(
      { applicationId },
      { sort: { calculatedAt: -1 } }
    );

    if (!latestMetrics) {
      return res.json({
        success: true,
        data: null,
        message: 'No governance metrics found yet. Run batch process to calculate.',
      });
    }

    res.json({
      success: true,
      data: latestMetrics,
    });
  } catch (error: any) {
    logger.error('[Governance] Error getting latest AI activity metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * POST /api/governance-metrics/ai-activity/:applicationId/calculate
 * Force recalculation of AI Activity governance metrics
 */
governanceMetricsRouter.post('/ai-activity/:applicationId/calculate', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);
    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    logger.info('[Governance] POST calculating AI Activity metrics:', { applicationId });

    // Calculate metrics
    const metrics = await AIActivityGovernanceService.calculateAIActivityMetrics(applicationId);

    // Store in governancemetrics collection
    const GovernanceCollection = mongoose.connection.collection('governancemetrics');
    const result = await GovernanceCollection.updateOne(
      { applicationId },
      {
        $set: {
          ...metrics,
          applicationId,
          calculatedAt: new Date(),
        }
      },
      { upsert: true }
    );

    logger.info('[Governance] AI Activity metrics calculated and stored', {
      p95Latency: metrics.latency.total.p95,
      errorRate: metrics.errors.errorRate,
    });

    res.json({
      success: true,
      data: metrics,
      message: 'AI Activity metrics calculated successfully',
    });
  } catch (error: any) {
    logger.error('[Governance] Error calculating AI activity metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

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
 * Implements complete RAGA framework coverage with all 5 metrics
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
  let totalContextChunks = 0;
  const userIds = new Set<string>();

  // RAGA Metrics Aggregation (ALL 5 metrics)
  const ragaMetricsAggregation = {
    faithfulness: { sum: 0, count: 0, values: [] as number[] },
    answerRelevancy: { sum: 0, count: 0, values: [] as number[] },
    contextPrecision: { sum: 0, count: 0, values: [] as number[] },
    contextRecall: { sum: 0, count: 0, values: [] as number[] },
    correctness: { sum: 0, count: 0, values: [] as number[] },
  };

  const metricCompliance: any = {};
  if (appSLA?.metrics) {
    for (const metricName of Object.keys(appSLA.metrics)) {
      metricCompliance[metricName] = 0;
    }
  }

  // Process each record
  for (const record of records) {
    // 1. USER DISTRIBUTION (for throughput per user)
    if (record.userId) {
      userIds.add(record.userId);
    }

    // 2. CONTENT LENGTH METRICS (for token and throughput calculations)
    const promptWords = (record.userPrompt || record.query || '').split(/\s+/).length;
    const responseWords = (record.llmResponse || record.response || '').split(/\s+/).length;
    const contextWords = (record.context || '').split(/\s+/).length;

    totalTokens += (promptWords + responseWords + contextWords) / 0.75;
    totalPromptWords += promptWords;
    totalContextWords += contextWords;
    totalResponseWords += responseWords;
    totalContextChunks += record.contextChunkCount || 1;

    // 3. LATENCY METRICS (from detailed timestamps)
    if (record.latencyMetrics?.totalLatencyMs) {
      // New schema: use latencyMetrics.totalLatencyMs (milliseconds)
      const latency = record.latencyMetrics.totalLatencyMs;
      totalLatency += latency;
      latencies.push(latency);
    } else if (record.promptTimestamp && record.llmResponseEndTime) {
      // Calculate from timestamps
      const latency = new Date(record.llmResponseEndTime).getTime() - new Date(record.promptTimestamp).getTime();
      totalLatency += latency;
      latencies.push(latency);
    } else if (record.createdAt && record.evaluatedAt) {
      // Fallback: old schema
      const latency = new Date(record.evaluatedAt).getTime() - new Date(record.createdAt).getTime();
      totalLatency += latency;
      latencies.push(latency);
    }

    // 4. ERROR DETECTION
    if (record.status === 'failed' || record.status === 'error' || record.dataQuality?.validationStatus === 'invalid') {
      errorCount++;
    }

    // 5. RAGA METRICS AGGREGATION (all 5 core metrics)
    if (record.ragaMetrics) {
      // Faithfulness: Is response grounded in context?
      if (typeof record.ragaMetrics.faithfulness === 'number') {
        ragaMetricsAggregation.faithfulness.sum += record.ragaMetrics.faithfulness;
        ragaMetricsAggregation.faithfulness.count++;
        ragaMetricsAggregation.faithfulness.values.push(record.ragaMetrics.faithfulness);
      }

      // Answer Relevancy: Is answer relevant to question?
      if (typeof record.ragaMetrics.answerRelevancy === 'number') {
        ragaMetricsAggregation.answerRelevancy.sum += record.ragaMetrics.answerRelevancy;
        ragaMetricsAggregation.answerRelevancy.count++;
        ragaMetricsAggregation.answerRelevancy.values.push(record.ragaMetrics.answerRelevancy);
      }

      // Context Precision: Is retrieved context relevant?
      if (typeof record.ragaMetrics.contextPrecision === 'number') {
        ragaMetricsAggregation.contextPrecision.sum += record.ragaMetrics.contextPrecision;
        ragaMetricsAggregation.contextPrecision.count++;
        ragaMetricsAggregation.contextPrecision.values.push(record.ragaMetrics.contextPrecision);
      }

      // Context Recall: Did we retrieve all relevant information?
      if (typeof record.ragaMetrics.contextRecall === 'number') {
        ragaMetricsAggregation.contextRecall.sum += record.ragaMetrics.contextRecall;
        ragaMetricsAggregation.contextRecall.count++;
        ragaMetricsAggregation.contextRecall.values.push(record.ragaMetrics.contextRecall);
      }

      // Correctness: Is answer factually correct?
      if (typeof record.ragaMetrics.correctness === 'number') {
        ragaMetricsAggregation.correctness.sum += record.ragaMetrics.correctness;
        ragaMetricsAggregation.correctness.count++;
        ragaMetricsAggregation.correctness.values.push(record.ragaMetrics.correctness);
      }
    }

    // 6. SLA COMPLIANCE CHECK (against all RAGA metrics)
    let recordCompliant = true;
    if (record.ragaMetrics && appSLA?.metrics) {
      // Map RAGA metrics to SLA thresholds
      const ragaToSLAMapping = {
        faithfulness: 'faithfulness',
        answerRelevancy: 'answer_relevancy',
        contextPrecision: 'context_precision',
        contextRecall: 'context_recall',
        correctness: 'correctness',
      };

      for (const [ragaKey, slaKey] of Object.entries(ragaToSLAMapping)) {
        const ragaValue = record.ragaMetrics[ragaKey as keyof typeof ragaToSLAMapping];
        const slaThreshold = appSLA.metrics[slaKey];

        if (typeof ragaValue === 'number' && slaThreshold?.good) {
          if (ragaValue >= slaThreshold.good) {
            // Metric meets SLA "good" threshold
            metricCompliance[slaKey] = (metricCompliance[slaKey] || 0) + 1;
          } else {
            // Metric falls below SLA threshold - record is non-compliant
            recordCompliant = false;
          }
        }
      }
    }

    if (recordCompliant && record.ragaMetrics) {
      complianceCount++;
    }
  }

  // Calculate averages for RAGA metrics
  const avgFaithfulness = ragaMetricsAggregation.faithfulness.count > 0
    ? Math.round((ragaMetricsAggregation.faithfulness.sum / ragaMetricsAggregation.faithfulness.count) * 100) / 100
    : 0;

  const avgAnswerRelevancy = ragaMetricsAggregation.answerRelevancy.count > 0
    ? Math.round((ragaMetricsAggregation.answerRelevancy.sum / ragaMetricsAggregation.answerRelevancy.count) * 100) / 100
    : 0;

  const avgContextPrecision = ragaMetricsAggregation.contextPrecision.count > 0
    ? Math.round((ragaMetricsAggregation.contextPrecision.sum / ragaMetricsAggregation.contextPrecision.count) * 100) / 100
    : 0;

  const avgContextRecall = ragaMetricsAggregation.contextRecall.count > 0
    ? Math.round((ragaMetricsAggregation.contextRecall.sum / ragaMetricsAggregation.contextRecall.count) * 100) / 100
    : 0;

  const avgCorrectness = ragaMetricsAggregation.correctness.count > 0
    ? Math.round((ragaMetricsAggregation.correctness.sum / ragaMetricsAggregation.correctness.count) * 100) / 100
    : 0;

  // Calculate latency metrics
  const avgLatency = latencies.length > 0 ? totalLatency / latencies.length : 0;
  const p95Latency = calculatePercentile(latencies, 95);
  const errorRate = (errorCount / totalRecords) * 100;
  const complianceRate = (complianceCount / totalRecords) * 100;

  // Calculate throughput (records per minute, assuming recorded over period)
  const throughput = totalRecords > 0 ? (totalRecords / (24 * 60)) : 0; // Approx for 24-hour period

  // Normalize metric compliance percentages
  for (const metricName of Object.keys(metricCompliance)) {
    metricCompliance[metricName] = totalRecords > 0 ? (metricCompliance[metricName] / totalRecords) * 100 : 0;
  }

  // Calculate overall compliance rate as average of all 5 RAGA metrics
  const overallComplianceRate = (avgFaithfulness + avgAnswerRelevancy + avgContextPrecision + avgContextRecall + avgCorrectness) / 5;

  return {
    // Token & Content Metrics
    totalTokensUsed: Math.round(totalTokens),
    
    // Latency Metrics
    avgResponseLatency: Math.round(avgLatency),
    p95Latency: Math.round(p95Latency),
    
    // Throughput Metrics
    throughputQueriesPerMin: Math.round((throughput * 100) / 100 * 100) / 100,
    
    // Error & Compliance Metrics
    errorRate: Math.round(errorRate * 100) / 100,
    complianceRate: Math.round(overallComplianceRate * 100) / 100, // Overall RAGA compliance
    slaDeviationRate: Math.round((100 - overallComplianceRate) * 100) / 100,
    
    // Content Length Metrics
    avgPromptLength: Math.round(totalPromptWords / totalRecords),
    avgContextLength: Math.round(totalContextWords / totalRecords),
    avgResponseLength: Math.round(totalResponseWords / totalRecords),
    
    // User Distribution
    uniqueUsers: userIds.size,
    recordsPerUser: userIds.size > 0 ? Math.round((totalRecords / userIds.size) * 100) / 100 : 0,
    
    // Per-Metric Compliance (all 5 RAGA metrics)
    metricCompliance: {
      faithfulness: Math.round(metricCompliance['faithfulness'] * 100) / 100,
      answer_relevancy: Math.round(metricCompliance['answer_relevancy'] * 100) / 100,
      context_precision: Math.round(metricCompliance['context_precision'] * 100) / 100,
      context_recall: Math.round(metricCompliance['context_recall'] * 100) / 100,
      correctness: Math.round(metricCompliance['correctness'] * 100) / 100,
    },
    
    // RAGA Metrics Averages (for reference in governance report)
    ragaMetricsAverages: {
      faithfulness: avgFaithfulness,
      answerRelevancy: avgAnswerRelevancy,
      contextPrecision: avgContextPrecision,
      contextRecall: avgContextRecall,
      correctness: avgCorrectness,
    },
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

/**
 * NEW ROUTES: Raw Data Visualization with Multi-Framework Support
 */

/**
 * GET /api/governance-metrics/sla-compliance/:appId
 * Get SLA compliance summary for an application (multi-framework aware)
 */
governanceMetricsRouter.get('/sla-compliance/:appId', async (req: Request, res: Response) => {
  try {
    const appId = getStringParam(req.params.appId);
    if (!appId) {
      return res.status(400).json({
        success: false,
        message: 'appId is required',
      });
    }

    logger.info('[Governance] GET SLA compliance summary:', { appId });

    const summary = await GovernanceMetricsService.getSLAComplianceSummary(appId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    logger.error('[Governance] Error getting SLA compliance summary:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/governance-metrics/raw-data/:appId
 * Get raw data grouped by metric, status, framework, or date
 * Query params:
 *   - groupBy: 'metric', 'status', 'framework', or 'date'
 *   - limit: Results per page (default 100)
 *   - offset: Pagination offset (default 0)
 */
governanceMetricsRouter.get('/raw-data/:appId', async (req: Request, res: Response) => {
  try {
    const appId = getStringParam(req.params.appId);
    if (!appId) {
      return res.status(400).json({
        success: false,
        message: 'appId is required',
      });
    }

    const { groupBy, limit, offset } = req.query;

    logger.info('[Governance] GET raw data:', { appId, groupBy });

    const { metrics } = await GovernanceMetricsService.getApplicationGovernanceMetrics(appId, {
      limit: parseInt(limit as string) || 100,
      offset: parseInt(offset as string) || 0,
    });

    // Group data if requested
    let groupedData: any = metrics;
    
    if (groupBy === 'metric') {
      groupedData = {};
      for (const metric of metrics) {
        for (const sla of metric.slaCompliance) {
          if (!groupedData[sla.metricName]) {
            groupedData[sla.metricName] = [];
          }
          groupedData[sla.metricName].push({
            value: sla.value,
            status: sla.status,
            query: metric.rawData.query.substring(0, 100),
            response: metric.rawData.response.substring(0, 100),
          });
        }
      }
    } else if (groupBy === 'status') {
      groupedData = { critical: [], warning: [], healthy: [] };
      for (const metric of metrics) {
        for (const sla of metric.slaCompliance) {
          groupedData[sla.status].push({
            metric: sla.metricName,
            value: sla.value,
            query: metric.rawData.query.substring(0, 100),
            response: metric.rawData.response.substring(0, 100),
          });
        }
      }
    } else if (groupBy === 'framework') {
      groupedData = {};
      for (const metric of metrics) {
        for (const framework of metric.frameworksUsed) {
          if (!groupedData[framework]) {
            groupedData[framework] = [];
          }
          groupedData[framework].push({
            query: metric.rawData.query.substring(0, 100),
            response: metric.rawData.response.substring(0, 100),
            slaCompliance: metric.slaCompliance,
          });
        }
      }
    } else if (groupBy === 'date') {
      groupedData = {};
      for (const metric of metrics) {
        const date = new Date(metric.timestamp).toISOString().split('T')[0];
        if (!groupedData[date]) {
          groupedData[date] = [];
        }
        groupedData[date].push({
          query: metric.rawData.query.substring(0, 100),
          response: metric.rawData.response.substring(0, 100),
          slaCompliance: metric.slaCompliance,
        });
      }
    }

    res.json({
      success: true,
      appId,
      groupBy: groupBy || 'none',
      data: groupedData,
      count: metrics.length,
    });
  } catch (error: any) {
    logger.error('[Governance] Error getting raw data:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/governance-metrics/raw-data/by-metric/:appId/:metricName
 * Get raw data for a specific metric with SLA status
 * Query params:
 *   - limit: Results per page (default 50)
 *   - offset: Pagination offset (default 0)
 */
governanceMetricsRouter.get('/raw-data/by-metric/:appId/:metricName', async (req: Request, res: Response) => {
  try {
    const appId = getStringParam(req.params.appId);
    const metricName = getStringParam(req.params.metricName);
    
    if (!appId || !metricName) {
      return res.status(400).json({
        success: false,
        message: 'appId and metricName are required',
      });
    }

    const { limit, offset } = req.query;

    logger.info('[Governance] GET raw data by metric:', { appId, metricName });

    const data = await GovernanceMetricsService.getRawDataGroupedByMetric(appId, metricName, {
      limit: parseInt(limit as string) || 50,
      offset: parseInt(offset as string) || 0,
    });

    res.json({
      success: true,
      metric: metricName,
      data,
      count: data.length,
    });
  } catch (error: any) {
    logger.error('[Governance] Error getting raw data by metric:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/governance-metrics/raw-data/by-status/:appId/:status
 * Get raw data grouped by SLA status
 * Params:
 *   - status: 'critical', 'warning', or 'healthy'
 * Query params:
 *   - limit: Results per page (default 50)
 *   - offset: Pagination offset (default 0)
 */
governanceMetricsRouter.get('/raw-data/by-status/:appId/:status', async (req: Request, res: Response) => {
  try {
    const appId = getStringParam(req.params.appId);
    const status = getStringParam(req.params.status);

    if (!appId || !status) {
      return res.status(400).json({
        success: false,
        message: 'appId and status are required',
      });
    }

    // Validate status
    if (!['critical', 'warning', 'healthy'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be critical, warning, or healthy.',
      });
    }

    const { limit, offset } = req.query;

    logger.info('[Governance] GET raw data by status:', { appId, status });

    const data = await GovernanceMetricsService.getRawDataGroupedByStatus(
      appId,
      status as 'critical' | 'warning' | 'healthy',
      {
        limit: parseInt(limit as string) || 50,
        offset: parseInt(offset as string) || 0,
      }
    );

    res.json({
      success: true,
      status,
      data,
      count: data.length,
    });
  } catch (error: any) {
    logger.error('[Governance] Error getting raw data by status:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * GET /api/governance-metrics/detailed/:appId
 * Get detailed governance metrics for an application (multi-framework aware)
 * Query params:
 *   - batchId: Filter by specific batch
 *   - framework: Filter by framework name
 *   - metricFilter: Filter by metric name
 *   - slaStatus: Filter by SLA status (critical, warning, healthy)
 *   - limit: Results per page (default 100)
 *   - offset: Pagination offset (default 0)
 */
governanceMetricsRouter.get('/detailed/:appId', async (req: Request, res: Response) => {
  try {
    const appId = getStringParam(req.params.appId);
    if (!appId) {
      return res.status(400).json({
        success: false,
        message: 'appId is required',
      });
    }

    const { batchId, framework, metricFilter, slaStatus, limit, offset } = req.query;

    logger.info('[Governance] GET detailed governance metrics:', { appId, framework });

    const { metrics, total } = await GovernanceMetricsService.getApplicationGovernanceMetrics(appId, {
      batchId: batchId as string | undefined,
      framework: framework as string | undefined,
      metricFilter: metricFilter as string | undefined,
      slaStatusFilter: (slaStatus as 'critical' | 'warning' | 'healthy' | undefined),
      limit: parseInt(limit as string) || 100,
      offset: parseInt(offset as string) || 0,
    });

    res.json({
      success: true,
      data: metrics,
      total,
      count: metrics.length,
    });
  } catch (error: any) {
    logger.error('[Governance] Error getting detailed governance metrics:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
