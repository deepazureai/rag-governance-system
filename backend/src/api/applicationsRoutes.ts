/**
 * API Routes - Applications Endpoints
 * CRUD operations for RAG applications
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

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
    config: z.record(z.any()).optional(),
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
    
    // TODO: Query MongoDB ApplicationMaster collection
    // const db = getDatabase();
    // const applications = await db.collection('ApplicationMaster')
    //   .find({})
    //   .sort({ createdAt: -1 })
    //   .toArray();
    // 
    // if (applications.length === 0) {
    //   return res.json({
    //     success: true,
    //     data: [],
    //     count: 0,
    //     message: 'No applications added to the RAG Evaluation Platform yet.',
    //   });
    // }
    // 
    // return res.json({
    //   success: true,
    //   data: applications,
    //   count: applications.length,
    //   message: `Found ${applications.length} application(s)`,
    // });

    // For now, return empty array with user-friendly message
    res.json({
      success: true,
      data: [],
      count: 0,
      message: 'No applications added to the RAG Evaluation Platform yet.',
    });
  } catch (error: any) {
    console.error('[API] Get applications error:', error);
    res.status(500).json({
      success: false,
      error: 'Unable to load applications',
      message: 'Failed to retrieve applications from the platform. Please try again later.',
      details: error.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/applications/create
 * Create a new application with data source (from wizard)
 */
applicationsRouter.post('/create', async (req: Request, res: Response) => {
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
    const applicationId = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('[API] Creating application from wizard:', applicationId, appData);

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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Trigger data ingestion job asynchronously
    if (appData.dataSource) {
      console.log('[API] Initiating data ingestion for application:', applicationId);
      // Queue ingestion job - would call dataIngestionService.initiateIngestion(newApp)
      setImmediate(() => {
        console.log('[v0] Background ingestion task started for', applicationId, 'with data source', appData.dataSource.type);
      });
    }

    res.status(201).json({
      success: true,
      data: newApp,
      message: 'Application created successfully. Data ingestion has been initiated in the background.',
      jobId: `job_${applicationId}`,
    });
  } catch (error: any) {
    console.error('[API] Create application from wizard error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create application',
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

export { applicationsRouter };
