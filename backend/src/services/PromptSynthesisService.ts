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
    const llmProvider = process.env.LLM_PROVIDER || 'openai';
    const apiKey = process.env.LLM_API_KEY;
    
    if (!apiKey) {
      logger.error('[PromptSynthesisService] LLM_API_KEY not configured');
      throw new Error('LLM API key not configured. Set LLM_API_KEY environment variable.');
    }

    try {
      if (llmProvider === 'openai') {
        return await this.callOpenAI(synthesisPrompt, apiKey);
      } else if (llmProvider === 'anthropic') {
        return await this.callAnthropic(synthesisPrompt, apiKey);
      } else {
        throw new Error(`Unsupported LLM provider: ${llmProvider}`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[PromptSynthesisService] LLM call failed:', message);
      throw new Error(`LLM synthesis failed: ${message}`);
    }
  }

  /**
   * Call OpenAI API for synthesis
   */
  private async callOpenAI(synthesisPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert prompt engineer. Synthesize the provided prompts into a structured CrewAI template.',
          },
          {
            role: 'user',
            content: synthesisPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    return content;
  }

  /**
   * Call Anthropic API for synthesis
   */
  private async callAnthropic(synthesisPrompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-3-sonnet-20240229',
        max_tokens: 2000,
        system: 'You are an expert prompt engineer. Synthesize the provided prompts into a structured CrewAI template.',
        messages: [
          {
            role: 'user',
            content: synthesisPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.statusText}`);
    }

    const data = await response.json() as { content: Array<{ text: string }> };
    const content = data.content?.[0]?.text;
    
    if (!content) {
      throw new Error('Empty response from Anthropic');
    }

    return content;
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
    try {
      // Compute basic metrics based on synthesis quality
      const sourceContent = sourcePrompts.map(p => p.content).join('\n');
      
      // Faithfulness: How well synthesis adheres to source materials
      const faithfulness = this.calculateFaithfulness(synthesizedPrompt, sourceContent);
      
      // Answer Relevancy: Relevance to problem statement
      const answerRelevancy = this.calculateAnswerRelevancy(synthesizedPrompt);
      
      // Context Precision: Ratio of relevant context used
      const contextPrecision = this.calculateContextPrecision(synthesizedPrompt, sourceContent);
      
      // Context Recall: Coverage of important source material
      const contextRecall = this.calculateContextRecall(synthesizedPrompt, sourceContent);
      
      // Correctness: Grammatical and semantic correctness
      const correctness = this.calculateCorrectness(synthesizedPrompt);
      
      // Overall score: Average of all metrics
      const overall_score = Math.round(
        (faithfulness + answerRelevancy + contextPrecision + contextRecall + correctness) / 5
      );

      logger.info('[PromptSynthesisService] Metrics calculated:', {
        faithfulness,
        answer_relevancy: answerRelevancy,
        context_precision: contextPrecision,
        context_recall: contextRecall,
        correctness,
        overall_score,
      });

      return {
        faithfulness,
        answer_relevancy: answerRelevancy,
        context_precision: contextPrecision,
        context_recall: contextRecall,
        correctness,
        overall_score,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('[PromptSynthesisService] Metrics calculation error:', message);
      // Return conservative metrics on error
      return {
        faithfulness: 0,
        answer_relevancy: 0,
        context_precision: 0,
        context_recall: 0,
        correctness: 0,
        overall_score: 0,
      };
    }
  }

  /**
   * Calculate faithfulness score (how well synthesis adheres to sources)
   */
  private calculateFaithfulness(synthesizedPrompt: string, sourceContent: string): number {
    if (!sourceContent || sourceContent.length === 0) return 50;
    
    // Simple heuristic: check if key terms from source appear in synthesis
    const sourceWords = sourceContent.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    const synthesisWords = synthesizedPrompt.toLowerCase().split(/\s+/);
    
    const matchedWords = sourceWords.filter(word => synthesisWords.some(w => w.includes(word)));
    const score = Math.round((matchedWords.length / Math.max(sourceWords.length, 1)) * 100);
    
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate answer relevancy score
   */
  private calculateAnswerRelevancy(synthesizedPrompt: string): number {
    // Check for CrewAI structure completeness
    const hasActor = /actor[:=\s]/.test(synthesizedPrompt);
    const hasObjective = /objective[:=\s]/.test(synthesizedPrompt);
    const hasTask = /task[:=\s]/.test(synthesizedPrompt);
    const hasContext = /context[:=\s]/.test(synthesizedPrompt);
    const hasOutput = /output|expected|deliverable/i.test(synthesizedPrompt);
    
    const structureScore = [hasActor, hasObjective, hasTask, hasContext, hasOutput].filter(Boolean).length * 20;
    return Math.min(100, Math.max(0, structureScore));
  }

  /**
   * Calculate context precision score
   */
  private calculateContextPrecision(synthesizedPrompt: string, sourceContent: string): number {
    if (!sourceContent) return 50;
    
    // Check ratio of useful context vs noise
    const synthesisLength = synthesizedPrompt.length;
    const sourceLength = sourceContent.length;
    
    // Score higher if synthesis is concise relative to source
    const ratio = Math.min(1, synthesisLength / sourceLength);
    return Math.round(ratio * 100);
  }

  /**
   * Calculate context recall score
   */
  private calculateContextRecall(synthesizedPrompt: string, sourceContent: string): number {
    if (!sourceContent) return 50;
    
    // Check if major themes from source are covered
    const sourceChunks = sourceContent.split(/[.!?]\s+/).filter(c => c.length > 20);
    const coveredChunks = sourceChunks.filter(chunk => {
      const keyWords = chunk.split(/\s+/).filter(w => w.length > 5);
      return keyWords.some(w => synthesizedPrompt.toLowerCase().includes(w.toLowerCase()));
    });
    
    const score = Math.round((coveredChunks.length / Math.max(sourceChunks.length, 1)) * 100);
    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate correctness score
   */
  private calculateCorrectness(synthesizedPrompt: string): number {
    // Basic checks for well-formed output
    let score = 50;
    
    // Deduct for common issues
    if (synthesizedPrompt.length < 50) score -= 20; // Too short
    if (!/[.!?]$/.test(synthesizedPrompt)) score -= 10; // Missing punctuation
    if (/\{|\}|\[|\]/.test(synthesizedPrompt) && !/json|object|array/i.test(synthesizedPrompt)) score -= 5; // Unmatched brackets
    
    return Math.min(100, Math.max(0, score));
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
