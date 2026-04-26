/**
 * AI Activity Governance Service
 * Calculates observability metrics for customer AI applications
 * Focuses on latency, token usage, cost, and error tracking - NOT evaluation metrics
 */

import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';

export interface LatencyMetrics {
  min: number;
  max: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface TokenMetrics {
  promptTokens: { min: number; max: number; avg: number; total: number };
  responseTokens: { min: number; max: number; avg: number; total: number };
  totalTokens: { min: number; max: number; avg: number; total: number };
}

export interface PerPhaseLatency {
  retrieval: LatencyMetrics;
  llmProcessing: LatencyMetrics;
  total: LatencyMetrics;
}

export interface CostMetrics {
  costPerQuery: { min: number; max: number; avg: number };
  estimatedDailyCost: number;
  tokensPerDollar: number;
}

export interface ErrorMetrics {
  errorRate: number; // percentage
  timeoutRate: number; // percentage
  partialRate: number; // percentage
  successRate: number; // percentage
}

export interface AIActivityGovernanceMetrics {
  applicationId: string;
  timeRange: {
    startDate: Date;
    endDate: Date;
    recordCount: number;
  };
  
  // Latency Observability
  latency: PerPhaseLatency;
  
  // Token Usage Observability
  tokens: TokenMetrics;
  
  // Cost Observability
  cost: CostMetrics;
  
  // Error & Reliability Observability
  errors: ErrorMetrics;
  
  // Trend Analysis
  trends: {
    latencyTrend: 'improving' | 'degrading' | 'stable';
    latencyChangePercent: number;
    tokenTrend: 'increasing' | 'decreasing' | 'stable';
    tokenChangePercent: number;
    errorTrend: 'improving' | 'worsening' | 'stable';
    errorChangePercent: number;
  };
}

export class AIActivityGovernanceService {
  /**
   * Calculate complete AI activity governance metrics for an application
   */
  static async calculateAIActivityMetrics(
    applicationId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<AIActivityGovernanceMetrics> {
    try {
      logger.info(`[AIActivityGovernance] Calculating metrics for app: ${applicationId}`);

      // Get raw data records for the application
      const collection = mongoose.connection.collection('rawdatarecords');
      
      const query: any = { applicationId };
      if (dateRange) {
        query.promptTimestamp = {
          $gte: dateRange.startDate.toISOString(),
          $lte: dateRange.endDate.toISOString(),
        };
      }

      const records = await collection.find(query).toArray();
      
      if (records.length === 0) {
        logger.warn(`[AIActivityGovernance] No records found for app: ${applicationId}`);
        return this.getEmptyMetrics(applicationId);
      }

      // Extract and normalize timing data
      const timingData = records.map(r => ({
        retrievalLatencyMs: r.retrievalLatencyMs || this.calculateLatency(r.contextRetrievalStartTime, r.contextRetrievalEndTime),
        llmLatencyMs: r.llmLatencyMs || this.calculateLatency(r.llmRequestStartTime, r.llmResponseEndTime),
        totalLatencyMs: r.totalLatencyMs || this.calculateLatency(r.promptTimestamp, r.llmResponseEndTime),
        promptTokenCount: r.promptTokenCount || this.estimateTokens(r.promptLengthWords),
        responseTokenCount: r.responseTokenCount || this.estimateTokens(r.responseLengthWords),
        status: r.status || 'success',
      }));

      // Calculate latency percentiles
      const latency = this.calculateLatencyMetrics(timingData);
      
      // Calculate token metrics
      const tokens = this.calculateTokenMetrics(timingData);
      
      // Calculate cost metrics
      const cost = this.calculateCostMetrics(tokens);
      
      // Calculate error metrics
      const errors = this.calculateErrorMetrics(records);
      
      // Calculate trends
      const trends = this.calculateTrends(applicationId, records, latency, tokens, errors);

      return {
        applicationId,
        timeRange: {
          startDate: dateRange?.startDate || new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: dateRange?.endDate || new Date(),
          recordCount: records.length,
        },
        latency,
        tokens,
        cost,
        errors,
        trends,
      };
    } catch (error) {
      logger.error(`[AIActivityGovernance] Error calculating metrics:`, error);
      throw error;
    }
  }

  /**
   * Calculate latency metrics with percentiles
   */
  private static calculateLatencyMetrics(
    timingData: Array<{ retrievalLatencyMs?: number; llmLatencyMs?: number; totalLatencyMs?: number }>
  ): PerPhaseLatency {
    const retrieval = timingData
      .map(t => t.retrievalLatencyMs || 0)
      .filter(v => v > 0);
    const llm = timingData
      .map(t => t.llmLatencyMs || 0)
      .filter(v => v > 0);
    const total = timingData
      .map(t => t.totalLatencyMs || 0)
      .filter(v => v > 0);

    return {
      retrieval: this.percentileStats(retrieval),
      llmProcessing: this.percentileStats(llm),
      total: this.percentileStats(total),
    };
  }

  /**
   * Calculate token usage metrics
   */
  private static calculateTokenMetrics(
    timingData: Array<{ promptTokenCount: number; responseTokenCount: number }>
  ): TokenMetrics {
    const promptTokens = timingData.map(t => t.promptTokenCount);
    const responseTokens = timingData.map(t => t.responseTokenCount);
    const totalTokens = timingData.map(t => t.promptTokenCount + t.responseTokenCount);

    return {
      promptTokens: {
        min: Math.min(...promptTokens),
        max: Math.max(...promptTokens),
        avg: promptTokens.reduce((a, b) => a + b, 0) / promptTokens.length,
        total: promptTokens.reduce((a, b) => a + b, 0),
      },
      responseTokens: {
        min: Math.min(...responseTokens),
        max: Math.max(...responseTokens),
        avg: responseTokens.reduce((a, b) => a + b, 0) / responseTokens.length,
        total: responseTokens.reduce((a, b) => a + b, 0),
      },
      totalTokens: {
        min: Math.min(...totalTokens),
        max: Math.max(...totalTokens),
        avg: totalTokens.reduce((a, b) => a + b, 0) / totalTokens.length,
        total: totalTokens.reduce((a, b) => a + b, 0),
      },
    };
  }

  /**
   * Calculate cost metrics (assumes $0.0015 per 1K input tokens, $0.006 per 1K output tokens)
   */
  private static calculateCostMetrics(tokens: TokenMetrics): CostMetrics {
    const inputCostPer1k = 0.0015;
    const outputCostPer1k = 0.006;

    const avgQueryCost = (tokens.promptTokens.avg * inputCostPer1k) / 1000 +
      (tokens.responseTokens.avg * outputCostPer1k) / 1000;

    const minQueryCost = (tokens.promptTokens.min * inputCostPer1k) / 1000 +
      (tokens.responseTokens.min * outputCostPer1k) / 1000;

    const maxQueryCost = (tokens.promptTokens.max * inputCostPer1k) / 1000 +
      (tokens.responseTokens.max * outputCostPer1k) / 1000;

    const estimatedDailyCost = avgQueryCost * 1000; // Assume ~1000 queries per day

    return {
      costPerQuery: {
        min: minQueryCost,
        max: maxQueryCost,
        avg: avgQueryCost,
      },
      estimatedDailyCost,
      tokensPerDollar: 1 / ((tokens.totalTokens.avg * inputCostPer1k + outputCostPer1k) / 1000),
    };
  }

  /**
   * Calculate error and reliability metrics
   */
  private static calculateErrorMetrics(records: any[]): ErrorMetrics {
    const total = records.length;
    const errors = records.filter(r => r.status === 'error').length;
    const timeouts = records.filter(r => r.status === 'timeout').length;
    const partial = records.filter(r => r.status === 'partial').length;
    const success = records.filter(r => r.status === 'success').length;

    return {
      errorRate: (errors / total) * 100,
      timeoutRate: (timeouts / total) * 100,
      partialRate: (partial / total) * 100,
      successRate: (success / total) * 100,
    };
  }

  /**
   * Calculate trends by comparing current period to previous period
   */
  private static async calculateTrends(
    applicationId: string,
    currentRecords: any[],
    currentLatency: PerPhaseLatency,
    currentTokens: TokenMetrics,
    currentErrors: ErrorMetrics
  ): Promise<AIActivityGovernanceMetrics['trends']> {
    // Get previous period metrics (last 48 hours vs previous 48 hours)
    const currentStartDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const previousEndDate = currentStartDate;
    const previousStartDate = new Date(previousEndDate.getTime() - 24 * 60 * 60 * 1000);

    try {
      const collection = mongoose.connection.collection('rawdatarecords');
      const previousRecords = await collection
        .find({
          applicationId,
          promptTimestamp: {
            $gte: previousStartDate.toISOString(),
            $lte: previousEndDate.toISOString(),
          },
        })
        .toArray();

      if (previousRecords.length === 0) {
        return {
          latencyTrend: 'stable',
          latencyChangePercent: 0,
          tokenTrend: 'stable',
          tokenChangePercent: 0,
          errorTrend: 'stable',
          errorChangePercent: 0,
        };
      }

      // Calculate previous metrics
      const prevTimingData = previousRecords.map(r => ({
        retrievalLatencyMs: r.retrievalLatencyMs || 0,
        llmLatencyMs: r.llmLatencyMs || 0,
        totalLatencyMs: r.totalLatencyMs || 0,
        promptTokenCount: r.promptTokenCount || 0,
        responseTokenCount: r.responseTokenCount || 0,
        status: r.status,
      }));

      const prevLatency = this.calculateLatencyMetrics(prevTimingData);
      const prevTokens = this.calculateTokenMetrics(prevTimingData);
      const prevErrors = this.calculateErrorMetrics(previousRecords);

      // Calculate percent changes
      const latencyChangePercent =
        ((currentLatency.total.avg - prevLatency.total.avg) / prevLatency.total.avg) * 100;
      const tokenChangePercent =
        ((currentTokens.totalTokens.avg - prevTokens.totalTokens.avg) / prevTokens.totalTokens.avg) * 100;
      const errorChangePercent =
        ((currentErrors.errorRate - prevErrors.errorRate) / prevErrors.errorRate) * 100;

      return {
        latencyTrend: latencyChangePercent > 10 ? 'degrading' : latencyChangePercent < -10 ? 'improving' : 'stable',
        latencyChangePercent,
        tokenTrend: tokenChangePercent > 10 ? 'increasing' : tokenChangePercent < -10 ? 'decreasing' : 'stable',
        tokenChangePercent,
        errorTrend: errorChangePercent > 10 ? 'worsening' : errorChangePercent < -10 ? 'improving' : 'stable',
        errorChangePercent,
      };
    } catch (error) {
      logger.error('[AIActivityGovernance] Error calculating trends:', error);
      return {
        latencyTrend: 'stable',
        latencyChangePercent: 0,
        tokenTrend: 'stable',
        tokenChangePercent: 0,
        errorTrend: 'stable',
        errorChangePercent: 0,
      };
    }
  }

  /**
   * Helper: Calculate latency from two timestamps
   */
  private static calculateLatency(startTime?: string, endTime?: string): number {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    return Math.max(0, end - start);
  }

  /**
   * Helper: Estimate token count from word count (1 token ≈ 0.75 words)
   */
  private static estimateTokens(words?: number): number {
    return Math.ceil((words || 0) / 0.75);
  }

  /**
   * Helper: Calculate percentile statistics
   */
  private static percentileStats(values: number[]): LatencyMetrics {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const p50Index = Math.floor(sorted.length * 0.5);
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg,
      p50: sorted[p50Index],
      p95: sorted[Math.min(p95Index, sorted.length - 1)],
      p99: sorted[Math.min(p99Index, sorted.length - 1)],
    };
  }

  /**
   * Get empty metrics structure
   */
  private static getEmptyMetrics(applicationId: string): AIActivityGovernanceMetrics {
    return {
      applicationId,
      timeRange: {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(),
        recordCount: 0,
      },
      latency: {
        retrieval: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 },
        llmProcessing: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 },
        total: { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 },
      },
      tokens: {
        promptTokens: { min: 0, max: 0, avg: 0, total: 0 },
        responseTokens: { min: 0, max: 0, avg: 0, total: 0 },
        totalTokens: { min: 0, max: 0, avg: 0, total: 0 },
      },
      cost: {
        costPerQuery: { min: 0, max: 0, avg: 0 },
        estimatedDailyCost: 0,
        tokensPerDollar: 0,
      },
      errors: {
        errorRate: 0,
        timeoutRate: 0,
        partialRate: 0,
        successRate: 100,
      },
      trends: {
        latencyTrend: 'stable',
        latencyChangePercent: 0,
        tokenTrend: 'stable',
        tokenChangePercent: 0,
        errorTrend: 'stable',
        errorChangePercent: 0,
      },
    };
  }
}

export default AIActivityGovernanceService;
