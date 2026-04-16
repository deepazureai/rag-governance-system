const { DefaultAzureCredential } = require('@azure/identity');
const axios = require('axios');
const retry = require('../common/retry');

class AzureMonitorConnector {
  constructor(config) {
    this.config = config;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async _getAccessToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken('https://api.loganalytics.io/.default');
    this.accessToken = tokenResponse.token;
    this.tokenExpiry = tokenResponse.expiresOnTimestamp * 1000;

    return this.accessToken;
  }

  async testConnection() {
    try {
      const token = await retry(() => this._getAccessToken());
      const response = await axios.get(
        `https://api.loganalytics.io/v1/workspaces/${this.config.workspaceId}/query`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            query: 'print 1 | limit 1',
            timespan: 'PT1H',
          },
        }
      );
      return { success: true, message: 'Connection successful' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async executeQuery(kuqlQuery, timespan = 'PT24H') {
    try {
      const token = await this._getAccessToken();
      const response = await axios.post(
        `https://api.loganalytics.io/v1/workspaces/${this.config.workspaceId}/query`,
        {
          query: kuqlQuery,
          timespan: timespan,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.tables[0]?.rows || [];
    } catch (err) {
      throw new Error(`Query execution failed: ${err.message}`);
    }
  }

  async fetchAvailableTables() {
    try {
      const query = `
        search "*"
        | distinct $table
        | limit 100
      `;
      const results = await this.executeQuery(query);
      return results.map(r => r[0]);
    } catch (err) {
      throw new Error(`Failed to fetch tables: ${err.message}`);
    }
  }
}

module.exports = AzureMonitorConnector;
