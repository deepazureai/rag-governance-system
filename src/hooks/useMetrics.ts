// React hook for using metrics in components
import { useEffect, useState } from 'react';
import { metricsClient } from '@/src/api/metricsClient';

export interface MetricData {
  name: string;
  unit: string;
  category: string;
  latest: number;
  average: number;
  min: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  history: Array<{ value: number; timestamp: Date }>;
}

export function useMetrics(applicationId: string, hours = 24) {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await metricsClient.getApplicationMetrics(applicationId, hours);
        if (response.success) {
          setMetrics(response.data);
        } else {
          setError(response.error || 'Failed to fetch metrics');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Poll for new metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [applicationId, hours]);

  const refreshMetrics = async () => {
    try {
      setLoading(true);
      await metricsClient.triggerMetricsFetch(applicationId);
      const response = await metricsClient.getApplicationMetrics(applicationId, hours);
      if (response.success) {
        setMetrics(response.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    metrics,
    loading,
    error,
    refreshMetrics,
  };
}

export function useMultipleAppMetrics(applicationIds: string[]) {
  const [metricsMap, setMetricsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (applicationIds.length === 0) {
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const response = await metricsClient.getMultipleAppMetrics(applicationIds);
        if (response.success) {
          setMetricsMap(response.data);
        } else {
          setError(response.error || 'Failed to fetch metrics');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();

    // Poll every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [applicationIds]);

  return {
    metricsMap,
    loading,
    error,
  };
}
