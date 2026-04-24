import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const batchClient = {
  /**
   * Execute batch processing manually
   */
  async executeBatch(applicationId: string, connectionId: string, sourceType: string, sourceConfig: any) {
    const response = await axios.post(`${API_BASE_URL}/batch/execute`, {
      applicationId,
      connectionId,
      sourceType,
      sourceConfig,
    });
    return response.data;
  },

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string) {
    const response = await axios.get(`${API_BASE_URL}/batch/${batchId}/status`);
    return response.data;
  },

  /**
   * Get batch history for application
   */
  async getBatchHistory(applicationId: string, limit: number = 10) {
    const response = await axios.get(
      `${API_BASE_URL}/batch/application/${applicationId}/history?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Create scheduled batch job
   */
  async createScheduledJob(
    applicationId: string,
    connectionId: string,
    schedule: any,
    sourceConfig: any
  ) {
    const response = await axios.post(`${API_BASE_URL}/batch/schedule`, {
      applicationId,
      connectionId,
      schedule,
      sourceConfig,
    });
    return response.data;
  },

  /**
   * Get scheduled job
   */
  async getScheduledJob(jobId: string) {
    const response = await axios.get(`${API_BASE_URL}/batch/schedule/${jobId}`);
    return response.data;
  },

  /**
   * Get all scheduled jobs for application
   */
  async getApplicationScheduledJobs(applicationId: string) {
    const response = await axios.get(
      `${API_BASE_URL}/batch/schedule/application/${applicationId}`
    );
    return response.data;
  },

  /**
   * Update scheduled job
   */
  async updateScheduledJob(jobId: string, updates: any) {
    const response = await axios.put(`${API_BASE_URL}/batch/schedule/${jobId}`, updates);
    return response.data;
  },

  /**
   * Toggle scheduled job enabled/disabled
   */
  async toggleScheduledJob(jobId: string, isEnabled: boolean) {
    const response = await axios.patch(`${API_BASE_URL}/batch/schedule/${jobId}/toggle`, {
      isEnabled,
    });
    return response.data;
  },

  /**
   * Delete scheduled job
   */
  async deleteScheduledJob(jobId: string) {
    const response = await axios.delete(`${API_BASE_URL}/batch/schedule/${jobId}`);
    return response.data;
  },

  /**
   * Manually trigger a scheduled job
   */
  async triggerScheduledJob(jobId: string) {
    const response = await axios.post(`${API_BASE_URL}/batch/schedule/${jobId}/trigger`);
    return response.data;
  },

  /**
   * Get archive data
   */
  async getArchiveData(archiveId: string) {
    const response = await axios.get(`${API_BASE_URL}/batch/archive/${archiveId}`);
    return response.data;
  },

  /**
   * Get archives for application
   */
  async getApplicationArchives(applicationId: string, limit: number = 30) {
    const response = await axios.get(
      `${API_BASE_URL}/batch/archive/application/${applicationId}?limit=${limit}`
    );
    return response.data;
  },

  /**
   * Cleanup expired archives
   */
  async cleanupExpiredArchives() {
    const response = await axios.post(`${API_BASE_URL}/batch/cleanup`);
    return response.data;
  },
};
