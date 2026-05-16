import { z } from 'zod';

/**
 * Validation schemas for Prompt Debugger Service
 * All external data (API requests, env vars) must be validated at runtime
 * This enforces type safety both at compile-time and runtime
 */

// Metric scores must be 0-100
const MetricScoreSchema = z.number().min(0).max(100, 'Score must be 0-100');

// Evaluation scores for a prompt
export const EvaluationScoresSchema = z.object({
  groundedness: MetricScoreSchema,
  relevance: MetricScoreSchema,
  fluency: MetricScoreSchema,
  safety: MetricScoreSchema.optional(),
  coherence: MetricScoreSchema.optional(),
  completeness: MetricScoreSchema.optional(),
});

export type EvaluationScores = z.infer<typeof EvaluationScoresSchema>;

// Main request to analyze a prompt
export const AnalyzePromptRequestSchema = z.object({
  appId: z.string().uuid('Invalid app ID format').min(1),
  promptId: z.string().uuid('Invalid prompt ID format').min(1),
  scores: EvaluationScoresSchema,
  responseText: z.string().min(1, 'Response text is required').max(10000),
  promptText: z.string().min(1, 'Prompt text is required').max(5000),
});

export type AnalyzePromptRequest = z.infer<typeof AnalyzePromptRequestSchema>;

// Root cause analysis response
export const RootCauseSchema = z.object({
  metric: z.enum(['groundedness', 'relevance', 'fluency', 'safety', 'coherence', 'completeness']),
  score: z.number().min(0).max(100),
  issue: z.string().min(1, 'Issue description required'),
  severity: z.enum(['low', 'medium', 'high']),
});

export type RootCause = z.infer<typeof RootCauseSchema>;

// Recommendation for improvement
export const RecommendationSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  example: z.string().optional(),
  expectedScoreImprovement: z.number().min(0).max(100),
});

export type Recommendation = z.infer<typeof RecommendationSchema>;

// Complete analysis result
export const AnalysisResultSchema = z.object({
  appId: z.string().uuid(),
  promptId: z.string().uuid(),
  timestamp: z.string().datetime(),
  rootCauses: z.array(RootCauseSchema).min(1, 'At least one root cause'),
  recommendations: z.array(RecommendationSchema).min(1, 'At least one recommendation'),
  overallScore: z.number().min(0).max(100),
  similarHighScoringPrompts: z.array(z.object({
    id: z.string(),
    text: z.string(),
    avgScore: z.number(),
  })).optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

// Environment variables validation
export const EnvSchema = z.object({
  PORT: z.string().default('3001').transform(Number),
  MONGODB_URI: z.string().url('Invalid MongoDB URI'),
  CLAUDE_API_KEY: z.string().min(1, 'Claude API key required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Utility: Safely parse environment variables with type safety
 * Usage: const env = parseEnv(process.env);
 */
export function parseEnv(env: unknown): Env {
  const result = EnvSchema.safeParse(env);
  
  if (!result.success) {
    console.error('Environment validation failed:', result.error.flatten());
    throw new Error('Invalid environment variables');
  }
  
  return result.data;
}
