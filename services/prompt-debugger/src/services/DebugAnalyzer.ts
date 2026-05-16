/**
 * DebugAnalyzer - Core business logic for prompt debugging
 * Orchestrates LLM analysis and persistence with configurable LLM providers
 */

import { LLMService } from './LLMService.js';
import { PromptDebugAnalysis, RootCauseAnalysis, DebugRecommendation, LLMConfig } from '../types/index.js';

export class DebugAnalyzer {
  private llmService: LLMService;
  private llmConfig: LLMConfig;

  constructor(llmConfig: LLMConfig) {
    this.llmConfig = llmConfig;
    this.llmService = new LLMService(llmConfig);
    console.log(`[v0] DebugAnalyzer initialized with ${llmConfig.provider} provider`);
  }

  /**
   * Change LLM provider at runtime (useful for per-app configuration)
   */
  setLLMConfig(llmConfig: LLMConfig): void {
    this.llmConfig = llmConfig;
    this.llmService = new LLMService(llmConfig);
    console.log(`[v0] LLM provider switched to ${llmConfig.provider}`);
  }

  async analyzePrompt(
    promptId: string,
    appId: string,
    promptText: string,
    actualOutput: string,
    scores: Record<string, number>,
  ): Promise<PromptDebugAnalysis> {
    console.log(`[v0] Starting debug analysis for prompt ${promptId} in app ${appId} using ${this.llmConfig.provider}`);

    try {
      // Step 1: Analyze root causes for low-scoring metrics
      const rootCauses = await this.llmService.analyzeRootCauses(
        promptText,
        actualOutput,
        scores,
      );

      console.log(`[v0] Found ${rootCauses.length} root causes`);

      // Step 2: Generate recommendations
      const recommendations = rootCauses.length > 0
        ? await this.llmService.generateRecommendations(rootCauses, promptText)
        : [];

      console.log(`[v0] Generated ${recommendations.length} recommendations`);

      // Step 3: Calculate statistics
      const allScores = Object.values(scores);
      const yourScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b) / allScores.length) : 0;
      const averageScoreInApp = 75; // This would be fetched from DB in production
      const topPercentile = this.calculatePercentile(yourScore, [80, 75, 70, 85, 72, 88, 65, 90, 78, 82]); // Mock percentiles

      // Step 4: Compile analysis
      const analysis: PromptDebugAnalysis = {
        promptId,
        appId,
        analyzedAt: new Date(),
        rootCauses,
        recommendations,
        averageScoreInApp,
        yourScore,
        topPercentile,
        topSimilarPrompts: [
          {
            id: 'prompt_top_1',
            text: 'Example high-scoring prompt similar to yours',
            avgScore: 88,
            keyDifferences: [
              'Includes explicit source citations',
              'More structured output format',
              'Clearer context boundaries',
            ],
          },
        ],
      };

      console.log(`[v0] Debug analysis complete for ${promptId}`);
      return analysis;
    } catch (error) {
      console.error(`[v0] Error analyzing prompt ${promptId}:`, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private calculatePercentile(score: number, allScores: number[]): number {
    const sorted = [...allScores].sort((a, b) => a - b);
    const index = sorted.findIndex((s) => s >= score);
    return index >= 0 ? Math.round((index / sorted.length) * 100) : 100;
  }
}
