/**
 * Prompt Debugger Service - Main Entry Point
 * Initializes Express server with all dependencies
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DebugAnalyzer } from './services/DebugAnalyzer.js';
import { DebugRepository } from './persistence/DebugRepository.js';
import { createDebugRoutes } from './routes/debug.js';

// Load environment variables
dotenv.config();

// Type definitions for environment
interface Environment {
  PORT: string;
  CLAUDE_API_KEY: string;
  MONGODB_URI: string;
  NODE_ENV: string;
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): Environment {
  const required: (keyof Environment)[] = ['CLAUDE_API_KEY', 'MONGODB_URI'];
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
    PORT: process.env.PORT || '3001',
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY as string,
    MONGODB_URI: process.env.MONGODB_URI as string,
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
}

/**
 * Initialize and start Express server
 */
async function main(): Promise<void> {
  try {
    // Validate environment
    const env = validateEnvironment();
    console.log(`[v0] Starting Prompt Debugger Service (${env.NODE_ENV})`);

    // Initialize dependencies
    const debugAnalyzer = new DebugAnalyzer(env.CLAUDE_API_KEY);
    const debugRepository = new DebugRepository(env.MONGODB_URI);

    // Connect to MongoDB
    await debugRepository.connect();

    // Create Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Request logging middleware
    app.use((req, res, next) => {
      console.log(`[v0] ${req.method} ${req.path}`);
      next();
    });

    // Routes
    app.use('/api', createDebugRoutes(debugAnalyzer, debugRepository));

    // 404 handler
    app.use((_req, res) => {
      res.status(404).json({
        error: { message: 'Not found', code: 'NOT_FOUND' },
      });
    });

    // Error handler
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[v0] Unhandled error:', err.message);
      res.status(500).json({
        error: { message: err.message || 'Internal server error', code: 'INTERNAL_ERROR' },
      });
    });

    // Start server
    const port = parseInt(env.PORT, 10);
    app.listen(port, () => {
      console.log(`[v0] Prompt Debugger Service listening on port ${port}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('[v0] SIGTERM received, shutting down...');
      await debugRepository.disconnect();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('[v0] SIGINT received, shutting down...');
      await debugRepository.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('[v0] Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Start the service
main().catch((error) => {
  console.error('[v0] Unhandled promise rejection:', error);
  process.exit(1);
});
