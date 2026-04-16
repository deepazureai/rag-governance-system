const sql = require('mssql');
const { DefaultAzureCredential } = require('@azure/identity');
const retry = require('../common/retry');

class SqlConnector {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  async _getAccessToken() {
    const credential = new DefaultAzureCredential();
    const tokenResponse = await credential.getToken(
      'https://database.windows.net/.default'
    );
    return tokenResponse.token;
  }

  async _getConnection() {
    if (this.pool) {
      return this.pool;
    }

    const token = await this._getAccessToken();
    this.pool = await sql.connect({
      server: this.config.server,
      database: this.config.database,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        connectTimeout: 30000,
      },
      authentication: {
        type: 'azure-active-directory-access-token',
        options: {
          token: token,
        },
      },
    });

    return this.pool;
  }

  async testConnection() {
    try {
      const pool = await retry(() => this._getConnection());
      const result = await pool.request().query('SELECT 1 as test');
      return { success: true, message: 'Connection successful' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async fetchSchema() {
    try {
      const pool = await this._getConnection();
      const result = await pool.request().query(`
        SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = 'dbo'
        ORDER BY TABLE_NAME, ORDINAL_POSITION
      `);
      return result.recordset;
    } catch (err) {
      throw new Error(`Schema fetch failed: ${err.message}`);
    }
  }

  async fetchData(query, batchSize = 1000) {
    try {
      const pool = await this._getConnection();
      const result = await pool.request().query(query);
      return result.recordset;
    } catch (err) {
      throw new Error(`Data fetch failed: ${err.message}`);
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}

module.exports = SqlConnector;
