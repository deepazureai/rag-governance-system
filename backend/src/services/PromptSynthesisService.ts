import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
import { PromptTemplate } from '../models/PromptTemplate';
import { RawDataRecord } from '../models/RawDataRecord';
import { logger } from '../utils/logger';
import { 
  CrewAITemplate, 
  PromptSynthesisRequest,
  PromptSynthesisResponse 
} from '../utils/validation/templates-validation';

/**
 * LLM Synthesis Service
 * Combines multiple prompts from KB and recommendations into a single optimized prompt
 * Validates that synthesized prompt meets quality metrics threshold
 */
export class PromptSynthesisService {
  private static readonly METRICS_THRESHOLD = 70;
  private static readonly LLM_MODEL = process.env.LLM_SYNTHESIS_MODEL || 'gpt-4-turbo';

  /**
   * Synthesize multiple prompts into a single optimized prompt via LLM
   * Ensures all metrics score above threshold
   */
  async synthesizePrompts(
    request: PromptSynthesisRequest,
    userId: string
  ): Promise<PromptSynthesisResponse> {
    const synthesisRequestId = uuidv4();
    const threshold = request.metricsThreshold || PromptSynthesisService.METRICS_THRESHOLD;

    try {
      logger.info(`[PromptSynthesisService] Starting synthesis for ${request.sourceKBThreadIds.length + request.sourceRecommendationIds.length} prompts`);

      // Fetch source prompts from KB threads and recommendations
      const sourcePrompts = await this.gatherSourcePrompts(
        request.sourceKBThreadIds,
        request.sourceRecommendationIds
      );

      if (sourcePrompts.length === 0) {
        throw new Error('No source prompts found to synthesize');
      }

      // Build LLM synthesis prompt
      const synthesisPrompt = this.buildSynthesisPrompt(sourcePrompts, threshold);

      // Call LLM for synthesis
      const synthesisResult = await this.callLLMForSynthesis(synthesisPrompt);

      // Parse LLM response
      const parsedResult = JSON.parse(synthesisResult) as {
        synthesized_prompt: string;
        crew_ai_template: {
          actor: string;
          objective: string;
          task: string;
          context: string;
          expected_output: string;
        };
        synthesis_notes?: string;
      };

      // Extract metrics and validate
      const metrics = await this.calculateSynthesisMetrics(
        sourcePrompts,
        parsedResult.synthesized_prompt
      );

      // Validate all metrics exceed threshold
      this.validateMetricsThreshold(metrics, threshold);

      const response: PromptSynthesisResponse = {
        synthesisRequestId,
        synthesizedPrompt: parsedResult.synthesized_prompt,
        crewAITemplate: {
          actor: parsedResult.crew_ai_template.actor,
          objective: parsedResult.crew_ai_template.objective,
          task: parsedResult.crew_ai_template.task,
          context: parsedResult.crew_ai_template.context,
          expectedOutput: parsedResult.crew_ai_template.expected_output,
          toolsRequired: [],  // Default empty array
        },
        synthesisMetrics: metrics,
        synthesisNotes: parsedResult.synthesis_notes,
        inputPromptCount: sourcePrompts.length,
        synthesizedAt: new Date(),
        synthesizedBy: userId,
      };

      logger.info(`[PromptSynthesisService] Synthesis complete: ${synthesisRequestId}`, { 
        metrics: metrics.overall_score 
      });

      return response;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[PromptSynthesisService] Synthesis failed: ${errorMessage}`);
      throw new Error(`Prompt synthesis failed: ${errorMessage}`);
    }
  }

  /**
   * Gather source prompts from KB threads and recommendations
   */
  private async gatherSourcePrompts(
    kbThreadIds: string[],
    recommendationIds: string[]
  ): Promise<Array<{ id: string; content: string; source: 'kb' | 'recommendation' }>> {
    const sourcePrompts: Array<{ id: string; content: string; source: 'kb' | 'recommendation' }> = [];

    // Fetch KB thread prompts
    if (kbThreadIds.length > 0) {
      const kbRecords = await RawDataRecord.find({
        'knowledgeBase.chatThreads.threadId': { $in: kbThreadIds },
      }).select('knowledgeBase.chatThreads');

      for (const record of kbRecords) {
        const threads = record.knowledgeBase?.chatThreads || [];
        for (const thread of threads) {
          if (kbThreadIds.includes(thread.threadId)) {
            const threadContent = thread.messages
              .filter((m) => m.role === 'assistant')
              .map((m) => m.content)
              .join('\n');
            
            sourcePrompts.push({
              id: thread.threadId,
              content: threadContent,
              source: 'kb',
            });
          }
        }
      }
    }

    // Fetch recommendation prompts from BA review improvements
    if (recommendationIds.length > 0) {
      const recRecords = await RawDataRecord.find({
        'baReview.promptImprovements': { $exists: true },
      }).select('baReview.promptImprovements');

      for (const record of recRecords) {
        const improvements = record.baReview?.promptImprovements || [];
        for (let i = 0; i < improvements.length; i++) {
          const improvement = improvements[i];
          if (!improvement) continue;
          // Generate deterministic ID from position and record ID
          const improvementId = `${record._id}-imp-${i}`;
          if (recommendationIds.includes(improvementId)) {
            sourcePrompts.push({
              id: improvementId,
              content: improvement.improvedPrompt,
              source: 'recommendation',
            });
          }
        }
      }
    }

    return sourcePrompts;
  }

  /**
   * Build the LLM synthesis prompt
   */
  private buildSynthesisPrompt(
    sourcePrompts: Array<{ id: string; content: string; source: string }>,
    threshold: number
  ): string {
    const promptsList = sourcePrompts
      .map(
        (p, i) =>
          `Source ${i + 1} (${p.source}):\n${p.content}`
      )
      .join('\n\n---\n\n');

    return `You are an expert prompt engineer. Synthesize the following prompts into a single, optimized prompt that:

1. Maintains all critical instructions from source prompts
2. Eliminates redundancy and improves clarity
3. Follows CrewAI format with Actor/Objective/Task/Context/ExpectedOutput
4. Targets high-quality metrics (all scores > ${threshold})

Source Prompts:
${promptsList}

Return ONLY valid JSON (no markdown, no explanation):
{
  "synthesized_prompt": "The complete optimized prompt",
  "crew_ai_template": {
    "actor": "Role/persona for this task",
    "objective": "High-level goal",
    "task": "Detailed task description (>20 chars)",
    "context": "Background and constraints",
    "expected_output": "Success criteria and format"
  },
  "synthesis_notes": "Brief explanation of what was combined/improved"
}`;
  }

  /**
   * Call LLM for synthesis
   */
  private async callLLMForSynthesis(synthesisPrompt: string): Promise<string> {
    // TODO: Integrate with your LLM provider (OpenAI, Anthropic, etc.)
    // This is a placeholder - replace with actual LLM call
    
    logger.warn('[PromptSynthesisService] LLM call not implemented - using mock response');
    
    // Mock response for demonstration
    return JSON.stringify({
      synthesized_prompt: 'Synthesized prompt placeholder',
      crew_ai_template: {
        actor: 'QA Analyst',
        objective: 'Ensure data quality',
        task: 'Review and validate data using provided criteria',
        context: 'Quality standards and validation rules',
        expected_output: 'Detailed quality report with findings',
      },
      synthesis_notes: 'Combined KB and recommendation prompts for optimal results',
    });
  }

  /**
   * Calculate synthesis metrics
   */
  private async calculateSynthesisMetrics(
    sourcePrompts: Array<{ id: string; content: string }>,
    synthesizedPrompt: string
  ): Promise<{
    faithfulness: number;
    answer_relevancy: number;
    context_precision: number;
    context_recall: number;
    correctness: number;
    overall_score: number;
  }> {
    // TODO: Calculate actual metrics using evaluation framework
    // This is a placeholder - replace with actual metrics calculation
    
    logger.warn('[PromptSynthesisService] Metrics calculation not implemented - using mock values');

    return {
      faithfulness: 85,
      answer_relevancy: 82,
      context_precision: 88,
      context_recall: 80,
      correctness: 84,
      overall_score: 84,
    };
  }

  /**
   * Validate that all metrics exceed threshold
   */
  private validateMetricsThreshold(
    metrics: {
      faithfulness: number;
      answer_relevancy: number;
      context_precision: number;
      context_recall: number;
      correctness: number;
      overall_score: number;
    },
    threshold: number
  ): void {
    const metricValues = [
      metrics.faithfulness,
      metrics.answer_relevancy,
      metrics.context_precision,
      metrics.context_recall,
      metrics.correctness,
    ];

    const failedMetrics = metricValues.filter((v) => v < threshold);

    if (failedMetrics.length > 0) {
      throw new Error(
        `Synthesis metrics validation failed: ${failedMetrics.length} metrics below ${threshold} threshold`
      );
    }

    logger.info('[PromptSynthesisService] All metrics pass threshold validation');
  }
}

export const promptSynthesisService = new PromptSynthesisService();
