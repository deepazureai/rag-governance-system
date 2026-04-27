import useSWR from 'swr';
import { useState } from 'react';

interface GovernanceMetrics {
  applicationId: string;
  applicationName: string;
  avgResponseLatency: number;
  p95Latency: number;
  throughputQueriesPerMin: number;
  errorRate: number;
  complianceRate: number;
  totalTokensUsed: number;
  uniqueUsers: number;
  metricCompliance: Record<string, number>;
  ragaMetricsAverages: Record<string, number>;
  calculatedAt: string;
}

export function useGovernanceMetrics(applicationId: string | null, enabled: boolean = true) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, error, mutate } = useSWR<{ success: boolean; data: GovernanceMetrics }>(
    enabled && applicationId ? `/api/governance-metrics/ai-activity/${applicationId}/latest` : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch governance metrics');
      return res.json();
    },
    { revalidateOnFocus: false }
  );

  const refreshMetrics = async () => {
    if (!applicationId) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/governance-metrics/ai-activity/${applicationId}/calculate`, {
        method: 'POST',
      });
      if (res.ok) {
        await mutate();
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  return {
    metrics: data?.data || null,
    isLoading: !error && !data,
    isError: !!error,
    error,
    refreshMetrics,
    isRefreshing,
  };
}
