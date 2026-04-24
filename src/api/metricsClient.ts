// Frontend API client for metrics
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const metricsClient = {
  // Get aggregated metrics for a single application
  async getApplicationMetrics(applicationId: string, hours = 24) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/applications/${applicationId}/metrics`,
        { params: { hours } }
      );
      return response.data;
    } catch (error: any) {
      console.error('[metricsClient] Error fetching metrics:', error.message);
      throw error;
    }
  },

  // Get metrics for multiple applications
  async getMultipleAppMetrics(applicationIds: string[]) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/metrics/batch`,
        { applicationIds }
      );
      return response.data;
    } catch (error: any) {
      console.error('[metricsClient] Error fetching metrics:', error.message);
      throw error;
    }
  },

  // Trigger manual metrics fetch
  async triggerMetricsFetch(applicationId: string) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/applications/${applicationId}/metrics/fetch`
      );
      return response.data;
    } catch (error: any) {
      console.error('[metricsClient] Error triggering fetch:', error.message);
      throw error;
    }
  },

  // Get metrics history for date range
  async getMetricsHistory(
    applicationId: string,
    startDate: Date,
    endDate: Date
  ) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/applications/${applicationId}/metrics/history`,
        {
          params: {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        }
      );
      return response.data;
    } catch (error: any) {
      console.error('[metricsClient] Error fetching history:', error.message);
      throw error;
    }
  },
};
