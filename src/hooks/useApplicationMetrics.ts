'use client';

import useSWR from 'swr';
import { useMemo } from 'react';

export interface EvaluationMetric {
  faithfulness: number;
  answer_relevancy: number;
  context_relevancy: number;
  context_precision: number;
  context_recall: number;
  correctness: number;
  overall_score: number;
}

export interface EvaluationRecord {
  _id: string;
  applicationId: string;
  query: string;
  response: string;
  retrievedDocuments: any[];
  evaluation: EvaluationMetric;
  evaluatedAt: string;
  status: string;
}

interface MetricsAggregation {
  averageMetrics: EvaluationMetric;
  recordCount: number;
  healthyRecords: number;
  warningRecords: number;
  criticalRecords: number;
  slaCompliance: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch');
  }
  return res.json();
};

export function useApplicationMetrics(applicationId: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  
  // Fetch evaluation records for the application
  const { data: recordsData, error: recordsError, isLoading: recordsLoading } = useSWR(
    applicationId ? `${apiUrl}/api/applications/${applicationId}/records` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  // Calculate aggregated metrics from records
  const aggregatedMetrics = useMemo(() => {
    if (!recordsData?.data?.records || recordsData.data.records.length === 0) {
      return null;
    }

    const records = recordsData.data.records as EvaluationRecord[];
    const count = records.length;

    // Calculate average metrics
    const avgMetrics = {
      faithfulness: records.reduce((sum, r) => sum + (r.evaluation?.faithfulness || 0), 0) / count,
      answer_relevancy: records.reduce((sum, r) => sum + (r.evaluation?.answer_relevancy || 0), 0) / count,
      context_relevancy: records.reduce((sum, r) => sum + (r.evaluation?.context_relevancy || 0), 0) / count,
      context_precision: records.reduce((sum, r) => sum + (r.evaluation?.context_precision || 0), 0) / count,
      context_recall: records.reduce((sum, r) => sum + (r.evaluation?.context_recall || 0), 0) / count,
      correctness: records.reduce((sum, r) => sum + (r.evaluation?.correctness || 0), 0) / count,
      overall_score: records.reduce((sum, r) => sum + (r.evaluation?.overall_score || 0), 0) / count,
    };

    // Count records by health
    const healthyRecords = records.filter(r => (r.evaluation?.overall_score || 0) >= 70).length;
    const warningRecords = records.filter(r => {
      const score = r.evaluation?.overall_score || 0;
      return score >= 50 && score < 70;
    }).length;
    const criticalRecords = records.filter(r => (r.evaluation?.overall_score || 0) < 50).length;

    const slaCompliance = (healthyRecords / count) * 100;

    return {
      averageMetrics: avgMetrics,
      recordCount: count,
      healthyRecords,
      warningRecords,
      criticalRecords,
      slaCompliance,
    } as MetricsAggregation;
  }, [recordsData]);

  return {
    records: recordsData?.data?.records || [],
    metrics: aggregatedMetrics,
    isLoading: recordsLoading,
    error: recordsError,
  };
}
