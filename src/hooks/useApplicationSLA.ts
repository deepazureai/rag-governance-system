'use client';

import useSWR from 'swr';
import { useCallback } from 'react';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useApplicationSLA(applicationId: string | undefined) {
  // Fetch application SLA configuration
  const { data, error, isLoading, mutate } = useSWR(
    applicationId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/applications/${applicationId}/sla` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  const slaConfig = data?.data || null;
  const isError = !!error;

  // Mutate to refresh SLA data
  const refreshSLA = useCallback(async () => {
    await mutate();
  }, [mutate]);

  // Update SLA settings
  const updateSLA = useCallback(
    async (metrics: any, overallScoreThresholds: any) => {
      if (!applicationId) return null;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/applications/${applicationId}/sla`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ metrics, overallScoreThresholds }),
          }
        );

        const result = await response.json();

        if (result.success) {
          await mutate();
        }

        return result;
      } catch (err: any) {
        console.error('[useApplicationSLA] Update error:', err);
        return { success: false, error: err.message };
      }
    },
    [applicationId, mutate]
  );

  // Reset to industry defaults
  const resetToDefaults = useCallback(async () => {
    if (!applicationId) return null;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/applications/${applicationId}/sla`,
        {
          method: 'DELETE',
        }
      );

      const result = await response.json();

      if (result.success) {
        await mutate();
      }

      return result;
    } catch (err: any) {
      console.error('[useApplicationSLA] Reset error:', err);
      return { success: false, error: err.message };
    }
  }, [applicationId, mutate]);

  // Get industry standard defaults
  const { data: defaultsData } = useSWR(
    applicationId ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/applications/${applicationId}/sla/defaults` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 3600000, // Cache for 1 hour
    }
  );

  const industryDefaults = defaultsData?.data || null;

  return {
    slaConfig,
    industryDefaults,
    isLoading,
    isError,
    refreshSLA,
    updateSLA,
    resetToDefaults,
  };
}
