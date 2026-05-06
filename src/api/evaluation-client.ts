import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

export const evaluationClient = {
  /**
   * Evaluate a single record
   */
  async evaluateRecord(applicationId: string, recordId: string) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/evaluations/evaluate/${applicationId}/${recordId}`
      );
      return response.data;
    } catch (error: any) {
      console.error('[Evaluation] Failed to evaluate record:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Evaluate multiple records in batch
   */
  async evaluateBatch(applicationId: string, recordIds: string[]) {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/evaluations/evaluate-batch/${applicationId}`,
        { recordIds }
      );
      return response.data;
    } catch (error: any) {
      console.error('[Evaluation] Failed to batch evaluate:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Queue records for evaluation
   */
  async queueEvaluation(applicationId: string, recordIds: string[], priority: 'critical' | 'high' | 'medium' | 'low' = 'medium') {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/evaluations/queue-evaluation/${applicationId}`,
        { recordIds, priority }
      );
      return response.data;
    } catch (error: any) {
      console.error('[Evaluation] Failed to queue evaluation:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Get available metrics
   */
  async getMetrics() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/evaluations/metrics`);
      return response.data.metrics;
    } catch (error: any) {
      console.error('[Evaluation] Failed to get metrics:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Check DeepEval service health
   */
  async healthCheck() {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/evaluations/health`);
      return response.data.success;
    } catch (error: any) {
      console.error('[Evaluation] Health check failed:', error.message);
      return false;
    }
  },
};
