import { App, Alert } from '@/src/types';
import { alertsApi, metricsApi } from '@/src/api/services';

export async function getFilteredAlerts(selectedAppIds: string[]) {
  try {
    const isAllApps = selectedAppIds.length === 0;

    if (isAllApps) {
      // Get all alerts
      const response = await alertsApi.getAll();
      return response.data || [];
    } else {
      // Get alerts for selected apps
      const alertPromises = selectedAppIds.map((appId) =>
        alertsApi.getByApp(appId)
          .then((res) => res.data || [])
          .catch(() => [])
      );
      const alertArrays = await Promise.all(alertPromises);
      return alertArrays.flat();
    }
  } catch (error) {
    console.error('[v0] Error fetching alerts:', error);
    return [];
  }
}

export async function getFilteredMetrics(selectedAppIds: string[]) {
  try {
    const isAllApps = selectedAppIds.length === 0;

    if (isAllApps) {
      // This would need a getAllMetrics endpoint
      // For now, return empty since we're transitioning to API
      return [];
    } else {
      // Get metrics for selected apps
      const metricsPromises = selectedAppIds.map((appId) =>
        metricsApi.getByApp(appId)
          .then((res) => res || [])
          .catch(() => [])
      );
      const metricsArrays = await Promise.all(metricsPromises);
      return metricsArrays.flat();
    }
  } catch (error) {
    console.error('[v0] Error fetching metrics:', error);
    return [];
  }
}
