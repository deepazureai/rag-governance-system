import { mockMetrics, mockQueryPerformance, mockRelevanceScores, mockAlerts, mockGovernanceMetrics } from '@/src/data/mockData';
import { App } from '@/src/types';

export function getFilteredMetrics(selectedAppIds: string[], allApps: App[]) {
  const isAllApps = selectedAppIds.length === 0;
  
  // Filter apps
  const filteredApps = isAllApps
    ? allApps
    : allApps.filter((app) => selectedAppIds.includes(app.id));

  // Aggregate metrics - for simplicity, average the metric values
  const aggregatedMetrics = mockMetrics.map((metric) => ({
    ...metric,
    value: isAllApps
      ? metric.value
      : metric.value * (filteredApps.length / allApps.length), // Proportional scaling
  }));

  return {
    metrics: aggregatedMetrics,
    apps: filteredApps,
    appCount: filteredApps.length,
  };
}

export function getFilteredAlerts(selectedAppIds: string[], allApps: App[]) {
  const isAllApps = selectedAppIds.length === 0;
  const filteredAppIds = isAllApps ? allApps.map((app) => app.id) : selectedAppIds;

  return mockAlerts.filter((alert) => filteredAppIds.includes(alert.appId));
}

export function getFilteredGovernanceMetrics(selectedAppIds: string[]) {
  // Governance metrics are typically system-wide, but we can show them conditionally
  // when specific apps are selected vs all apps
  if (selectedAppIds.length === 0) {
    // All apps - show full metrics
    return mockGovernanceMetrics;
  } else {
    // Selected apps - scale metrics based on app count
    const scaleFactor = selectedAppIds.length / 3; // Assuming 3 apps in mock data
    return mockGovernanceMetrics.map((metric) => ({
      ...metric,
      value: Math.round(metric.value * scaleFactor),
    }));
  }
}
