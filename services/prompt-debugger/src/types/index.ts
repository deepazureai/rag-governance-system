/**
 * Shared types for prompt debugger service
 * These are the "single source of truth" for data structures
 */

// LLM Provider Configuration
export type LLMProvider = 'claude' | 'openai' | 'deepseek' | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string; // For custom providers
  temperature?: number;
  maxTokens?: number;
}

export interface LLMRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  tokensUsed: number;
}

/**
 * Represents a low-scoring metric and why it's scoring low
 */
export interface RootCauseAnalysis {
  metric: 'groundedness' | 'relevance' | 'fluency' | 'safety' | 'coherence' | 'completeness';
  currentScore: number; // 0-100
  expectedScore: number; // Based on similar prompts
  gap: number; // currentScore - expectedScore (usually negative)
  issue: string; // Human-readable explanation
  severity: 'low' | 'medium' | 'high';
  evidence: string[]; // Quotes from response showing the issue
}

/**
 * Recommendation to improve a specific metric
 */
export interface DebugRecommendation {
  id: string;
  metricToImprove: 'groundedness' | 'relevance' | 'fluency' | 'safety' | 'coherence' | 'completeness';
  title: string; // e.g., "Add source citations"
  description: string;
  actionableSteps: string[];
  exampleBefore: string;
  exampleAfter: string;
  expectedScoreImprovement: number; // How many points we expect to gain
}

/**
 * Complete debug analysis for a prompt
 */
export interface PromptDebugAnalysis {
  promptId: string;
  appId: string;
  analyzedAt: Date;
  rootCauses: RootCauseAnalysis[];
  recommendations: DebugRecommendation[];
  
  // Comparison data
  averageScoreInApp: number;
  yourScore: number;
  topPercentile: number; // Which percentile this prompt falls into
  
  // Similar prompts that scored better
  topSimilarPrompts: Array<{
    id: string;
    text: string;
    avgScore: number;
    keyDifferences: string[];
  }>;
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Type guard for ErrorResponse
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return 'error' in obj && typeof obj.error === 'object' && obj.error !== null;
}

/**
 * Cache entry for LRU cache
 */
export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * Configuration for LRU cache
 */
export interface LRUCacheConfig {
  maxSize: number;
  ttl?: number;
}
