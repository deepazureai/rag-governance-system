const Connection = require('../models/Connection');
const { getConnectorInstance } = require('../connectors');
const { ApiError } = require('../utils/errors');

class ConnectionsService {
  async createConnection(data) {
    const connection = new Connection(data);
    const saved = await connection.save();
    
    // Return safe version without full credentials
    return this._sanitizeConnection(saved);
  }

  async getConnectionsByApp(appId) {
    const connections = await Connection.find({ appId });
    return connections.map(conn => this._sanitizeConnection(conn));
  }

  async getConnection(connectionId) {
    const connection = await Connection.findById(connectionId);
    return connection ? this._sanitizeConnection(connection) : null;
  }

  async updateConnection(connectionId, updateData) {
    const connection = await Connection.findByIdAndUpdate(
      connectionId,
      updateData,
      { new: true }
    );
    return connection ? this._sanitizeConnection(connection) : null;
  }

  async deleteConnection(connectionId) {
    const result = await Connection.findByIdAndDelete(connectionId);
    return !!result;
  }

  async testConnection(connectionId) {
    try {
      const connection = await Connection.findById(connectionId);
      
      if (!connection) {
        throw new ApiError(404, 'Connection not found');
      }

      // Get connector based on type
      const connector = getConnectorInstance(connection.type);
      
      // Test connection using appropriate connector
      const testResult = await connector.testConnection({
        credentials: connection.credentials,
        config: connection.metadata,
      });

      // Update last tested timestamp
      connection.lastTested = new Date();
      connection.status = testResult.success ? 'active' : 'inactive';
      await connection.save();

      return testResult;
    } catch (error) {
      throw new ApiError(500, `Test connection failed: ${error.message}`);
    }
  }

  async getConnectionStatus(connectionId) {
    const connection = await Connection.findById(connectionId);
    
    if (!connection) {
      throw new ApiError(404, 'Connection not found');
    }

    return {
      id: connection._id,
      status: connection.status,
      type: connection.type,
      lastTested: connection.lastTested,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt,
    };
  }

  _sanitizeConnection(connection) {
    const sanitized = connection.toObject();
    
    // Remove or mask sensitive data
    if (sanitized.credentials) {
      sanitized.credentials = this._maskCredentials(sanitized.credentials);
    }
    
    return sanitized;
  }

  _maskCredentials(credentials) {
    const masked = {};
    
    Object.keys(credentials).forEach(key => {
      if (key.toLowerCase().includes('password') || 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('key') ||
          key.toLowerCase().includes('secret')) {
        masked[key] = '***REDACTED***';
      } else {
        masked[key] = credentials[key];
      }
    });

    return masked;
  }
}

module.exports = new ConnectionsService();
