/**
 * Prompt Debugger Service - Main Entry Point
 * Initializes Express server with configurable LLM providers
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { DebugAnalyzer } from './services/DebugAnalyzer.js';
import { DebugRepository } from './persistence/DebugRepository.js';
import { createDebugRoutes } from './routes/debug.js';
import { LLMConfig, LLMProvider } from './types/index.js';

// Load environment variables
dotenv.config();

// Type definitions for environment
interface Environment {
  PORT: string;
  LLM_PROVIDER: LLMProvider;
  LLM_MODEL: string;
  LLM_API_KEY: string;
  LLM_BASE_URL?: string;
  MONGODB_URI: string;
  NODE_ENV: string;
}

/**
 * Validate required environment variables
 */
function validateEnvironment(): Environment {
  const required: (keyof Environment)[] = ['LLM_PROVIDER', 'LLM_MODEL', 'LLM_API_KEY', 'MONGODB_URI'];
  const missing: string[] = [];

  required.forEach((key) => {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  });

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const provider = process.env.LLM_PROVIDER as LLMProvider;
  const validProviders: LLMProvider[] = ['claude', 'openai', 'deepseek', 'custom'];
  if (!validProviders.includes(provider)) {
    throw new Error(`Invalid LLM_PROVIDER: ${provider}. Must be one of: ${validProviders.join(', ')}`);
  }

  if (provider === 'custom' && !process.env.LLM_BASE_URL?.trim()) {
    throw new Error('LLM_BASE_URL is required when LLM_PROVIDER is "custom"');
  }

  return {
    PORT: process.env.PORT || '3001',
    LLM_PROVIDER: provider,
    LLM_MODEL: process.env.LLM_MODEL as string,
    LLM_API_KEY: process.env.LLM_API_KEY as string,
    LLM_BASE_URL: process.env.LLM_BASE_URL,
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
    console.log(`[v0] Using LLM provider: ${env.LLM_PROVIDER} (${env.LLM_MODEL})`);

    // Create LLM configuration
    const llmConfig: LLMConfig = {
      provider: env.LLM_PROVIDER,
      model: env.LLM_MODEL,
      apiKey: env.LLM_API_KEY,
      baseUrl: env.LLM_BASE_URL,
      temperature: 0.7,
      maxTokens: 2048,
    };

    // Initialize dependencies
    const debugAnalyzer = new DebugAnalyzer(llmConfig);
    const debugRepository = new DebugRepository(env.MONGODB_URI);

    // Connect to MongoDB
    await debugRepository.connect();

    // Create Express app
    const app = express();

    // Middleware
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Request logging middleware
    app.use((req, _res, next) => {
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
