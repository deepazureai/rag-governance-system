/**
 * Template Creator Service - Main Entry Point
 * Initializes Express server with all dependencies
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { TemplateRepository } from './persistence/TemplateRepository.js';
import { TemplateService } from './services/TemplateService.js';
import { createTemplateRoutes } from './routes/templates.js';
import { errorResponse } from './utils/apiResponse.js';

dotenv.config();

interface Environment {
  PORT: string;
  MONGODB_URI: string;
  NODE_ENV: string;
}

function validateEnvironment(): Environment {
  const required: (keyof Environment)[] = ['MONGODB_URI'];
  const missing: string[] = [];

  required.forEach((key) => {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    PORT: process.env.PORT || '3002',
    MONGODB_URI: process.env.MONGODB_URI as string,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

async function main(): Promise<void> {
  try {
    const env = validateEnvironment();
    console.log(`[v0] Starting Template Creator Service (${env.NODE_ENV})`);

    // Initialize dependencies
    const templateRepository = new TemplateRepository(env.MONGODB_URI);
    const templateService = new TemplateService(templateRepository);

    // Connect to MongoDB
    await templateRepository.connect();

    // Create Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Request logging
    app.use((req, res, next) => {
      console.log(`[v0] ${req.method} ${req.path}`);
      next();
    });

    // Routes
    app.use('/api/templates', createTemplateRoutes(templateService));

    // 404 handler
    app.use((_req, res) => {
      res.status(404).json(
        errorResponse('NOT_FOUND', 'Endpoint not found')
      );
    });

    // Error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[v0] Unhandled error:', err.message);
      res.status(500).json(
        errorResponse('INTERNAL_ERROR', err.message)
      );
    });

    // Start server
    const port = parseInt(env.PORT, 10);
    app.listen(port, () => {
      console.log(`[v0] Template Creator Service listening on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[v0] SIGTERM received, shutting down...');
      await templateRepository.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[v0] SIGINT received, shutting down...');
      await templateRepository.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('[v0] Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('[v0] Unhandled promise rejection:', error);
  process.exit(1);
});
