'use client';

import { useState, useCallback } from 'react';
import { getFetchErrorMessage } from '@/src/utils/apiErrorHandler';

const logger = {
  info: (msg: string, data?: any) => console.log(`[v0] ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`[v0] ${msg}`, data),
};

export interface MetricsData {
  groundedness: number;
  coherence: number;
  relevance: number;
  faithfulness: number;
  answerRelevancy: number;
  contextPrecision: number;
  contextRecall: number;
  timestamp: string;
}

export interface MetricsResponse {
  type: 'single' | 'aggregated' | 'empty';
  metrics?: MetricsData;
  applicationCount?: number;
}

export function useMetricsFetch() {
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (applicationIds: string[]) => {
    if (applicationIds.length === 0) {
      setMetrics(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('[v0] Fetching metrics for apps:', applicationIds);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/metrics/fetch-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[v0] Metrics fetched:', data);

      if (data.success) {
        setMetrics(data.data);
      } else {
        const errorMsg = data.message || 'Failed to fetch metrics';
        setError(errorMsg);
        setMetrics(null);
      }
    } catch (err) {
      const errorMsg = getFetchErrorMessage(err, 'fetch metrics from selected applications');
      logger.error('[v0] Metrics fetch error:', err);
      setError(errorMsg);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshMetrics = useCallback(async (applicationIds: string[]) => {
    if (applicationIds.length === 0) {
      setMetrics(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('[v0] Refreshing metrics for apps:', applicationIds);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiUrl}/api/metrics/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[v0] Metrics refreshed:', data);

      if (data.success) {
        setMetrics(data.data);
      } else {
        const errorMsg = data.message || 'Failed to refresh metrics';
        setError(errorMsg);
        setMetrics(null);
      }
    } catch (err) {
      const errorMsg = getFetchErrorMessage(err, 'refresh metrics for selected applications');
      logger.error('[v0] Metrics refresh error:', err);
      setError(errorMsg);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { metrics, isLoading, error, fetchMetrics, refreshMetrics };
}
