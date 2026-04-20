/**
 * Main Express Server
 */

import 'dotenv/config';
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import http from 'http';
import { createEvaluationRouter } from './api/routes';
import { applicationsRouter } from './api/applicationsRoutes';
import { connectionsRouter } from './api/connectionsRoutes';
import { batchProcessingRouter } from './api/batchProcessingRoutes';
import { dataIngestionRouter } from './api/dataIngestionRoutes';
import { metricsRouter } from './api/metricsRoutes';
import { alertThresholdsRouter } from './api/alertThresholdsRoutes';
import { notificationsRouter } from './api/notificationsRoutes';
import { getFrameworkRegistry } from './frameworks/registry';
import { createDatabase } from './services/database';
import { createEvaluationService } from './services/evaluation';
import { createWebSocketService } from './services/websocket';
import { scheduledBatchJobService } from './services/ScheduledBatchJobService';

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
  app.use((req: Request, res: Response, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Initialize services
  console.log('[Server] Initializing services...');

  const database = createDatabase();
  await database.initialize();

  const evaluationService = createEvaluationService(database, {
    defaultFramework: 'ragas',
  });

  // Initialize framework registry
  const registry = getFrameworkRegistry();
  await registry.initializeAll();

  // Initialize scheduled batch jobs
  await scheduledBatchJobService.initializeAllScheduledJobs();

  // API routes
  const evaluationRouter = createEvaluationRouter(evaluationService);
  app.use('/api/evaluations', evaluationRouter);
  app.use('/api/applications', applicationsRouter);
  app.use('/api/connections', connectionsRouter);
  app.use('/api/batch', batchProcessingRouter);
  app.use('/api/data', dataIngestionRouter);
  app.use('/api/metrics', metricsRouter);
  app.use('/api/alert-thresholds', alertThresholdsRouter);
  app.use('/api/notifications', notificationsRouter);

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
    const port = process.env.PORT || 3001;

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
