'use client';

import { useState, useCallback } from 'react';

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
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('[v0] Fetching metrics for apps:', applicationIds);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metrics/fetch-multiple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[v0] Metrics fetched:', data);

      setMetrics(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[v0] Metrics fetch error:', errorMessage);
      setError(errorMessage);
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshMetrics = useCallback(async (applicationIds: string[]) => {
    if (applicationIds.length === 0) {
      setMetrics(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      logger.info('[v0] Refreshing metrics for apps:', applicationIds);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metrics/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds }),
      });

      if (!response.ok) {
        throw new Error(`Failed to refresh metrics: ${response.statusText}`);
      }

      const data = await response.json();
      logger.info('[v0] Metrics refreshed:', data);

      setMetrics(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      logger.error('[v0] Metrics refresh error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { metrics, isLoading, error, fetchMetrics, refreshMetrics };
}
