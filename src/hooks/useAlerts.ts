'use client';

import { useState, useCallback, useEffect } from 'react';
import { Alert, AlertThresholdConfig, INDUSTRY_STANDARD_THRESHOLDS } from '@/src/types/index';
import { AlertCalculationEngine } from '@/backend/src/services/AlertCalculationEngine';

export interface UseAlertsReturn {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  calculateAlertsForApp: (appId: string, metrics: Record<string, number>) => Promise<Alert[]>;
  getAggregatedAlerts: () => Alert[];
  getAppAlerts: (appId: string) => Alert[];
  resolveAlert: (alertId: string) => Promise<void>;
  loadThresholds: (appId: string) => Promise<AlertThresholdConfig>;
}

export function useAlerts(): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thresholdCache, setThresholdCache] = useState<Record<string, AlertThresholdConfig>>({});

  // Load thresholds for an app
  const loadThresholds = useCallback(async (appId: string): Promise<AlertThresholdConfig> => {
    try {
      if (thresholdCache[appId]) {
        return thresholdCache[appId];
      }

      const response = await fetch(`/api/alert-thresholds/app/${appId}`);
      const data = await response.json();

      if (data.success) {
        setThresholdCache((prev) => ({ ...prev, [appId]: data.data }));
        return data.data;
      }

      // Fallback to defaults
      return INDUSTRY_STANDARD_THRESHOLDS;
    } catch (err) {
      console.error('[v0] Error loading thresholds:', err);
      return INDUSTRY_STANDARD_THRESHOLDS;
    }
  }, [thresholdCache]);

  // Calculate alerts for a single app
  const calculateAlertsForApp = useCallback(
    async (appId: string, metrics: Record<string, number>) => {
      try {
        setIsLoading(true);
        const thresholds = await loadThresholds(appId);
        const newAlerts = AlertCalculationEngine.generateAlertsForApp(appId, metrics, thresholds);
        
        // Update alerts: remove old ones from this app, add new ones
        setAlerts((prev) => {
          const otherAppAlerts = prev.filter((a) => a.appId !== appId);
          return [...otherAppAlerts, ...newAlerts];
        });

        setError(null);
        return newAlerts;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Error calculating alerts';
        console.error('[v0] Error calculating alerts:', err);
        setError(errorMsg);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [loadThresholds]
  );

  // Get all alerts
  const getAggregatedAlerts = useCallback(() => {
    return alerts;
  }, [alerts]);

  // Get alerts for specific app
  const getAppAlerts = useCallback(
    (appId: string) => {
      return alerts.filter((a) => a.appId === appId);
    },
    [alerts]
  );

  // Resolve an alert
  const resolveAlert = useCallback(async (alertId: string) => {
    try {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, resolved: true, resolvedAt: new Date().toISOString() } : a
        )
      );

      // TODO: Persist to backend when implemented
    } catch (err) {
      console.error('[v0] Error resolving alert:', err);
    }
  }, []);

  return {
    alerts,
    isLoading,
    error,
    calculateAlertsForApp,
    getAggregatedAlerts,
    getAppAlerts,
    resolveAlert,
    loadThresholds,
  };
}
