import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { getStringParam } from '../utils/paramParser.js';
import { keyVaultManager } from '../utils/keyvault.js';
import { Pool } from 'pg';

export const connectionsManagementRouter = Router();

/**
 * POST /test-connection
 * Test database connectivity without saving
 */
connectionsManagementRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { type, server, port, database, username, password, connectionString } = req.body;

    if (!type || !server || !port || !database) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type, server, port, database',
      });
    }

    console.log(`[v0] Testing ${type} connection to ${server}:${port}/${database}`);

    if (type === 'postgresql' || type === 'mysql') {
      const pool = new Pool({
        host: server,
        port: parseInt(port),
        database,
        user: username,
        password,
        connectionTimeoutMillis: 5001,
      });

      try {
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();
        await pool.end();

        return res.json({
          success: true,
          message: 'Connection successful',
          connectionType: type,
        });
      } catch (err: any) {
        await pool.end();
        throw err;
      }
    }

    return res.status(400).json({
      success: false,
      message: `Database type ${type} not yet supported`,
    });
  } catch (error: any) {
    console.error('[v0] Connection test failed:', error.message);
    return res.status(400).json({
      success: false,
      message: `Connection failed: ${error.message}`,
    });
  }
});

/**
 * POST /save-connection
 * Save database connection with encrypted credentials
 */
connectionsManagementRouter.post('/save-connection', async (req: Request, res: Response) => {
  try {
    const { applicationId, connectionName, type, server, port, database, username, password, authType } = req.body;

    if (!applicationId || !type || !server || !port || !database) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }

    const connectionId = `conn_${uuidv4()}`;
    
    // Store credentials securely
    const credentialId = `${applicationId}_${connectionId}`;
    const credentialValue = JSON.stringify({ username, password });
    
    const storedCred = keyVaultManager.storeCredential(credentialId, credentialValue);

    // Save connection to MongoDB
    const ConnectionsCollection = mongoose.connection.collection('databaseconnections');
    
    const connectionDoc = {
      connectionId,
      applicationId,
      connectionName: connectionName || `${type} - ${server}`,
      type,
      server,
      port: parseInt(port),
      database,
      authType: authType || 'username_password',
      credentials: {
        keyVaultReference: storedCred.keyVaultReference || credentialId,
        credentialType: 'username_password',
        encryptedAt: new Date(),
      },
      isConnected: true,
      lastTestedAt: new Date(),
      testStatus: 'success',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await ConnectionsCollection.insertOne(connectionDoc);

    console.log('[v0] Connection saved:', connectionId);

    return res.json({
      success: true,
      data: {
        connectionId,
        applicationId,
        message: 'Connection saved successfully',
      },
    });
  } catch (error: any) {
    console.error('[v0] Error saving connection:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to save connection: ${error.message}`,
    });
  }
});

/**
 * GET /applications/:applicationId/connections
 * Get all connections for an application
 */
connectionsManagementRouter.get('/applications/:applicationId/connections', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const ConnectionsCollection = mongoose.connection.collection('databaseconnections');
    const connections = await ConnectionsCollection.find({ applicationId }).toArray();

    return res.json({
      success: true,
      data: connections.map((conn: any) => ({
        connectionId: conn.connectionId,
        connectionName: conn.connectionName,
        type: conn.type,
        server: conn.server,
        port: conn.port,
        database: conn.database,
        isConnected: conn.isConnected,
        lastTestedAt: conn.lastTestedAt,
      })),
    });
  } catch (error: any) {
    console.error('[v0] Error fetching connections:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /connections/:connectionId
 * Delete a connection
 */
connectionsManagementRouter.delete('/:connectionId', async (req: Request, res: Response) => {
  try {
    const connectionId = getStringParam(req.params.connectionId);

    if (!connectionId) {
      return res.status(400).json({
        success: false,
        message: 'connectionId is required',
      });
    }

    const ConnectionsCollection = mongoose.connection.collection('databaseconnections');
    const result = await ConnectionsCollection.deleteOne({ connectionId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Connection not found',
      });
    }

    return res.json({
      success: true,
      message: 'Connection deleted successfully',
    });
  } catch (error: any) {
    console.error('[v0] Error deleting connection:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
