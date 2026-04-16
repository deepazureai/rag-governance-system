const { Pool } = require('pg');
const { DefaultAzureCredential } = require('@azure/identity');
const retry = require('../common/retry');

class PostgresConnector {
  constructor(config) {
    this.config = config;
    this.pool = null;
  }

  async _getAccessToken() {
    if (this.config.useManagedIdentity) {
      const credential = new DefaultAzureCredential();
      const token = await credential.getToken('https://ossrdbms-aad.database.windows.net/.default');
      return token.token;
    }
    return null;
  }

  async _getPool() {
    if (this.pool) {
      return this.pool;
    }

    let pgConfig = {
      host: this.config.host,
      port: this.config.port || 5432,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      max: this.config.poolSize || 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };

    if (this.config.useManagedIdentity) {
      const token = await this._getAccessToken();
      pgConfig.password = token;
      pgConfig.user = this.config.user || 'postgres';
    }

    this.pool = new Pool(pgConfig);
    return this.pool;
  }

  async testConnection() {
    try {
      const pool = await retry(() => this._getPool());
      const client = await pool.connect();
      const result = await client.query('SELECT 1');
      client.release();
      return { success: true, message: 'Connection successful' };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  async fetchSchema() {
    try {
      const pool = await this._getPool();
      const result = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `);
      return result.rows;
    } catch (err) {
      throw new Error(`Schema fetch failed: ${err.message}`);
    }
  }

  async fetchData(query, batchSize = 1000) {
    try {
      const pool = await this._getPool();
      const result = await pool.query(query);
      return result.rows;
    } catch (err) {
      throw new Error(`Data fetch failed: ${err.message}`);
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

module.exports = PostgresConnector;
