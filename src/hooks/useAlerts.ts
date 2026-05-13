'use client';

import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Alert, AlertThresholdConfig, MetricThreshold, INDUSTRY_STANDARD_THRESHOLDS } from '@/src/types/index';

// Construct API_BASE_URL for alert thresholds (uses Next.js proxy)
const ALERT_THRESHOLDS_API_URL = '/api/alert-thresholds';

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
        console.log('[v0] Loading thresholds from cache for appId:', appId);
        return thresholdCache[appId];
      }

      const endpoint = `${ALERT_THRESHOLDS_API_URL}/app/${appId}`;
      console.log('[v0] Fetching thresholds from:', endpoint);
      
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        console.warn(`[v0] Failed to load thresholds for app ${appId}, using defaults`);
        return INDUSTRY_STANDARD_THRESHOLDS;
      }
      
      const data = await response.json();
      console.log('[v0] Thresholds response:', { success: data.success, hasData: !!data.data });

      if (data.success && data.data) {
        setThresholdCache((prev) => ({ ...prev, [appId]: data.data }));
        return data.data;
      }

      // Fallback to defaults
      console.warn('[v0] Thresholds response invalid, using defaults');
      return INDUSTRY_STANDARD_THRESHOLDS;
    } catch (err) {
      console.error('[v0] Error loading thresholds:', err);
      // Return defaults on error instead of throwing
      return INDUSTRY_STANDARD_THRESHOLDS;
    }
  }, [thresholdCache]);

  // Calculate alerts for a single app (client-side)
  const calculateAlertsForApp = useCallback(
    async (appId: string, metrics: Record<string, number>) => {
      try {
        setIsLoading(true);
        
        // Load thresholds for this app
        const thresholds = await loadThresholds(appId);
        
        // Calculate alerts by comparing metrics to thresholds
        const newAlerts: Alert[] = [];
        const metricKeys = Object.keys(metrics);
        
        for (const metricKey of metricKeys) {
          const metricValue = metrics[metricKey];
          // Get threshold config for this metric key
          const threshold = thresholds[metricKey as keyof typeof thresholds] as MetricThreshold | undefined;
          
          if (!threshold) continue;
          
          // Check if metric is below critical threshold
          if (metricValue < threshold.critical) {
            newAlerts.push({
              id: uuidv4(),
              appId,
              metricName: metricKey,
              severity: 'critical',
              message: `${metricKey} is critically low: ${metricValue.toFixed(2)} (threshold: ${threshold.critical})`,
              resolved: false,
              timestamp: new Date().toISOString(),
              metricValue,
              threshold: threshold.critical,
            });
          }
          // Check if metric is below warning threshold
          else if (metricValue < threshold.warning) {
            newAlerts.push({
              id: uuidv4(),
              appId,
              metricName: metricKey,
              severity: 'warning',
              message: `${metricKey} is below target: ${metricValue.toFixed(2)} (threshold: ${threshold.warning})`,
              resolved: false,
              timestamp: new Date().toISOString(),
              metricValue,
              threshold: threshold.warning,
            });
          }
        }
        
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
