import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { getStringParam } from '../utils/paramParser';

export const schemaMappingRouter = Router();

/**
 * POST /save-schema-mapping
 * Save table and column mapping for a database connection
 */
schemaMappingRouter.post('/save-schema-mapping', async (req: Request, res: Response) => {
  try {
    const {
      applicationId,
      connectionId,
      tableName,
      columnMappings,
      columnTypes,
      pollingIntervalMinutes = 60,
      recordsPerPoll = 1000,
    } = req.body;

    if (!applicationId || !connectionId || !tableName || !columnMappings) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: applicationId, connectionId, tableName, columnMappings',
      });
    }

    if (!columnMappings.prompt || !columnMappings.response) {
      return res.status(400).json({
        success: false,
        message: 'columnMappings must include at least prompt and response fields',
      });
    }

    const mappingId = `mapping_${uuidv4()}`;

    const SchemaMappingCollection = mongoose.connection.collection('databaseschemamappings');

    const mappingDoc = {
      mappingId,
      applicationId,
      connectionId,
      tableName,
      columnMappings: {
        prompt: columnMappings.prompt,
        context: columnMappings.context || null,
        response: columnMappings.response,
        userId: columnMappings.userId || null,
        timestamp: columnMappings.timestamp || null,
      },
      columnTypes: columnTypes || {},
      pollingConfig: {
        isEnabled: true,
        intervalMinutes: pollingIntervalMinutes,
        recordsPerPoll,
        lastPolledAt: null,
        nextPollAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await SchemaMappingCollection.insertOne(mappingDoc);

    console.log('[v0] Schema mapping saved:', mappingId);

    return res.json({
      success: true,
      data: {
        mappingId,
        applicationId,
        connectionId,
        tableName,
        message: 'Schema mapping saved successfully',
      },
    });
  } catch (error: any) {
    console.error('[v0] Error saving schema mapping:', error.message);
    return res.status(500).json({
      success: false,
      message: `Failed to save schema mapping: ${error.message}`,
    });
  }
});

/**
 * GET /applications/:applicationId/schema-mappings
 * Get all schema mappings for an application
 */
schemaMappingRouter.get('/applications/:applicationId/schema-mappings', async (req: Request, res: Response) => {
  try {
    const applicationId = getStringParam(req.params.applicationId);

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        message: 'applicationId is required',
      });
    }

    const SchemaMappingCollection = mongoose.connection.collection('databaseschemamappings');
    const mappings = await SchemaMappingCollection.find({ applicationId }).toArray();

    return res.json({
      success: true,
      data: mappings,
    });
  } catch (error: any) {
    console.error('[v0] Error fetching schema mappings:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * PUT /schema-mappings/:mappingId
 * Update schema mapping polling configuration
 */
schemaMappingRouter.put('/:mappingId', async (req: Request, res: Response) => {
  try {
    const mappingId = getStringParam(req.params.mappingId);
    const { pollingIntervalMinutes, recordsPerPoll } = req.body;

    if (!mappingId) {
      return res.status(400).json({
        success: false,
        message: 'mappingId is required',
      });
    }

    const SchemaMappingCollection = mongoose.connection.collection('databaseschemamappings');

    const updateDoc: any = {
      updatedAt: new Date(),
    };

    if (pollingIntervalMinutes) {
      updateDoc['pollingConfig.intervalMinutes'] = pollingIntervalMinutes;
    }

    if (recordsPerPoll) {
      updateDoc['pollingConfig.recordsPerPoll'] = recordsPerPoll;
    }

    const result = await SchemaMappingCollection.updateOne(
      { mappingId },
      { $set: updateDoc }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schema mapping not found',
      });
    }

    return res.json({
      success: true,
      message: 'Schema mapping updated successfully',
    });
  } catch (error: any) {
    console.error('[v0] Error updating schema mapping:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

/**
 * DELETE /schema-mappings/:mappingId
 * Delete a schema mapping
 */
schemaMappingRouter.delete('/:mappingId', async (req: Request, res: Response) => {
  try {
    const mappingId = getStringParam(req.params.mappingId);

    if (!mappingId) {
      return res.status(400).json({
        success: false,
        message: 'mappingId is required',
      });
    }

    const SchemaMappingCollection = mongoose.connection.collection('databaseschemamappings');
    const result = await SchemaMappingCollection.deleteOne({ mappingId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Schema mapping not found',
      });
    }

    return res.json({
      success: true,
      message: 'Schema mapping deleted successfully',
    });
  } catch (error: any) {
    console.error('[v0] Error deleting schema mapping:', error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});
