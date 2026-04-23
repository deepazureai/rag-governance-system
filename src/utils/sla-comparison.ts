'use client';

import { INDUSTRY_STANDARD_SLA, getHealthStatus, getHealthColor, getHealthBadgeText } from '@/utils/sla-benchmarks';

export type HealthStatus = 'excellent' | 'good' | 'poor';

export interface EvaluationMetrics {
  faithfulness: number;
  answer_relevancy: number;
  context_relevancy: number;
  context_precision: number;
  context_recall: number;
  correctness: number;
}

export interface MetricHealthResult {
  name: string;
  value: number;
  status: HealthStatus;
  color: string;
  badge: string;
  threshold: {
    excellent: number;
    good: number;
  };
}

/**
 * Compare metrics against application-specific SLA thresholds
 */
export function evaluateMetricsAgainstSLA(
  metrics: EvaluationMetrics,
  applicationSLA: any
): {
  results: MetricHealthResult[];
  overallStatus: HealthStatus;
  compliancePercentage: number;
} {
  const slaMetrics = applicationSLA?.metrics || INDUSTRY_STANDARD_SLA.metrics;
  const results: MetricHealthResult[] = [];
  let excellentCount = 0;

  const metricNames: (keyof EvaluationMetrics)[] = [
    'faithfulness',
    'answer_relevancy',
    'context_relevancy',
    'context_precision',
    'context_recall',
    'correctness',
  ];

  metricNames.forEach((metricName) => {
    const value = metrics[metricName] || 0;
    const threshold = slaMetrics[metricName];
    const status = getHealthStatus(value, threshold);

    if (status === 'excellent') {
      excellentCount++;
    }

    results.push({
      name: metricName.replace(/_/g, ' ').toUpperCase(),
      value: Math.round(value * 100) / 100, // Round to 2 decimals
      status,
      color: getHealthColor(status),
      badge: getHealthBadgeText(status),
      threshold: {
        excellent: threshold.excellent,
        good: threshold.good,
      },
    });
  });

  const compliancePercentage = Math.round((excellentCount / metricNames.length) * 100);
  const overallStatus =
    compliancePercentage >= (applicationSLA?.overallScoreThresholds?.excellent || 80)
      ? 'excellent'
      : compliancePercentage >= (applicationSLA?.overallScoreThresholds?.good || 60)
        ? 'good'
        : 'poor';

  return {
    results,
    overallStatus,
    compliancePercentage,
  };
}

/**
 * Group evaluation records by health status for display
 */
export function groupRecordsByHealthStatus(
  records: any[],
  applicationSLA: any
): {
  excellent: any[];
  good: any[];
  poor: any[];
} {
  const grouped = {
    excellent: [] as any[],
    good: [] as any[],
    poor: [] as any[],
  };

  records.forEach((record) => {
    const evaluation = evaluateMetricsAgainstSLA(record.evaluation, applicationSLA);
    grouped[evaluation.overallStatus].push({
      ...record,
      healthEvaluation: evaluation,
    });
  });

  return grouped;
}

/**
 * Calculate SLA compliance distribution
 */
export function calculateComplianceDistribution(
  records: any[],
  applicationSLA: any
): {
  excellent: number;
  good: number;
  poor: number;
  total: number;
  percentages: {
    excellent: number;
    good: number;
    poor: number;
  };
} {
  const grouped = groupRecordsByHealthStatus(records, applicationSLA);
  const total = records.length || 1;

  return {
    excellent: grouped.excellent.length,
    good: grouped.good.length,
    poor: grouped.poor.length,
    total,
    percentages: {
      excellent: Math.round((grouped.excellent.length / total) * 100),
      good: Math.round((grouped.good.length / total) * 100),
      poor: Math.round((grouped.poor.length / total) * 100),
    },
  };
}
