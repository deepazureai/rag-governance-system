'use client';

import { EvaluationRecord, EvaluationMetric } from '@/src/hooks/useApplicationMetrics';

/**
 * Group evaluation records by user_id
 */
export function groupRecordsByUser(records: EvaluationRecord[]): Record<string, EvaluationRecord[]> {
  return records.reduce((groups, record) => {
    const userId = record.userId || 'Unknown';
    if (!groups[userId]) {
      groups[userId] = [];
    }
    groups[userId].push(record);
    return groups;
  }, {} as Record<string, EvaluationRecord[]>);
}

/**
 * Calculate metrics for a user
 */
export function calculateUserMetrics(records: EvaluationRecord[]): {
  userId: string;
  metrics: EvaluationMetric;
  recordCount: number;
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  slaCompliance: number;
} {
  if (records.length === 0) {
    return {
      userId: 'Unknown',
      metrics: {
        faithfulness: 0,
        answer_relevancy: 0,
        context_relevancy: 0,
        context_precision: 0,
        context_recall: 0,
        correctness: 0,
        overall_score: 0,
      },
      recordCount: 0,
      healthyCount: 0,
      warningCount: 0,
      criticalCount: 0,
      slaCompliance: 0,
    };
  }

  const userId = records[0].userId || 'Unknown';
  
  // Calculate averages
  const avgMetrics: EvaluationMetric = {
    faithfulness: 0,
    answer_relevancy: 0,
    context_relevancy: 0,
    context_precision: 0,
    context_recall: 0,
    correctness: 0,
    overall_score: 0,
  };

  let healthyCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  records.forEach((record) => {
    const score = record.evaluation?.overall_score || 0;
    
    if (score >= 70) healthyCount++;
    else if (score >= 50) warningCount++;
    else criticalCount++;

    Object.keys(avgMetrics).forEach((key) => {
      avgMetrics[key as keyof EvaluationMetric] += (record.evaluation?.[key as keyof EvaluationMetric] || 0) / records.length;
    });
  });

  const slaCompliance = (healthyCount / records.length) * 100;

  return {
    userId,
    metrics: avgMetrics,
    recordCount: records.length,
    healthyCount,
    warningCount,
    criticalCount,
    slaCompliance,
  };
}

/**
 * Get all unique user IDs from records
 */
export function getUniqueUsers(records: EvaluationRecord[]): string[] {
  const users = new Set<string>();
  records.forEach((record) => {
    if (record.userId) {
      users.add(record.userId);
    }
  });
  return Array.from(users).sort();
}

/**
 * Filter records by user_id
 */
export function filterRecordsByUser(records: EvaluationRecord[], userId: string): EvaluationRecord[] {
  return records.filter((record) => (record.userId || 'Unknown') === userId);
}
