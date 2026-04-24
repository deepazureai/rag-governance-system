/**
 * Industry Standard SLA Benchmarks
 * Default thresholds used across all applications unless customized
 */

export const INDUSTRY_STANDARD_SLA = {
  metrics: {
    faithfulness: {
      excellent: 80,  // >=80% is excellent
      good: 60,       // 60-79% is good
      poor: 0,        // <60% is poor
    },
    answer_relevancy: {
      excellent: 80,
      good: 60,
      poor: 0,
    },
    context_relevancy: {
      excellent: 75,
      good: 50,
      poor: 0,
    },
    context_precision: {
      excellent: 80,
      good: 60,
      poor: 0,
    },
    context_recall: {
      excellent: 75,
      good: 50,
      poor: 0,
    },
    correctness: {
      excellent: 85,
      good: 70,
      poor: 0,
    },
  },
  overallScoreThresholds: {
    excellent: 80,
    good: 60,
  },
};

/**
 * Get color-coded health status based on metric value and threshold
 */
export function getHealthStatus(
  metricValue: number,
  thresholds: { excellent: number; good: number; poor: number }
): 'excellent' | 'good' | 'poor' {
  if (metricValue >= thresholds.excellent) {
    return 'excellent';
  } else if (metricValue >= thresholds.good) {
    return 'good';
  } else {
    return 'poor';
  }
}

/**
 * Get color for health status
 */
export function getHealthColor(status: 'excellent' | 'good' | 'poor'): string {
  const colors = {
    excellent: 'bg-green-100 border-green-300 text-green-900',
    good: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    poor: 'bg-red-100 border-red-300 text-red-900',
  };
  return colors[status];
}

/**
 * Get badge text for health status
 */
export function getHealthBadgeText(status: 'excellent' | 'good' | 'poor'): string {
  const text = {
    excellent: 'Excellent',
    good: 'Good',
    poor: 'Needs Improvement',
  };
  return text[status];
}

/**
 * Calculate overall SLA compliance percentage
 * Compares each metric against thresholds and returns % of excellent ratings
 */
export function calculateSLACompliancePercentage(
  metrics: Record<string, number>,
  thresholds: Record<string, any>
): number {
  const metricNames = Object.keys(thresholds);
  if (metricNames.length === 0) return 0;

  const excellentCount = metricNames.filter((name) => {
    const value = metrics[name] || 0;
    return value >= thresholds[name].excellent;
  }).length;

  return Math.round((excellentCount / metricNames.length) * 100);
}
