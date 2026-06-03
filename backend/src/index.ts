/**
 * Main Express Server
 */

import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import mongoose from 'mongoose';
import { createEvaluationRouter } from './api/routes.js';
import { applicationsRouter } from './api/applicationsRoutes.js';
import applicationRecordsRouter from './api/applicationRecordsRoutes.js';
import { slaConfigRouter } from './api/slaConfigRoutes.js';
import { connectionsRouter } from './api/connectionsRoutes.js';
import { connectionsManagementRouter } from './api/connectionsManagementRoutes.js';
import { schemaMappingRouter } from './api/schemaMappingRoutes.js';
import { batchProcessingRouter } from './api/batchProcessingRoutes.js';
import { dataIngestionRouter } from './api/dataIngestionRoutes.js';
import { metricsRouter } from './api/metricsRoutes.js';
import { alertThresholdsRouter } from './api/alertThresholdsRoutes.js';
import { notificationsRouter } from './api/notificationsRoutes.js';
import { databaseSchemaRouter } from './api/databaseSchemaRoutes.js';
import { alertsRouter } from './api/alertsRoutes.js';
import { alertIntegrationRouter } from './api/alertIntegrationRoutes.js';
import { governanceMetricsRouter } from './api/governanceMetricsRoutes.js';
import baReviewRouter from './api/baReviewRoutes.js';
import promptTemplateRouter from './api/promptTemplateRoutes.js';
import evaluationRouter from './api/evaluationRoutes.js';
import hallucinationDetectionRouter from './api/hallucinationDetectionRoutes.js';
import knowledgeBaseRouter from './api/knowledgeBaseRoutes.js';
import llmConfigRouter from './api/llmConfigRoutes.js';
import { ragSessionRouter } from './api/ragSessionRoutes.js';
import templatesRouter from './routes/api/templates.js';
import { getFrameworkRegistry } from './frameworks/registry.js';
import { createDatabase } from './services/database.js';
import { createEvaluationService } from './services/evaluation.js';
import { createWebSocketService } from './services/websocket.js';
import { scheduledBatchJobService } from './services/ScheduledBatchJobService.js';
import { FrameworkType } from './frameworks/registry.js';

// Load environment variables from .env.backend first, then .env as fallback
const envBackendPath = path.resolve(process.cwd(), '.env.backend');
const envPath = path.resolve(process.cwd(), '.env');

try {
  const result = dotenv.config({ path: envBackendPath });
  if (result.error) {
    // .env.backend doesn't exist, try .env
    dotenv.config({ path: envPath });
    console.log('[Env] Loaded from .env');
  } else {
    console.log('[Env] Loaded from .env.backend');
  }
} catch (err) {
  console.warn('[Env] Warning loading env files:', err);
}

async function initializeMongoDB(): Promise<void> {
  const mongoUrl = process.env.MONGODB_URI || 'mongodb://admin:password@mongodb:27017/v0_db?authSource=admin';
  const mongoOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5001,
    socketTimeoutMS: 45001,
  };

  console.log('[MongoDB] Attempting to connect to MongoDB...');
  console.log('[MongoDB] URL:', mongoUrl.replace(/password:[^@]*@/, 'password:***@'));

  try {
    await mongoose.connect(mongoUrl, mongoOptions);
    console.log('[MongoDB] Connected successfully');
    
    // Initialize alert-related collections and indexes (non-critical)
    await initializeAlertCollections();
  } catch (error) {
    console.warn('[MongoDB] Connection warning (will retry on first use):', error instanceof Error ? error.message : String(error));
    // Don't throw - let app start and retry on first data access
  }
}

async function initializeAlertCollections(): Promise<void> {
  try {
    const db = mongoose.connection;
    
    // Create alert thresholds collection with index
    const alertThresholdsCollection = db.collection('alertthresholds');
    await alertThresholdsCollection.createIndex(
      { applicationId: 1 },
      { unique: true }
    );
    console.log('[MongoDB] Alert thresholds collection and indexes created');
    
    // Create generated alerts collection with indexes
    const generatedAlertsCollection = db.collection('generatedalerts');
    await generatedAlertsCollection.createIndex({ applicationId: 1, createdAt: -1 });
    await generatedAlertsCollection.createIndex({ severity: 1 });
    await generatedAlertsCollection.createIndex({ status: 1 });
    await generatedAlertsCollection.createIndex({ alertType: 1 });
    console.log('[MongoDB] Generated alerts collection and indexes created');
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn('[MongoDB] Error creating alert collections/indexes (non-critical):', errorMessage);
    // Don't throw - this is non-critical
  }
}

async function createServer(): Promise<Express> {
  const app = express();

  // Middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    })
  );

  // Logger middleware
  app.use((req: Request, res: Response, next: any) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API health check endpoint (for docker-compose healthcheck)
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'rag-evaluation-backend', timestamp: new Date().toISOString() });
  });

  // Initialize services
  console.log('[Server] Initializing services...');

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      mongoConnected: mongoose.connection.readyState === 1,
    });
  });

  // Initialize MongoDB first
  await initializeMongoDB();

  const database = createDatabase();
  await database.initialize();

  const evaluationService = createEvaluationService(database, {
    defaultFramework: 'ragas' as FrameworkType,
  });

  // Initialize framework registry
  const registry = getFrameworkRegistry();
  await registry.initializeAll();

  // Initialize scheduled batch jobs (now that MongoDB is connected)
  await scheduledBatchJobService.initializeAllScheduledJobs();

  // API routes
  app.use('/api/evaluations', evaluationRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/applications', applicationRecordsRouter);
  app.use('/api/applications', slaConfigRouter);
  app.use('/api/connections', connectionsRouter);
  app.use('/api/batch', batchProcessingRouter);
  app.use('/api/data', dataIngestionRouter);
  app.use('/api/metrics', metricsRouter);
  app.use('/api/alert-thresholds', alertThresholdsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/database', databaseSchemaRouter);
  app.use('/api/connections', connectionsManagementRouter);
  app.use('/api/schema-mappings', schemaMappingRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/alert-integration', alertIntegrationRouter);
  app.use('/api/governance-metrics', governanceMetricsRouter);
  app.use('/api/ba-review', baReviewRouter);
  app.use('/api/prompt-templates', promptTemplateRouter);
  app.use('/api/templates', templatesRouter);
  app.use('/api/evaluation', hallucinationDetectionRouter);
  app.use('/api/knowledge-base', knowledgeBaseRouter);
  app.use('/api/llm-config', llmConfigRouter);
  app.use('/api/kb-config', llmConfigRouter);  // KB Config routes are in this router too
  app.use('/api/rag-sessions', ragSessionRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: 'Not found',
      path: req.path,
    });
  });

  // Error handler
  app.use((error: any, req: Request, res: Response, next: any) => {
    console.error('[Server] Unhandled error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
    });
  });

  return app;
}

async function startServer(): Promise<void> {
  try {
    const app = await createServer();
    const port = process.env.PORT || 5001;

    const server = http.createServer(app);

    // Initialize WebSocket service
    const database = createDatabase();
    await database.initialize();
    const evaluationService = createEvaluationService(database);
    const wsService = createWebSocketService(server, evaluationService);

    server.listen(port, () => {
      console.log(`[Server] HTTP server running on port ${port}`);
      console.log(`[Server] WebSocket server running on ws://localhost:${port}/ws`);
      console.log('[Server] Ready to accept evaluation requests');
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('[Server] Shutting down gracefully...');
      server.close();
      wsService.close();
      await database.close();

      const registry = getFrameworkRegistry();
      await registry.shutdownAll();

      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[Server] Failed to start:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
