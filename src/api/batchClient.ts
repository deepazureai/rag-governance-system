import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

export const batchClient = {
  /**
   * Execute batch processing manually
   */
  async executeBatch(applicationId: string, connectionId: string, sourceType: string, sourceConfig: any) {
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/execute`, {
        applicationId,
        connectionId,
        sourceType,
        sourceConfig,
      });
      return response.data;
    } catch (error) {
      console.log('[v0] Batch execute endpoint not available');
      return { success: false, batches: [] };
    }
  },

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/batch/${batchId}/status`);
      return response.data;
    } catch (error) {
      console.log('[v0] Batch status endpoint not available');
      return { success: false };
    }
  },

  /**
   * Get batch history for application
   */
  async getBatchHistory(applicationId: string, limit: number = 10) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/batch/application/${applicationId}/history?limit=${limit}`,
        { validateStatus: () => true } // Don't throw on any status code
      );
      
      // If 404 or other error, return empty result
      if (!response.data || response.status >= 400) {
        return { success: true, batches: [], count: 0 };
      }
      
      return response.data;
    } catch (error) {
      return { success: true, batches: [], count: 0 };
    }
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
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/schedule`, {
        applicationId,
        connectionId,
        schedule,
        sourceConfig,
      });
      return response.data;
    } catch (error) {
      console.log('[v0] Create scheduled job endpoint not available');
      return { success: false };
    }
  },

  /**
   * Get scheduled job
   */
  async getScheduledJob(jobId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/batch/schedule/${jobId}`);
      return response.data;
    } catch (error) {
      console.log('[v0] Get scheduled job endpoint not available');
      return { success: false };
    }
  },

  /**
   * Get all scheduled jobs for application
   */
  async getApplicationScheduledJobs(applicationId: string) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/batch/schedule/application/${applicationId}`,
        { validateStatus: () => true } // Don't throw on any status code
      );
      
      // If 404 or other error, return empty result
      if (!response.data || response.status >= 400) {
        return { success: true, jobs: [], count: 0 };
      }
      
      return response.data;
    } catch (error) {
      return { success: true, jobs: [], count: 0 };
    }
  },

  /**
   * Update scheduled job
   */
  async updateScheduledJob(jobId: string, updates: any) {
    try {
      const response = await axios.put(`${API_BASE_URL}/batch/schedule/${jobId}`, updates);
      return response.data;
    } catch (error) {
      console.log('[v0] Update scheduled job endpoint not available');
      return { success: false };
    }
  },

  /**
   * Toggle scheduled job enabled/disabled
   */
  async toggleScheduledJob(jobId: string, isEnabled: boolean) {
    try {
      const response = await axios.patch(`${API_BASE_URL}/batch/schedule/${jobId}/toggle`, {
        isEnabled,
      });
      return response.data;
    } catch (error) {
      console.log('[v0] Toggle scheduled job endpoint not available');
      return { success: false };
    }
  },

  /**
   * Delete scheduled job
   */
  async deleteScheduledJob(jobId: string) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/batch/schedule/${jobId}`);
      return response.data;
    } catch (error) {
      console.log('[v0] Delete scheduled job endpoint not available');
      return { success: false };
    }
  },

  /**
   * Manually trigger a scheduled job
   */
  async triggerScheduledJob(jobId: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/schedule/${jobId}/trigger`);
      return response.data;
    } catch (error) {
      console.log('[v0] Trigger scheduled job endpoint not available');
      return { success: false };
    }
  },

  /**
   * Get archive data
   */
  async getArchiveData(archiveId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/batch/archive/${archiveId}`);
      return response.data;
    } catch (error) {
      console.log('[v0] Get archive data endpoint not available');
      return { success: false };
    }
  },

  /**
   * Get archives for application
   */
  async getApplicationArchives(applicationId: string, limit: number = 30) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/batch/archive/application/${applicationId}?limit=${limit}`
      );
      return response.data;
    } catch (error) {
      console.log('[v0] Get archives endpoint not available');
      return { success: true, archives: [], count: 0 };
    }
  },

  /**
   * Cleanup expired archives
   */
  async cleanupExpiredArchives() {
    try {
      const response = await axios.post(`${API_BASE_URL}/batch/cleanup`);
      return response.data;
    } catch (error) {
      console.log('[v0] Cleanup archives endpoint not available');
      return { success: false };
    }
  },
};
