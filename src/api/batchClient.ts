import axios from 'axios';

// Construct API_BASE_URL ensuring it has /api path
let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

// Ensure /api is appended if not already present
if (!apiUrl.endsWith('/api')) {
  apiUrl = apiUrl + '/api';
}

const API_BASE_URL = apiUrl;

console.log('[v0] batchClient API_BASE_URL:', API_BASE_URL);

export const batchClient = {
  /**
   * Execute batch processing manually
   */
  async executeBatch(applicationId: string, connectionId: string, sourceType: string, sourceConfig: any) {
    try {
      const url = `${API_BASE_URL}/batch/execute`;
      console.log('[v0] Calling batch execute with URL:', url);
      const response = await axios.post(url, {
        applicationId,
        connectionId,
        sourceType,
        sourceConfig,
      });
      return response.data;
    } catch (error: any) {
      console.log('[v0] Batch execute endpoint error:', error.message);
      return { success: false, batches: [] };
    }
  },

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string) {
    try {
      const url = `${API_BASE_URL}/batch/${batchId}/status`;
      console.log('[v0] Calling batch status with URL:', url);
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Batch status endpoint error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get batch history for application
   */
  async getBatchHistory(applicationId: string, limit: number = 10) {
    try {
      const url = `${API_BASE_URL}/batch/application/${applicationId}/history?limit=${limit}`;
      console.log('[v0] Calling batch history with URL:', url);
      const response = await axios.get(url, { validateStatus: () => true });
      
      if (!response.data || response.status >= 400) {
        return { success: true, batches: [], count: 0 };
      }
      
      return response.data;
    } catch (error: any) {
      console.log('[v0] Batch history error:', error.message);
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
      const url = `${API_BASE_URL}/batch/schedule`;
      console.log('[v0] Creating scheduled job with URL:', url);
      const response = await axios.post(url, {
        applicationId,
        connectionId,
        schedule,
        sourceConfig,
      });
      return response.data;
    } catch (error: any) {
      console.log('[v0] Create scheduled job error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get scheduled job
   */
  async getScheduledJob(jobId: string) {
    try {
      const url = `${API_BASE_URL}/batch/schedule/${jobId}`;
      console.log('[v0] Getting scheduled job with URL:', url);
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Get scheduled job error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get all scheduled jobs for application
   */
  async getApplicationScheduledJobs(applicationId: string) {
    try {
      const url = `${API_BASE_URL}/batch/schedule/application/${applicationId}`;
      console.log('[v0] Getting scheduled jobs with URL:', url);
      const response = await axios.get(url, { validateStatus: () => true });
      
      if (!response.data || response.status >= 400) {
        return { success: true, jobs: [], count: 0 };
      }
      
      return response.data;
    } catch (error: any) {
      console.log('[v0] Get scheduled jobs error:', error.message);
      return { success: true, jobs: [], count: 0 };
    }
  },

  /**
   * Update scheduled job
   */
  async updateScheduledJob(jobId: string, updates: any) {
    try {
      const url = `${API_BASE_URL}/batch/schedule/${jobId}`;
      console.log('[v0] Updating scheduled job with URL:', url);
      const response = await axios.put(url, updates);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Update scheduled job error:', error.message);
      return { success: false };
    }
  },

  /**
   * Toggle scheduled job enabled/disabled
   */
  async toggleScheduledJob(jobId: string, isEnabled: boolean) {
    try {
      const url = `${API_BASE_URL}/batch/schedule/${jobId}/toggle`;
      console.log('[v0] Toggling scheduled job with URL:', url);
      const response = await axios.patch(url, {
        isEnabled,
      });
      return response.data;
    } catch (error: any) {
      console.log('[v0] Toggle scheduled job error:', error.message);
      return { success: false };
    }
  },

  /**
   * Delete scheduled job
   */
  async deleteScheduledJob(jobId: string) {
    try {
      const url = `${API_BASE_URL}/batch/schedule/${jobId}`;
      console.log('[v0] Deleting scheduled job with URL:', url);
      const response = await axios.delete(url);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Delete scheduled job error:', error.message);
      return { success: false };
    }
  },

  /**
   * Manually trigger a scheduled job
   */
  async triggerScheduledJob(jobId: string) {
    try {
      const url = `${API_BASE_URL}/batch/schedule/${jobId}/trigger`;
      console.log('[v0] Triggering scheduled job with URL:', url);
      const response = await axios.post(url);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Trigger scheduled job error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get archive data
   */
  async getArchiveData(archiveId: string) {
    try {
      const url = `${API_BASE_URL}/batch/archive/${archiveId}`;
      console.log('[v0] Getting archive with URL:', url);
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Get archive error:', error.message);
      return { success: false };
    }
  },

  /**
   * Get archives for application
   */
  async getApplicationArchives(applicationId: string, limit: number = 30) {
    try {
      const url = `${API_BASE_URL}/batch/archive/application/${applicationId}?limit=${limit}`;
      console.log('[v0] Getting archives with URL:', url);
      const response = await axios.get(url);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Get archives error:', error.message);
      return { success: true, archives: [], count: 0 };
    }
  },

  /**
   * Cleanup expired archives
   */
  async cleanupExpiredArchives() {
    try {
      const url = `${API_BASE_URL}/batch/cleanup`;
      console.log('[v0] Cleaning up archives with URL:', url);
      const response = await axios.post(url);
      return response.data;
    } catch (error: any) {
      console.log('[v0] Cleanup archives error:', error.message);
      return { success: false };
    }
  },
};
