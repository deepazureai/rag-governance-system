/**
 * API Routes - Applications Endpoints
 * CRUD operations for RAG applications
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { batchProcessingService } from '../services/BatchProcessingService.js';
import { getStringParam } from '../utils/paramParser.js';
import { INDUSTRY_STANDARD_SLA } from '../utils/sla-benchmarks.js';
import mongoose from 'mongoose';

const applicationsRouter = Router();

// Validation schemas
const createApplicationSchema = z.object({
  name: z.string().min(1, 'Application name is required'),
  description: z.string().optional(),
  framework: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  dataSource: z.object({
    type: z.enum(['local_folder', 'azure_blob', 'database', 'splunk', 'datadog']),
    config: z.record(z.string(), z.any()).optional(),
  }).optional(),
});

const updateApplicationSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  ragFramework: z.string().optional(),
  owner: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

/**
 * GET /api/applications
 * Get all applications from ApplicationMaster collection
 */
applicationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    console.log('[API] GET /api/applications - Fetching all applications');
    
    // Check if MongoDB connection is active
    if (!mongoose.connection.db) {
      console.error('[API] MongoDB connection not established');
      return res.status(503).json({
        success: false,
        error: 'Database connection error',
        message: 'MongoDB connection is not established',
      });
    }

    // Query MongoDB ApplicationMaster collection
    const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
    
    const applications = await ApplicationMasterCollection.find({})
      .sort({ createdAt: -1 })
      .toArray();
    
    console.log('[API] Found', applications.length, 'applications in MongoDB');

    if (applications.length === 0) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        message: 'No applications added to the RAG Evaluation Platform yet.',
      });
    }

    return res.json({
      success: true,
      data: applications,
      count: applications.length,
      message: `Found ${applications.length} application(s)`,
    });
  } catch (error: any) {
    console.error('[API] Error fetching applications:', error.message);
    console.error('[API] Full error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch applications',
      message: error.message,
      details: error.stack,
    });
  }
});

/**
 * POST /api/applications/create
 * Create a new application with data source (from wizard)
 */
applicationsRouter.post('/create', async (req: Request, res: Response) => {
  try {
    console.log('[API] POST /api/applications/create - Request body:', JSON.stringify(req.body, null, 2));
    
    const validation = createApplicationSchema.safeParse(req.body);

    if (!validation.success) {
      console.error('[API] Validation failed:', validation.error.issues);
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validation.error.issues,
      });
    }

    const appData = validation.data;
    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[API] Creating application from wizard:', applicationId);
    console.log('[API] Application data:', appData);

    // Create ApplicationMaster record
    const newApp = {
      id: applicationId,
      name: appData.name,
      description: appData.description,
      owner: appData.owner || 'system',
      framework: appData.framework || 'unknown',
      status: 'active',
      dataSource: appData.dataSource || { type: 'database', config: {} },
      initialDataProcessingStatus: 'pending',
      metricsCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Save to MongoDB
    console.log('[API] Saving application to MongoDB...');
    
    // Get or create collection
    const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
    const result = await ApplicationMasterCollection.insertOne(newApp);
    
    console.log('[API] Application saved to MongoDB with _id:', result.insertedId);

    // AUTO-CREATE SLA Configuration with Industry Benchmarks
    console.log('[API] Creating SLA configuration with industry benchmarks for:', applicationId);
    const SLACollection = mongoose.connection.collection('applicationslas');
    const slaConfig = {
      applicationId,
      applicationName: appData.name,
      metrics: INDUSTRY_STANDARD_SLA.metrics,
      overallScoreThresholds: INDUSTRY_STANDARD_SLA.overallScoreThresholds,
      usesCustomThresholds: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await SLACollection.insertOne(slaConfig);
    console.log('[API] SLA configuration created with industry benchmarks');

    // Trigger data ingestion job asynchronously (Phase 1)
    if (appData.dataSource) {
      console.log('[API] Initiating data ingestion for application:', applicationId);
      console.log('[API] Data source type:', appData.dataSource.type);
      console.log('[API] Data source config:', appData.dataSource.config);
      
      // Start batch processing in background (don't await)
      const connectionId = `conn_${Date.now()}`;
      setImmediate(async () => {
        try {
          console.log('[API] Starting batch processing in background...');
          if (appData.dataSource && appData.dataSource.type !== 'local_folder') {
            // Only trigger batch processing for non-local-folder sources
            // Local folder files need to be uploaded first
            await batchProcessingService.executeBatchProcess(
              applicationId,
              connectionId,
              appData.dataSource.type,
              appData.dataSource.config
            );
            console.log('[API] Batch processing completed for:', applicationId);
          } else if (appData.dataSource && appData.dataSource.type === 'local_folder') {
            console.log('[API] Local folder selected - batch processing will start after file upload');
            // Update status to waiting for file
            const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
            await ApplicationMasterCollection.updateOne(
              { id: applicationId },
              { $set: { initialDataProcessingStatus: 'waiting_for_file' } }
            );
          }
        } catch (error: any) {
          console.error('[API] Background batch processing failed:', error.message);
          // Update application status to failed
          const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
          await ApplicationMasterCollection.updateOne(
            { id: applicationId },
            { $set: { initialDataProcessingStatus: 'failed', error: error.message } }
          );
        }
      });
    }

    console.log('[API] Application created successfully:', applicationId);
    return res.status(201).json({
      success: true,
      data: newApp,
      message: 'Application created successfully. Data ingestion has been initiated in the background.',
      jobId: `job_${applicationId}`,
    });
  } catch (error: any) {
    console.error('[API] Create application from wizard error:', error.message);
    console.error('[API] Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create application',
      details: error.stack,
    });
  }
});

/**
 * POST /api/applications
 * Create a new application
 */
applicationsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validation = createApplicationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const appData = validation.data;
    console.log('[API] Creating application:', appData);

    // Create application ID
    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Will be replaced with database call to ApplicationMaster collection
    const newApp = {
      id: applicationId,
      name: appData.name,
      description: appData.description,
      owner: appData.owner,
      framework: appData.framework,
      status: appData.status,
      dataSource: appData.dataSource || { type: 'database', config: {} },
      initialDataProcessingStatus: 'pending',
      metricsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('[API] Application created:', newApp);

    // Trigger data ingestion asynchronously
    if (appData.dataSource) {
      console.log('[API] Queuing data ingestion for application:', applicationId);
      // This would be replaced with a call to dataIngestionService.initiateIngestion()
      // For now, it's logged for testing purposes
      setImmediate(() => {
        console.log('[v0] Background task: Starting data ingestion for', applicationId);
      });
    }

    res.status(201).json({
      success: true,
      data: newApp,
      message: 'Application created successfully. Data ingestion initiated.',
    });
  } catch (error: any) {
    console.error('[API] Create application error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create application',
    });
  }
});

/**
 * GET /api/applications/:id
 * Get a specific application
 */
applicationsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[API] GET /api/applications/:id', id);

    // Will be replaced with database call
    res.json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('[API] Get application error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch application',
    });
  }
});

/**
 * PUT /api/applications/:id
 * Update an application
 */
applicationsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validation = updateApplicationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const updateData = validation.data;
    console.log('[API] Updating application:', id, updateData);

    // Will be replaced with database call
    const updatedApp = {
      id,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: updatedApp,
    });
  } catch (error: any) {
    console.error('[API] Update application error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update application',
    });
  }
});

/**
 * DELETE /api/applications/:id
 * Delete an application
 */
applicationsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log('[API] DELETE /api/applications/:id', id);

    // Will be replaced with database call
    res.json({
      success: true,
      message: 'Application deleted',
    });
  } catch (error: any) {
    console.error('[API] Delete application error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete application',
    });
  }
});

/**
 * POST /api/applications/:id/batch-process
 * Trigger batch processing for an application (e.g., after file upload)
 */
applicationsRouter.post('/:id/batch-process', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { dataSource } = req.body;

    console.log('[API] POST /api/applications/:id/batch-process for app:', id);
    console.log('[API] Data source:', dataSource);

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required',
      });
    }

    if (!dataSource || !dataSource.type) {
      return res.status(400).json({
        success: false,
        message: 'Data source type is required',
      });
    }

    // Trigger batch processing in background
    const connectionId = `conn_${Date.now()}`;
    setImmediate(async () => {
      try {
        console.log('[API] Starting batch processing for:', id);
        await batchProcessingService.executeBatchProcess(
          id,
          connectionId,
          dataSource.type,
          dataSource.config || {}
        );
        console.log('[API] Batch processing completed for:', id);

        // Update application status to processing_complete
        const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
        await ApplicationMasterCollection.updateOne(
          { id },
          { $set: { initialDataProcessingStatus: 'completed' } }
        );
      } catch (error: any) {
        console.error('[API] Batch processing failed:', error.message);
        // Update application status to failed
        const ApplicationMasterCollection = mongoose.connection.collection('applicationmasters');
        await ApplicationMasterCollection.updateOne(
          { id },
          { $set: { initialDataProcessingStatus: 'failed', error: error.message } }
        );
      }
    });

    res.json({
      success: true,
      message: 'Batch processing has been initiated. Metrics will be available shortly.',
    });
  } catch (error: any) {
    console.error('[API] Batch process trigger error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to trigger batch processing',
    });
  }
});

/**
 * POST /api/applications/:id/upload-raw-data
 * Upload raw data for an application (CSV format)
 */
applicationsRouter.post('/:id/upload-raw-data', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { csvData } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Application ID is required',
      });
    }

    if (!csvData) {
      return res.status(400).json({
        success: false,
        message: 'CSV data is required',
      });
    }

    console.log('[API] Uploading raw data for application:', id);

    // Parse CSV data
    const lines = csvData.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
    
    if (lines.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'CSV must have headers and at least one data row',
      });
    }

    // Parse header
    const headerLine = lines[0];
    const headers = parseCSVLine(headerLine);

    // Parse data rows
    const RawDataCollection = mongoose.connection.collection('rawdatarecords');
    const rawRecords = [];

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i]);
        const record: Record<string, any> = { applicationId: id };

        headers.forEach((header, idx) => {
          const value = values[idx] || '';
          record[header] = parseValue(value);
        });

        rawRecords.push(record);
      } catch (error: any) {
        console.warn(`[API] Error parsing CSV row ${i + 1}:`, error.message);
      }
    }

    if (rawRecords.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data rows found in CSV',
      });
    }

    // Insert raw data
    await RawDataCollection.insertMany(rawRecords);

    console.log('[API] Inserted', rawRecords.length, 'raw data records for app:', id);

    res.json({
      success: true,
      message: `Successfully uploaded ${rawRecords.length} records. Now trigger batch processing to start evaluation.`,
      recordsUploaded: rawRecords.length,
    });
  } catch (error: any) {
    console.error('[API] Upload raw data error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload raw data',
    });
  }
});

// Helper function to parse CSV lines with quoted field support
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// Helper function to parse values to correct types
function parseValue(value: string): any {
  if (!isNaN(Number(value)) && value !== '') {
    return Number(value);
  }
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  if ((value.startsWith('{') && value.endsWith('}')) || (value.startsWith('[') && value.endsWith(']'))) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export { applicationsRouter };
