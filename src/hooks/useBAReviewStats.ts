'use client';

import { useState, useEffect, useCallback } from 'react';

interface BAReviewStats {
  criticalCount: number;
  pendingCount: number;
  totalItems: number;
  averagePriorityScore: number;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
}

interface UseBAReviewStatsResult {
  stats: BAReviewStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultStats: BAReviewStats = {
  criticalCount: 0,
  pendingCount: 0,
  totalItems: 0,
  averagePriorityScore: 0,
  statusBreakdown: {},
  priorityBreakdown: {},
};

/**
 * Hook to fetch and manage BA Review Queue statistics
 * Fetches real aggregated stats from backend for display
 */
export function useBAReviewStats(applicationId: string | null): UseBAReviewStatsResult {
  const [stats, setStats] = useState<BAReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (): Promise<void> => {
    try {
      if (!applicationId) {
        console.log('[v0] useBAReviewStats: No applicationId provided');
        setStats(defaultStats);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/ba-review/stats/${applicationId}`);

      if (!response.ok) {
        // Handle 404 gracefully (endpoint may not be populated yet)
        if (response.status === 404) {
          console.log('[v0] useBAReviewStats: Queue stats endpoint not found');
          setStats(defaultStats);
          setIsLoading(false);
          return;
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        console.log('[v0] useBAReviewStats: Stats loaded', {
          critical: result.data.criticalCount,
          pending: result.data.pendingCount,
          total: result.data.totalItems,
        });
        setStats(result.data as BAReviewStats);
      } else {
        throw new Error('Invalid response format from stats endpoint');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch stats';
      console.error('[v0] useBAReviewStats error:', message);
      setError(message);
      setStats(defaultStats); // Fallback to defaults on error
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    if (applicationId) {
      fetchStats();
    }
  }, [applicationId, fetchStats]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
}
