import { Router, type Router as ExpressRouter, Request, Response } from 'express';
import {
  detectHallucinations,
  analyzePromptQuality,
  generateImprovedPrompt,
} from '../services/HallucinationDetectionService.js';
import { llmConfigService } from '../services/LLMConfigService.js';
import { ILLMConfig } from '../models/LLMConfig.js';
import { logger } from '../utils/logger.js';

const hallucinationDetectionRouter: ExpressRouter = Router();

/**
 * POST /api/evaluation/hallucination-detection
 * Detect hallucinations in LLM responses using Azure OpenAI as judge
 */
hallucinationDetectionRouter.post('/hallucination-detection', async (req: Request, res: Response) => {
  try {
    const {
      sourceDocuments,
      userPrompt,
      llmResponse,
      recordId,
    } = req.body;

    if (!sourceDocuments || !Array.isArray(sourceDocuments) || sourceDocuments.length === 0) {
      return res.status(400).json({ error: 'sourceDocuments array is required and must not be empty' });
    }

    if (!userPrompt || typeof userPrompt !== 'string') {
      return res.status(400).json({ error: 'userPrompt is required' });
    }

    if (!llmResponse || typeof llmResponse !== 'string') {
      return res.status(400).json({ error: 'llmResponse is required' });
    }

    logger.info('[HallucinationDetection API] Analyzing response for hallucinations', {
      recordId,
      promptLength: userPrompt.length,
      responseLength: llmResponse.length,
      documentCount: sourceDocuments.length,
    });

    const analysis = await detectHallucinations(
      sourceDocuments,
      userPrompt,
      llmResponse
    );

    res.json({
      success: true,
      recordId,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[HallucinationDetection API] Error:', error);
    res.status(500).json({
      error: 'Hallucination detection failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/evaluation/prompt-quality
 * Analyze prompt quality for clarity and best practices
 */
hallucinationDetectionRouter.post('/prompt-quality', async (req: Request, res: Response) => {
  try {
    const { prompt, recordId } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'prompt is required' });
    }

    logger.info('[PromptQuality API] Analyzing prompt quality', { recordId, promptLength: prompt.length });

    const analysis = await analyzePromptQuality(prompt);

    res.json({
      success: true,
      recordId,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[PromptQuality API] Error:', error);
    res.status(500).json({
      error: 'Prompt quality analysis failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/evaluation/generate-improved-prompt
 * Generate an improved version of a prompt with specific suggestions
 */
hallucinationDetectionRouter.post('/generate-improved-prompt', async (req: Request, res: Response) => {
  try {
    const { originalPrompt, issues, targetGroundedness = 80, recordId } = req.body;

    if (!originalPrompt || typeof originalPrompt !== 'string') {
      return res.status(400).json({ error: 'originalPrompt is required' });
    }

    if (!issues || !Array.isArray(issues) || issues.length === 0) {
      return res.status(400).json({ error: 'issues array is required' });
    }

    logger.info('[GenerateImprovedPrompt API] Generating improved prompt', {
      recordId,
      issueCount: issues.length,
      targetGroundedness,
    });

    const result = await generateImprovedPrompt(
      originalPrompt,
      issues,
      targetGroundedness
    );

    res.json({
      success: true,
      recordId,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[GenerateImprovedPrompt API] Error:', error);
    res.status(500).json({
      error: 'Improved prompt generation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/evaluation/end-to-end
 * Complete evaluation pipeline: detect hallucinations, analyze prompt quality, generate improvements
 */
hallucinationDetectionRouter.post('/end-to-end', async (req: Request, res: Response) => {
  try {
    const {
      sourceDocuments,
      userPrompt,
      llmResponse,
      targetGroundedness = 80,
      recordId,
      applicationId,
    } = req.body;

    if (!sourceDocuments || !Array.isArray(sourceDocuments) || sourceDocuments.length === 0) {
      return res.status(400).json({ error: 'sourceDocuments array is required' });
    }

    if (!userPrompt || typeof userPrompt !== 'string') {
      return res.status(400).json({ error: 'userPrompt is required' });
    }

    if (!llmResponse || typeof llmResponse !== 'string') {
      return res.status(400).json({ error: 'llmResponse is required' });
    }

    logger.info('[EndToEndEvaluation API] Starting complete evaluation', {
      recordId,
      applicationId,
      targetGroundedness,
    });

    // Fetch app-specific LLM config
    let appConfig: ILLMConfig | null = null;
    if (applicationId) {
      try {
        appConfig = await llmConfigService.getDefaultConfig(applicationId);
        logger.info('[EndToEndEvaluation API] Using saved LLM config for app:', applicationId);
      } catch (error: unknown) {
        if (error instanceof Error) {
          logger.warn(`[EndToEndEvaluation API] No saved config for app ${applicationId}:`, error.message);
        } else {
          logger.warn(`[EndToEndEvaluation API] No saved config for app ${applicationId}`);
        }
      }
    }

    // Step 1: Detect hallucinations - Pass applicationId to retrieve app-specific LLM config
    const hallucinationAnalysis = await detectHallucinations(
      sourceDocuments,
      userPrompt,
      llmResponse,
      applicationId
    );

    // Step 2: Analyze prompt quality - Pass app-specific config
    const promptQuality = await analyzePromptQuality(userPrompt, appConfig ?? undefined);

    // Step 3: Generate improved prompt if groundedness is below target
    let improvedPrompt = null;
    if (hallucinationAnalysis.groundednessScore < targetGroundedness) {
      improvedPrompt = await generateImprovedPrompt(
        userPrompt,
        [
          ...hallucinationAnalysis.missingContexts,
          ...hallucinationAnalysis.incompleteElements,
          ...hallucinationAnalysis.promptGaps,
        ],
        targetGroundedness,
        appConfig ?? undefined
      );
    }

    res.json({
      success: true,
      recordId,
      applicationId,
      evaluation: {
        hallucinationAnalysis,
        promptQuality,
        improvedPrompt,
        summary: {
          currentGroundedness: hallucinationAnalysis.groundednessScore,
          targetGroundedness,
          gap: Math.max(0, targetGroundedness - hallucinationAnalysis.groundednessScore),
          potentialImprovement: improvedPrompt?.expectedGroundednessIncrease || 0,
          hallucinationCount: hallucinationAnalysis.detectedHallucinations.length,
          suggestionCount: hallucinationAnalysis.suggestions.length,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[EndToEndEvaluation API] Error:', error);
    res.status(500).json({
      error: 'End-to-end evaluation failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default hallucinationDetectionRouter;
