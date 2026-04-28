const axios = require('axios');
const retry = require('../common/retry');

class DatadogConnector {
  constructor(config) {
    this.config = config;
    this.apiClient = null;
  }

  _getApiClient() {
    if (this.apiClient) {
      return this.apiClient;
    }

    const baseUrl = this.config.site === 'eu' 
      ? 'https://api.datadoghq.eu' 
      : 'https://api.datadoghq.com';

    this.apiClient = axios.create({
      baseURL: baseUrl,
      headers: {
        'DD-API-KEY': this.config.apiKey,
        'DD-APPLICATION-KEY': this.config.appKey,
      },
    });

    return this.apiClient;
  }

  async testConnection() {
    try {
      const client = await retry(() => this._getApiClient());
      const response = await client.get('/api/v1/validate');
      return { success: true, message: 'Connection successful' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async queryMetrics(query, fromTime, toTime) {
    try {
      const client = this._getApiClient();
      const response = await client.get('/api/v1/query', {
        params: {
          query: query,
          from: Math.floor(fromTime.getTime() / 1000),
          to: Math.floor(toTime.getTime() / 1000),
        },
      });

      return response.data.series || [];
    } catch (err) {
      throw new Error(`Metric query failed: ${err.message}`);
    }
  }

  async queryLogs(filterQuery, fromTime, toTime, limit = 100) {
    try {
      const client = this._getApiClient();
      
      const response = await client.post('/api/v2/logs/list', {
        filter: {
          from: fromTime.toISOString(),
          to: toTime.toISOString(),
          query: filterQuery,
        },
        page: {
          limit: limit,
        },
      });

      return response.data.data || [];
    } catch (err) {
      throw new Error(`Log query failed: ${err.message}`);
    }
  }

  async getMonitors(query = '') {
    try {
      const client = this._getApiClient();
      const response = await client.get('/api/v1/monitor', {
        params: {
          name: query,
        },
      });

      return response.data;
    } catch (err) {
      throw new Error(`Failed to fetch monitors: ${err.message}`);
    }
  }
}

module.exports = DatadogConnector;
