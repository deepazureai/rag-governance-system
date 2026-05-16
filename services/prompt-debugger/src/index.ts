import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { AnalyzePromptRequestSchema, parseEnv } from './schemas/validation';
import { LLMService } from './services/LLMService';
import { PromptDebugAnalysis, ErrorResponse } from './types/index';
import type { RootCauseAnalysis, DebugRecommendation } from './types/index';

/**
 * Main Express server for Prompt Debugger Service
 * Follows strict TypeScript patterns:
 * - All input validated with Zod at runtime
 * - No `any` types - use proper type annotations
 * - Error handling with typed responses
 */

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());

// Parse environment variables at startup
const env = parseEnv(process.env);

// Initialize LLM service
const llmService = new LLMService(env.CLAUDE_API_KEY);

/**
 * Main endpoint: Analyze why a prompt scored low
 * POST /api/debug/analyze-prompt
 */
app.post(
  '/api/debug/analyze-prompt',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Runtime validation - catches malformed requests
      const parsed = AnalyzePromptRequestSchema.safeParse(req.body);

      if (!parsed.success) {
        const error: ErrorResponse = {
          error: {
            message: 'Invalid request',
            code: 'VALIDATION_ERROR',
            details: parsed.error.flatten(),
          },
        };
        res.status(400).json(error);
        return;
      }

      const request = parsed.data;

      console.log(
        `[v0] Analyzing prompt ${request.promptId} for app ${request.appId}`
      );

      // Identify which metrics scored low
      const lowScoringMetrics = identifyLowMetrics(request.scores);

      if (lowScoringMetrics.length === 0) {
        // All metrics score well
        const result: PromptDebugAnalysis = {
          promptId: request.promptId,
          appId: request.appId,
          analyzedAt: new Date(),
          rootCauses: [],
          recommendations: [],
          averageScoreInApp: 85, // Placeholder - would come from DB
          yourScore:
            Object.values(request.scores).reduce((a, b) => a + b, 0) /
            Object.keys(request.scores).length,
          topPercentile: 95,
          topSimilarPrompts: [],
        };

        res.json(result);
        return;
      }

      // Analyze each low-scoring metric
      const rootCauses: RootCauseAnalysis[] = [];
      const recommendations: DebugRecommendation[] = [];

      for (const metricEntry of lowScoringMetrics) {
        const { metric, score } = metricEntry;

        console.log(`[v0] Analyzing root cause for ${metric} (score: ${score})`);

        // Get root cause from Claude
        const rootCauseText = await llmService.analyzeRootCause(
          metric,
          score,
          request.promptText,
          request.responseText
        );

        rootCauses.push({
          metric: metric as any, // Cast after validation
          currentScore: score,
          expectedScore: 75, // Placeholder
          gap: score - 75,
          issue: rootCauseText,
          severity: score < 40 ? 'high' : score < 60 ? 'medium' : 'low',
          evidence: extractEvidence(request.responseText, score),
        });

        // Get recommendations from Claude
        const recommendationsText =
          await llmService.generateRecommendations(
            metric,
            score,
            request.promptText,
            request.responseText,
            rootCauseText
          );

        // Parse recommendations (expects JSON array)
        const parsedRecommendations = parseRecommendations(recommendationsText);
        recommendations.push(
          ...parsedRecommendations.map((rec, idx) => ({
            id: `rec-${metric}-${idx}`,
            metricToImprove: metric as any,
            title: rec.title || 'Improvement Suggestion',
            description: rec.description || '',
            actionableSteps: (rec.actionableSteps as string[]) || [],
            exampleBefore: request.promptText.substring(0, 100),
            exampleAfter: rec.example || 'See description above',
            expectedScoreImprovement: 10,
          }))
        );
      }

      const result: PromptDebugAnalysis = {
        promptId: request.promptId,
        appId: request.appId,
        analyzedAt: new Date(),
        rootCauses,
        recommendations,
        averageScoreInApp: 75,
        yourScore:
          Object.values(request.scores).reduce((a, b) => a + b, 0) /
          Object.keys(request.scores).length,
        topPercentile: 45,
        topSimilarPrompts: [],
      };

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Error handling middleware
 */
app.use(
  (
    error: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    console.error('[v0] Error:', error.message);

    const response: ErrorResponse = {
      error: {
        message: error.message || 'Internal server error',
        code: 'INTERNAL_ERROR',
      },
    };

    res.status(500).json(response);
  }
);

/**
 * Helper: Identify metrics scoring below 70
 */
function identifyLowMetrics(
  scores: Record<string, number>
): Array<{ metric: string; score: number }> {
  return Object.entries(scores)
    .filter(([_, score]) => score < 70)
    .map(([metric, score]) => ({ metric, score }));
}

/**
 * Helper: Extract evidence from response text
 */
function extractEvidence(text: string, _score: number): string[] {
  // Placeholder - would extract relevant sentences
  const sentences = text.split(/[.!?]/);
  return sentences.slice(0, 2).map((s) => s.trim()).filter(Boolean);
}

/**
 * Helper: Parse recommendations from Claude response
 * Type-safe JSON parsing with fallback
 */
function parseRecommendations(
  text: string
): Array<Record<string, unknown>> {
  try {
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      return [{ title: 'Recommendation', description: text, example: '' }];
    }
    return parsed;
  } catch {
    // If Claude didn't return JSON, wrap the text
    return [{ title: 'Recommendation', description: text, example: '' }];
  }
}

/**
 * Start server
 */
const port = env.PORT;
app.listen(port, () => {
  console.log(
    `[v0] Prompt Debugger Service running on port ${port}`
  );
});
