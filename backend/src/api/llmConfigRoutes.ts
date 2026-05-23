import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { LLMConfig, KnowledgeBaseConfig } from '../types/index.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const llmConfigSchema = z.object({
  applicationId: z.string().min(1),
  provider: z.enum(['openai', 'azure-openai', 'claude', 'deepinfra', 'grok']),
  model: z.string().min(1),
  apiKey: z.string().min(1),
  apiUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
  topP: z.number().min(0).max(1).optional(),
  isDefault: z.boolean().optional(),
});

const kbConfigSchema = z.object({
  applicationId: z.string().min(1),
  embeddingProvider: z.enum(['openai', 'azure-openai', 'claude', 'deepinfra', 'grok']),
  embeddingModel: z.string().min(1),
  embeddingApiKey: z.string().optional(),
  llmProvider: z.enum(['openai', 'azure-openai', 'claude', 'deepinfra', 'grok']),
  llmModel: z.string().min(1),
  llmApiKey: z.string().optional(),
  chunkSize: z.number().min(100).max(4000),
  overlapSize: z.number().min(0).max(500),
  vectorStoreType: z.enum(['chroma', 'pinecone', 'weaviate']),
  vectorStoreUrl: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().min(1).optional(),
});

/**
 * GET /api/llm-config/models
 * Get available LLM models by provider
 */
router.get('/models', async (req: Request, res: Response): Promise<void> => {
  try {
    const models: Record<string, readonly string[]> = {
      openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-davinci-003'],
      'azure-openai': ['gpt-4', 'gpt-35-turbo'],
      claude: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
      deepinfra: ['meta-llama/Llama-2-70b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.1'],
      grok: ['grok-1', 'grok-beta'],
    };

    res.json({
      success: true,
      data: models,
    });
  } catch (error: unknown) {
    console.error('[llmConfigRoutes] Error fetching models:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available models',
    });
  }
});

/**
 * GET /api/llm-config/app/:applicationId
 * Get LLM configuration for an application
 */
router.get('/app/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    
    if (!applicationId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    const collection = mongoose.connection.collection('llmconfigs');
    const config = await collection.findOne({ applicationId }) as (LLMConfig & { _id?: unknown }) | null;

    if (!config) {
      res.json({
        success: true,
        data: null,
        message: 'No LLM configuration found for this application',
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: unknown) {
    console.error('[llmConfigRoutes] Error fetching LLM config:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch LLM configuration',
    });
  }
});

/**
 * POST /api/llm-config/app/:applicationId
 * Save or update LLM configuration for an application
 */
router.post('/app/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    
    if (!applicationId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    const validation = llmConfigSchema.safeParse({ ...req.body, applicationId });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const config: LLMConfig = {
      ...validation.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collection = mongoose.connection.collection('llmconfigs');
    const result = await collection.updateOne(
      { applicationId },
      { $set: config },
      { upsert: true }
    );

    res.json({
      success: true,
      data: config,
      message: result.upsertedId ? 'LLM config created' : 'LLM config updated',
    });
  } catch (error: unknown) {
    console.error('[llmConfigRoutes] Error saving LLM config:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Failed to save LLM configuration',
    });
  }
});

/**
 * GET /api/llm-config/knowledge-base/:applicationId
 * Get Knowledge Base configuration for an application
 */
router.get('/knowledge-base/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;

    if (!applicationId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    const collection = mongoose.connection.collection('knowledgebaseconfigs');
    const config = await collection.findOne({ applicationId }) as (KnowledgeBaseConfig & { _id?: unknown }) | null;

    if (!config) {
      res.json({
        success: true,
        data: null,
        message: 'No Knowledge Base configuration found for this application',
      });
      return;
    }

    res.json({
      success: true,
      data: config,
    });
  } catch (error: unknown) {
    console.error('[llmConfigRoutes] Error fetching KB config:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Knowledge Base configuration',
    });
  }
});

/**
 * POST /api/llm-config/knowledge-base/:applicationId
 * Save or update Knowledge Base configuration
 */
router.post('/knowledge-base/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    
    if (!applicationId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    const validation = kbConfigSchema.safeParse({ ...req.body, applicationId });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors,
      });
      return;
    }

    const config: KnowledgeBaseConfig = {
      ...validation.data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const collection = mongoose.connection.collection('knowledgebaseconfigs');
    const result = await collection.updateOne(
      { applicationId },
      { $set: config },
      { upsert: true }
    );

    res.json({
      success: true,
      data: config,
      message: result.upsertedId ? 'KB config created' : 'KB config updated',
    });
  } catch (error: unknown) {
    console.error('[llmConfigRoutes] Error saving KB config:', error instanceof Error ? error.message : String(error));
    res.status(500).json({
      success: false,
      error: 'Failed to save Knowledge Base configuration',
    });
  }
});

export const llmConfigRouter = router;
