/**
 * Governance Metrics Service
 * Calculates SLA compliance and governance metrics across frameworks
 * Displays raw data grouped by metric, SLA status, and framework
 */

import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { INDUSTRY_STANDARD_THRESHOLDS, AlertThresholdConfig } from '../types/index.js';

export interface SLAComplianceMetric {
  metricName: string;
  value: number;
  threshold: AlertThresholdConfig[keyof AlertThresholdConfig];
  status: 'critical' | 'warning' | 'healthy';
  framework: string;
}

export interface GovernanceMetrics {
  applicationId: string;
  batchId: string;
  evaluationId: string;
  timestamp: string;
  
  // SLA Compliance per metric
  slaCompliance: SLAComplianceMetric[];
  
  // Overall compliance percentage
  overallSLACompliance: number; // 0-100
  
  // Framework summary
  frameworksUsed: string[];
  frameworkResults: Record<string, { passed: number; failed: number; }>;
  
  // Raw data for visualization
  rawData: {
    query: string;
    response: string;
    retrievedDocuments: Array<{ content: string; source: string; relevance?: number }>;
    metrics: Record<string, number>;
    frameworks: string[];
  };
}

export class GovernanceMetricsService {
  /**
   * Calculate governance metrics for an evaluation record
   */
  static async calculateGovernanceMetrics(
    evaluationRecord: any,
    thresholds?: AlertThresholdConfig
  ): Promise<GovernanceMetrics> {
    const thresholdConfig = thresholds || INDUSTRY_STANDARD_THRESHOLDS;
    
    const evaluation = evaluationRecord.evaluation || {};
    const frameworks = evaluationRecord.frameworksUsed || [];
    
    // Calculate SLA compliance for each metric
    const slaCompliance: SLAComplianceMetric[] = [];
    const metricsToCheck = [
      'groundedness',
      'coherence',
      'relevance',
      'faithfulness',
      'answerRelevancy',
      'contextPrecision',
      'contextRecall',
    ];
    
    let passedMetrics = 0;
    
    for (const metricName of metricsToCheck) {
      const value = evaluation[metricName] || 0;
      const metricThreshold = (thresholdConfig as any)[metricName];
      
      if (!metricThreshold) continue;
      
      let status: 'critical' | 'warning' | 'healthy';
      
      if (value < metricThreshold.critical) {
        status = 'critical';
      } else if (value < metricThreshold.warning) {
        status = 'warning';
      } else {
        status = 'healthy';
        passedMetrics++;
      }
      
      slaCompliance.push({
        metricName,
        value,
        threshold: metricThreshold,
        status,
        framework: frameworks[0] || 'unknown', // Attribution to primary framework
      });
    }
    
    const overallSLACompliance = (passedMetrics / metricsToCheck.length) * 100;
    
    // Summary by framework
    const frameworkResults: Record<string, { passed: number; failed: number; }> = {};
    for (const framework of frameworks) {
      const frameworkResult = evaluationRecord.rawFrameworkResults?.find(
        (r: any) => r.framework === framework
      );
      if (frameworkResult) {
        const frameworkMetrics = Object.values(frameworkResult.metrics || {}) as number[];
        const passed = frameworkMetrics.filter(m => m > 50).length;
        frameworkResults[framework] = {
          passed,
          failed: frameworkMetrics.length - passed,
        };
      }
    }
    
    const governance: GovernanceMetrics = {
      applicationId: evaluationRecord.applicationId,
      batchId: evaluationRecord.batchId,
      evaluationId: evaluationRecord._id?.toString() || '',
      timestamp: evaluationRecord.evaluatedAt?.toISOString() || new Date().toISOString(),
      
      slaCompliance,
      overallSLACompliance,
      
      frameworksUsed: frameworks,
      frameworkResults,
      
      rawData: {
        query: evaluationRecord.query || '',
        response: evaluationRecord.response || '',
        retrievedDocuments: evaluationRecord.retrievedDocuments || [],
        metrics: evaluation,
        frameworks,
      },
    };
    
    logger.info('[GovernanceMetricsService] Calculated governance metrics:', {
      applicationId: governance.applicationId,
      overallSLACompliance: governance.overallSLACompliance.toFixed(2),
      frameworksUsed: frameworks,
    });
    
    return governance;
  }
  
  /**
   * Get governance metrics for an application with filters
   */
  static async getApplicationGovernanceMetrics(
    applicationId: string,
    options?: {
      batchId?: string;
      framework?: string;
      metricFilter?: string; // Filter by specific metric
      slaStatusFilter?: 'critical' | 'warning' | 'healthy';
      limit?: number;
      offset?: number;
    }
  ): Promise<{ metrics: GovernanceMetrics[]; total: number }> {
    try {
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      
      const query: any = { applicationId };
      if (options?.batchId) query.batchId = options.batchId;
      
      // Find all evaluations for the app
      const evaluations = await EvaluationCollection
        .find(query)
        .limit(options?.limit || 100)
        .skip(options?.offset || 0)
        .toArray();
      
      // Calculate governance metrics for each
      const governanceMetrics: GovernanceMetrics[] = [];
      
      for (const evaluation of evaluations) {
        const metrics = await this.calculateGovernanceMetrics(evaluation);
        
        // Apply filters
        if (options?.framework && !metrics.frameworksUsed.includes(options.framework)) {
          continue;
        }
        
        if (options?.metricFilter || options?.slaStatusFilter) {
          const filtered = metrics.slaCompliance.filter(m => {
            if (options.metricFilter && !m.metricName.includes(options.metricFilter)) {
              return false;
            }
            if (options.slaStatusFilter && m.status !== options.slaStatusFilter) {
              return false;
            }
            return true;
          });
          
          if (filtered.length === 0) continue;
          
          // Update compliance for filtered view
          const newMetrics = { ...metrics };
          newMetrics.slaCompliance = filtered;
          governanceMetrics.push(newMetrics);
        } else {
          governanceMetrics.push(metrics);
        }
      }
      
      const total = await EvaluationCollection.countDocuments(query);
      
      logger.info('[GovernanceMetricsService] Retrieved governance metrics:', {
        applicationId,
        count: governanceMetrics.length,
        total,
      });
      
      return { metrics: governanceMetrics, total };
    } catch (error) {
      logger.error('[GovernanceMetricsService] Failed to get governance metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get raw data grouped by metric
   */
  static async getRawDataGroupedByMetric(
    applicationId: string,
    metricName: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<{ metric: string; value: number; slaStatus: string; query: string; response: string; frameworks: string[] }>> {
    try {
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      
      const evaluations = await EvaluationCollection
        .find({ applicationId })
        .limit(options?.limit || 50)
        .skip(options?.offset || 0)
        .toArray();
      
      const results = [];
      
      for (const evaluation of evaluations) {
        const metrics = await this.calculateGovernanceMetrics(evaluation);
        
        // Filter for the requested metric
        const metricData = metrics.slaCompliance.find(m => m.metricName === metricName);
        if (metricData) {
          results.push({
            metric: metricName,
            value: metricData.value,
            slaStatus: metricData.status,
            query: metrics.rawData.query,
            response: metrics.rawData.response.substring(0, 200), // Truncate for readability
            frameworks: metrics.frameworksUsed,
          });
        }
      }
      
      logger.info('[GovernanceMetricsService] Retrieved raw data grouped by metric:', {
        applicationId,
        metricName,
        count: results.length,
      });
      
      return results;
    } catch (error) {
      logger.error('[GovernanceMetricsService] Failed to get raw data by metric:', error);
      throw error;
    }
  }
  
  /**
   * Get raw data grouped by SLA status
   */
  static async getRawDataGroupedByStatus(
    applicationId: string,
    status: 'critical' | 'warning' | 'healthy',
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<Array<{ metric: string; value: number; query: string; response: string }>> {
    try {
      const EvaluationCollection = mongoose.connection.collection('evaluationrecords');
      
      const evaluations = await EvaluationCollection
        .find({ applicationId })
        .limit(options?.limit || 50)
        .skip(options?.offset || 0)
        .toArray();
      
      const results = [];
      
      for (const evaluation of evaluations) {
        const metrics = await this.calculateGovernanceMetrics(evaluation);
        
        // Filter for the requested status
        const metricsWithStatus = metrics.slaCompliance.filter(m => m.status === status);
        for (const metric of metricsWithStatus) {
          results.push({
            metric: metric.metricName,
            value: metric.value,
            query: metrics.rawData.query,
            response: metrics.rawData.response.substring(0, 200),
          });
        }
      }
      
      logger.info('[GovernanceMetricsService] Retrieved raw data grouped by status:', {
        applicationId,
        status,
        count: results.length,
      });
      
      return results;
    } catch (error) {
      logger.error('[GovernanceMetricsService] Failed to get raw data by status:', error);
      throw error;
    }
  }
  
  /**
   * Get SLA compliance summary for dashboard
   */
  static async getSLAComplianceSummary(
    applicationId: string
  ): Promise<{
    overallCompliance: number;
    complianceByMetric: Record<string, number>;
    complianceByFramework: Record<string, number>;
    criticalCount: number;
    warningCount: number;
    healthyCount: number;
  }> {
    try {
      const { metrics } = await this.getApplicationGovernanceMetrics(applicationId, {
        limit: 1000,
      });
      
      if (metrics.length === 0) {
        return {
          overallCompliance: 0,
          complianceByMetric: {},
          complianceByFramework: {},
          criticalCount: 0,
          warningCount: 0,
          healthyCount: 0,
        };
      }
      
      // Calculate summary statistics
      let totalCompliance = 0;
      const complianceByMetric: Record<string, { passed: number; total: number; }> = {};
      const complianceByFramework: Record<string, { passed: number; total: number; }> = {};
      let criticalCount = 0;
      let warningCount = 0;
      let healthyCount = 0;
      
      for (const metric of metrics) {
        totalCompliance += metric.overallSLACompliance;
        
        for (const sla of metric.slaCompliance) {
          // By metric
          if (!complianceByMetric[sla.metricName]) {
            complianceByMetric[sla.metricName] = { passed: 0, total: 0 };
          }
          complianceByMetric[sla.metricName].total++;
          if (sla.status === 'healthy') {
            complianceByMetric[sla.metricName].passed++;
          }
          
          // By framework
          if (!complianceByFramework[sla.framework]) {
            complianceByFramework[sla.framework] = { passed: 0, total: 0 };
          }
          complianceByFramework[sla.framework].total++;
          if (sla.status === 'healthy') {
            complianceByFramework[sla.framework].passed++;
          }
          
          // Count by status
          if (sla.status === 'critical') criticalCount++;
          else if (sla.status === 'warning') warningCount++;
          else healthyCount++;
        }
      }
      
      // Convert to percentages
      const complianceMetric: Record<string, number> = {};
      for (const [metric, stats] of Object.entries(complianceByMetric)) {
        complianceMetric[metric] = (stats.passed / stats.total) * 100;
      }
      
      const complianceFramework: Record<string, number> = {};
      for (const [framework, stats] of Object.entries(complianceByFramework)) {
        complianceFramework[framework] = (stats.passed / stats.total) * 100;
      }
      
      const summary = {
        overallCompliance: totalCompliance / metrics.length,
        complianceByMetric: complianceMetric,
        complianceByFramework: complianceFramework,
        criticalCount,
        warningCount,
        healthyCount,
      };
      
      logger.info('[GovernanceMetricsService] SLA compliance summary:', {
        applicationId,
        overallCompliance: summary.overallCompliance.toFixed(2),
      });
      
      return summary;
    } catch (error) {
      logger.error('[GovernanceMetricsService] Failed to get SLA compliance summary:', error);
      throw error;
    }
  }
}

export default GovernanceMetricsService;
