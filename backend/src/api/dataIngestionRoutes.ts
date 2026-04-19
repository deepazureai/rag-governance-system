import { Router, Request, Response } from 'express';
import { DataIngestionService } from '../services/DataIngestionService';
import { DataProcessingService } from '../services/DataProcessingService';
import { LocalFolderConnector } from '../connectors/LocalFolderConnector';
import { AzureBlobConnector } from '../connectors/AzureBlobConnector';
import { DatabaseConnector } from '../connectors/DatabaseConnector';
import { logger } from '../utils/logger';

export const dataIngestionRouter = Router();

const dataIngestionService = new DataIngestionService();
const dataProcessingService = new DataProcessingService();
const localFolderConnector = new LocalFolderConnector();
const azureBlobConnector = new AzureBlobConnector();
const databaseConnector = new DatabaseConnector();

// POST /api/data/ingest/local-folder
dataIngestionRouter.post('/ingest/local-folder', async (req: Request, res: Response) => {
  try {
    const { applicationId, applicationName, folderPath, fileName } = req.body;

    if (!applicationId || !folderPath || !fileName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logger.info(`[v0] Initiating local folder ingestion for app: ${applicationName}`);

    const ingestionResult = await dataIngestionService.ingestFromLocalFolder(
      applicationId,
      folderPath,
      fileName
    );

    const processedMetrics = await dataProcessingService.processRawData(
      applicationId,
      applicationName,
      ingestionResult.records,
      'local_folder',
      fileName
    );

    res.json({
      success: true,
      ingestionId: `ingest_${applicationId}_${Date.now()}`,
      totalRecords: ingestionResult.totalRecords,
      processedMetrics: processedMetrics.length,
      fileSize: ingestionResult.fileSize,
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

    const blobResult = await azureBlobConnector.readDataFile(
      {
        storageAccount,
        containerName,
        blobName,
        connectionString,
      },
      applicationId
    );

    const processedMetrics = await dataProcessingService.processRawData(
      applicationId,
      applicationName,
      blobResult.records as Record<string, unknown>[],
      'azure_blob',
      blobName
    );

    res.json({
      success: true,
      ingestionId: `ingest_${applicationId}_${Date.now()}`,
      totalRecords: blobResult.metadata.totalRecords,
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
    const { applicationId, applicationName, dbConfig } = req.body;

    if (!applicationId || !dbConfig || !dbConfig.type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    logger.info(`[v0] Initiating database ingestion for app: ${applicationName}`);

    const dbResult = await databaseConnector.readData(dbConfig, applicationId);

    const processedMetrics = await dataProcessingService.processRawData(
      applicationId,
      applicationName,
      dbResult.records as Record<string, unknown>[],
      'database',
      `${dbConfig.database}.${dbConfig.table}`
    );

    res.json({
      success: true,
      ingestionId: `ingest_${applicationId}_${Date.now()}`,
      totalRecords: dbResult.metadata.totalRecords,
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
