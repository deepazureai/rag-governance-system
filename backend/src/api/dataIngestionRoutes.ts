import { Router, Request, Response } from 'express';
import { DataIngestionService } from '../services/DataIngestionService.js';
import { DataProcessingService } from '../services/DataProcessingService.js';
import { AlertIntegrationLayerService } from '../services/AlertIntegrationLayerService.js';
import { DataSourceConnectorFactory, DataSourceConfig } from '../connectors/index.js';
import { logger } from '../utils/logger.js';

export const dataIngestionRouter = Router();

const dataIngestionService = new DataIngestionService();
const dataProcessingService = new DataProcessingService();

// POST /api/data/ingest/local-folder
dataIngestionRouter.post('/ingest/local-folder', async (req: Request, res: Response) => {
  try {
    const { applicationId, applicationName, folderPath, fileName } = req.body;

    if (!applicationId || !folderPath || !fileName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logger.info(`[v0] Initiating local folder ingestion for app: ${applicationName}`);

    // Use unified ingestion service with factory pattern
    const dataSourceConfig: DataSourceConfig = {
      type: 'local_folder',
      config: { folderPath, fileName },
    };

    const ingestionResult = await dataIngestionService.ingestFromDataSource(applicationId, dataSourceConfig);

    // Process with evaluation framework
    const processedMetrics = await dataProcessingService.processRawData(
      applicationId,
      applicationName,
      ingestionResult.rawData,
      ingestionResult.sourceType,
      'raga' // Use RAGA framework by default
    );

    // Generate real-time alerts for ingested records with per-app thresholds
    try {
      await AlertIntegrationLayerService.generateIngestionTimeAlerts(applicationId, ingestionResult.rawData, 'ingestion');
      logger.info(`[v0] Alerts generated for ingestion from local folder, app: ${applicationId}`);
    } catch (alertErr: unknown) {
      const alertErrorMsg = alertErr instanceof Error ? alertErr.message : String(alertErr);
      logger.warn(`[v0] Alert generation failed (non-critical): ${alertErrorMsg}`);
      // Don't fail ingestion if alerts fail
    }

    res.json({
      success: true,
      ingestionId: `ingest_${applicationId}_${Date.now()}`,
      totalRecords: ingestionResult.totalRecords,
      processedMetrics: processedMetrics.length,
      metrics: processedMetrics,
    });
  } catch (error) {
    logger.error(`[v0] Local folder ingestion error:`, error);
    res.status(500).json({ error: 'Ingestion failed', details: (error as Error).message });
  }
});

// POST /api/data/ingest/azure-blob
dataIngestionRouter.post('/ingest/azure-blob', async (req: Request, res: Response) => {
  try {
    const { applicationId, applicationName, storageAccount, containerName, blobName, connectionString } = req.body;

    if (!applicationId || !storageAccount || !containerName || !blobName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logger.info(`[v0] Initiating Azure Blob ingestion for app: ${applicationName}`);

    // Use unified ingestion service with factory pattern
    const dataSourceConfig: DataSourceConfig = {
      type: 'azure_blob',
      config: { storageAccount, containerName, blobName, connectionString },
    };

    const ingestionResult = await dataIngestionService.ingestFromDataSource(applicationId, dataSourceConfig);

    // Process with evaluation framework
    const processedMetrics = await dataProcessingService.processRawData(
      applicationId,
      applicationName,
      ingestionResult.rawData,
      ingestionResult.sourceType,
      'raga'
    );

    // Generate real-time alerts for ingested records with per-app thresholds
    try {
      await AlertIntegrationLayerService.generateIngestionTimeAlerts(applicationId, ingestionResult.rawData, 'ingestion');
      logger.info(`[v0] Alerts generated for Azure Blob ingestion, app: ${applicationId}`);
    } catch (alertErr: unknown) {
      const alertErrorMsg = alertErr instanceof Error ? alertErr.message : String(alertErr);
      logger.warn(`[v0] Alert generation failed (non-critical): ${alertErrorMsg}`);
      // Don't fail ingestion if alerts fail
    }

    res.json({
      success: true,
      ingestionId: `ingest_${applicationId}_${Date.now()}`,
      totalRecords: ingestionResult.totalRecords,
      processedMetrics: processedMetrics.length,
      container: containerName,
      metrics: processedMetrics,
    });
  } catch (error) {
    logger.error(`[v0] Azure Blob ingestion error:`, error);
    res.status(500).json({ error: 'Ingestion failed', details: (error as Error).message });
  }
});

// POST /api/data/ingest/database
dataIngestionRouter.post('/ingest/database', async (req: Request, res: Response) => {
  try {
    const { applicationId, applicationName, dbConfig, columnMapping } = req.body;

    if (!applicationId || !dbConfig || !dbConfig.type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logger.info(`[v0] Initiating database ingestion for app: ${applicationName}`);

    // Use unified ingestion service with factory pattern
    const dataSourceConfig: DataSourceConfig = {
      type: 'database',
      config: {
        ...dbConfig,
        columnMapping, // Include column mapping for field standardization
      },
    };

    const ingestionResult = await dataIngestionService.ingestFromDataSource(applicationId, dataSourceConfig);

    // Process with evaluation framework
    const processedMetrics = await dataProcessingService.processRawData(
      applicationId,
      applicationName,
      ingestionResult.rawData,
      ingestionResult.sourceType,
      'raga'
    );

    // Generate real-time alerts for ingested records with per-app thresholds
    try {
      await AlertIntegrationLayerService.generateIngestionTimeAlerts(applicationId, ingestionResult.rawData, 'ingestion');
      logger.info(`[v0] Alerts generated for database ingestion, app: ${applicationId}`);
    } catch (alertErr: unknown) {
      const alertErrorMsg = alertErr instanceof Error ? alertErr.message : String(alertErr);
      logger.warn(`[v0] Alert generation failed (non-critical): ${alertErrorMsg}`);
      // Don't fail ingestion if alerts fail
    }

    res.json({
      success: true,
      ingestionId: `ingest_${applicationId}_${Date.now()}`,
      totalRecords: ingestionResult.totalRecords,
      processedMetrics: processedMetrics.length,
      database: dbConfig.database,
      table: dbConfig.table,
      metrics: processedMetrics,
    });
  } catch (error) {
    logger.error(`[v0] Database ingestion error:`, error);
    res.status(500).json({ error: 'Ingestion failed', details: (error as Error).message });
  }
});

// GET /api/data/ingest/:jobId/status
dataIngestionRouter.get('/ingest/:jobId/status', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    logger.info(`[v0] Checking ingestion status for job: ${jobId}`);
    
    res.json({
      jobId,
      status: 'in_progress',
      processedRecords: 0,
      totalRecords: 0,
      percentage: 0,
    });
  } catch (error) {
    logger.error(`[v0] Status check error:`, error);
    res.status(500).json({ error: 'Status check failed' });
  }
});
