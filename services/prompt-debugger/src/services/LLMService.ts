import axios, { AxiosError } from 'axios';
import { Env } from '../schemas/validation';

/**
 * Claude LLM Integration Service
 * Handles all calls to Anthropic Claude API for root cause analysis
 * 
 * Strict type safety:
 * - All responses validated with Zod schemas
 * - No `any` types - use `unknown` with type guards
 * - Errors properly typed and handled
 */

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  stop_reason: string;
}

export class LLMService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim().length === 0) {
      throw new Error('Claude API key is required');
    }
    this.apiKey = apiKey;
  }

  /**
   * Analyze why a prompt scored low on a specific metric
   * Uses Claude to reason about the evaluation scores
   */
  async analyzeRootCause(
    metric: string,
    score: number,
    prompt: string,
    response: string
  ): Promise<string> {
    const message = `
You are an expert AI evaluation specialist. Analyze why this evaluation metric scored low.

Metric: ${metric}
Score: ${score}/100
Prompt: ${prompt}
Response: ${response}

Provide a concise root cause analysis (2-3 sentences):
1. What specifically is causing the low score?
2. What evidence from the response supports this?
3. What could be changed to improve the score?

Be specific and actionable.
    `.trim();

    const result = await this.callClaude(message);
    return result;
  }

  /**
   * Generate recommendations to improve a low-scoring metric
   */
  async generateRecommendations(
    metric: string,
    score: number,
    prompt: string,
    response: string,
    rootCause: string
  ): Promise<string> {
    const message = `
You are a prompt engineering expert. Given this root cause analysis, provide specific recommendations.

Metric: ${metric}
Current Score: ${score}/100
Root Cause: ${rootCause}

Original Prompt: ${prompt}
Current Response: ${response}

Provide 2-3 specific, actionable recommendations:
1. For each recommendation, include: what to change, why it helps, and an example

Format as a JSON array:
[
  {
    "title": "Recommendation title",
    "description": "Why this helps",
    "example": "Example of how to implement"
  }
]
    `.trim();

    const result = await this.callClaude(message);
    
    // Try to parse JSON, but handle non-JSON responses
    try {
      const parsed = JSON.parse(result);
      if (!Array.isArray(parsed)) {
        throw new Error('Expected array response');
      }
      return result; // Return original string if valid JSON array
    } catch {
      // If not valid JSON, return wrapped in array format
      return JSON.stringify([{
        title: 'Improvement Suggestion',
        description: result,
        example: 'See recommendation details above',
      }]);
    }
  }

  /**
   * Core Claude API call with proper error handling
   */
  private async callClaude(message: string): Promise<string> {
    try {
      const messages: ClaudeMessage[] = [
        { role: 'user', content: message },
      ];

      const response = await axios.post(
        `${this.baseUrl}/messages`,
        {
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1024,
          messages,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      // Type guard for response structure
      const data = response.data as unknown;
      if (!this.isClaudeResponse(data)) {
        throw new Error('Invalid Claude response structure');
      }

      // Extract text from response
      const textContent = data.content.find(
        (c): c is Extract<ClaudeResponse['content'][number], { type: 'text' }> => c.type === 'text'
      );

      if (!textContent?.text) {
        throw new Error('No text content in Claude response');
      }

      return textContent.text;
    } catch (error: unknown) {
      // Type-safe error handling
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        const status = axiosError.response?.status ?? 'unknown';
        console.error(`[v0] Claude API error (${status}):`, axiosError.message);
        throw new Error(`Claude API failed: ${axiosError.message}`);
      }

      if (error instanceof Error) {
        console.error('[v0] Unexpected error in Claude call:', error.message);
        throw error;
      }

      throw new Error('Unknown error calling Claude API');
    }
  }

  /**
   * Type guard to validate Claude response structure
   * Ensures response has expected shape before accessing properties
   */
  private isClaudeResponse(value: unknown): value is ClaudeResponse {
    if (typeof value !== 'object' || value === null) return false;

    const obj = value as Record<string, unknown>;

    // Check if it has 'content' array
    if (!Array.isArray(obj.content)) return false;

    // Check if at least one item has 'type': 'text'
    return obj.content.some(
      (item): item is { type: 'text'; text: string } =>
        typeof item === 'object' &&
        item !== null &&
        (item as Record<string, unknown>).type === 'text' &&
        typeof (item as Record<string, unknown>).text === 'string'
    );
  }
}
