const axios = require('axios');
const https = require('https');
const retry = require('../common/retry');

class SplunkConnector {
  constructor(config) {
    this.config = config;
    this.sessionToken = null;
  }

  _getHttpsAgent() {
    return new https.Agent({
      rejectUnauthorized: !this.config.insecureSkipVerify,
    });
  }

  async _authenticate() {
    if (this.sessionToken) {
      return this.sessionToken;
    }

    try {
      const response = await axios.post(
        `${this.config.baseUrl}/services/auth/login`,
        `username=${this.config.username}&password=${this.config.password}`,
        {
          httpsAgent: this._getHttpsAgent(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const xml = require('xml2js');
      const parser = new xml.Parser();
      const result = await parser.parseStringPromise(response.data);
      this.sessionToken = result.response.sessionKey[0];

      return this.sessionToken;
    } catch (err) {
      throw new Error(`Splunk authentication failed: ${err.message}`);
    }
  }

  async testConnection() {
    try {
      await retry(() => this._authenticate());
      return { success: true, message: 'Connection successful' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async executeSearch(spl, timeRange = '-24h@h') {
    try {
      const token = await this._authenticate();

      const response = await axios.post(
        `${this.config.baseUrl}/services/search/jobs`,
        `search=${encodeURIComponent(spl)}&earliest_time=${timeRange}&output_mode=json`,
        {
          httpsAgent: this._getHttpsAgent(),
          headers: {
            Authorization: `Splunk ${token}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const jobId = response.data.sid;
      return await this._getSearchResults(jobId, token);
    } catch (err) {
      throw new Error(`Search execution failed: ${err.message}`);
    }
  }

  async _getSearchResults(jobId, token) {
    try {
      let isReady = false;
      let attempts = 0;
      const maxAttempts = 60;

      while (!isReady && attempts < maxAttempts) {
        const statusResponse = await axios.get(
          `${this.config.baseUrl}/services/search/jobs/${jobId}?output_mode=json`,
          {
            httpsAgent: this._getHttpsAgent(),
            headers: {
              Authorization: `Splunk ${token}`,
            },
          }
        );

        isReady = statusResponse.data.entry[0].content.isDone;
        if (!isReady) {
          await new Promise(r => setTimeout(r, 1000));
        }
        attempts++;
      }

      const resultsResponse = await axios.get(
        `${this.config.baseUrl}/services/search/jobs/${jobId}/results?output_mode=json&count=0`,
        {
          httpsAgent: this._getHttpsAgent(),
          headers: {
            Authorization: `Splunk ${token}`,
          },
        }
      );

      return resultsResponse.data.results;
    } catch (err) {
      throw new Error(`Failed to get search results: ${err.message}`);
    }
  }
}

module.exports = SplunkConnector;
