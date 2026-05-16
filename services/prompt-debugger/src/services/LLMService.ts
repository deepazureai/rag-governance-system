import axios, { AxiosError } from 'axios';
import { Env } from '../schemas/validation';

/**
 * Claude LLM Service for root cause analysis
 * Integrates with Anthropic SDK with strict type safety
 */

import Anthropic from '@anthropic-ai/sdk';
import { RootCauseAnalysis, DebugRecommendation } from '../types/index.js';

export class LLMService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(apiKey: string, model = 'claude-opus-4-1-20250805', maxTokens = 2048) {
    if (!apiKey?.trim()) {
      throw new Error('Claude API key is required');
    }
    this.client = new Anthropic({ apiKey });
    this.model = model;
    this.maxTokens = maxTokens;
  }

  async analyzeRootCauses(
    promptText: string,
    actualOutput: string,
    scores: Record<string, number>,
  ): Promise<RootCauseAnalysis[]> {
    const scoredMetrics = Object.entries(scores)
      .filter(([, score]) => score < 80)
      .map(([metric, score]) => `- ${metric}: ${score}/100`)
      .join('\n');

    if (!scoredMetrics) {
      return [];
    }

    const prompt = `Analyze why these metrics scored low.

Prompt: ${promptText}
Output: ${actualOutput}

Low-scoring metrics:
${scoredMetrics}

For each metric below 80, identify the root cause and provide evidence. Return JSON array:
[{"metric": "name", "currentScore": num, "expectedScore": num, "gap": num, "issue": "description", "severity": "low|medium|high", "evidence": ["quote1"]}]`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    const analyses = JSON.parse(jsonMatch[0]) as unknown[];
    return this.validateRootCauseAnalyses(analyses);
  }

  async generateRecommendations(
    rootCauses: RootCauseAnalysis[],
    promptText: string,
  ): Promise<DebugRecommendation[]> {
    if (rootCauses.length === 0) {
      return [];
    }

    const issues = rootCauses
      .map((rc) => `- ${rc.metric} (${rc.currentScore}/100): ${rc.issue}`)
      .join('\n');

    const prompt = `Generate specific recommendations to improve these metrics.

Current Prompt: ${promptText}

Issues:
${issues}

Return JSON array with structure:
[{"id": "rec_1", "metricToImprove": "metric", "title": "title", "description": "desc", "actionableSteps": ["step1"], "exampleBefore": "before", "exampleAfter": "after", "expectedScoreImprovement": 10}]`;

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const jsonMatch = content.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from Claude response');
    }

    const recommendations = JSON.parse(jsonMatch[0]) as unknown[];
    return this.validateRecommendations(recommendations);
  }

  private validateRootCauseAnalyses(data: unknown[]): RootCauseAnalysis[] {
    const validMetrics = ['groundedness', 'relevance', 'fluency', 'safety', 'coherence', 'completeness'];
    const validSeverities = ['low', 'medium', 'high'];

    return data.map((item) => {
      const obj = item as Record<string, unknown>;

      if (typeof obj.metric !== 'string' || !validMetrics.includes(obj.metric)) {
        throw new Error(`Invalid metric: ${obj.metric}`);
      }
      if (typeof obj.currentScore !== 'number' || obj.currentScore < 0 || obj.currentScore > 100) {
        throw new Error('Invalid currentScore');
      }
      if (typeof obj.expectedScore !== 'number' || obj.expectedScore < 0 || obj.expectedScore > 100) {
        throw new Error('Invalid expectedScore');
      }
      if (typeof obj.issue !== 'string' || obj.issue.length < 5) {
        throw new Error('Invalid issue');
      }
      if (typeof obj.severity !== 'string' || !validSeverities.includes(obj.severity)) {
        throw new Error(`Invalid severity: ${obj.severity}`);
      }
      if (!Array.isArray(obj.evidence) || !obj.evidence.every((e) => typeof e === 'string')) {
        throw new Error('Invalid evidence array');
      }

      return {
        metric: obj.metric as RootCauseAnalysis['metric'],
        currentScore: obj.currentScore as number,
        expectedScore: obj.expectedScore as number,
        gap: (obj.currentScore as number) - (obj.expectedScore as number),
        issue: obj.issue as string,
        severity: obj.severity as RootCauseAnalysis['severity'],
        evidence: obj.evidence as string[],
      };
    });
  }

  private validateRecommendations(data: unknown[]): DebugRecommendation[] {
    const validMetrics = ['groundedness', 'relevance', 'fluency', 'safety', 'coherence', 'completeness'];

    return data.map((item) => {
      const obj = item as Record<string, unknown>;

      if (typeof obj.id !== 'string') throw new Error('Invalid id');
      if (typeof obj.metricToImprove !== 'string' || !validMetrics.includes(obj.metricToImprove)) {
        throw new Error('Invalid metricToImprove');
      }
      if (typeof obj.title !== 'string' || obj.title.length < 3) throw new Error('Invalid title');
      if (typeof obj.description !== 'string' || obj.description.length < 5) throw new Error('Invalid description');
      if (!Array.isArray(obj.actionableSteps) || !obj.actionableSteps.every((s) => typeof s === 'string')) {
        throw new Error('Invalid actionableSteps');
      }
      if (typeof obj.exampleBefore !== 'string') throw new Error('Invalid exampleBefore');
      if (typeof obj.exampleAfter !== 'string') throw new Error('Invalid exampleAfter');
      if (typeof obj.expectedScoreImprovement !== 'number' || obj.expectedScoreImprovement < 0 || obj.expectedScoreImprovement > 30) {
        throw new Error('Invalid expectedScoreImprovement');
      }

      return {
        id: obj.id as string,
        metricToImprove: obj.metricToImprove as DebugRecommendation['metricToImprove'],
        title: obj.title as string,
        description: obj.description as string,
        actionableSteps: obj.actionableSteps as string[],
        exampleBefore: obj.exampleBefore as string,
        exampleAfter: obj.exampleAfter as string,
        expectedScoreImprovement: obj.expectedScoreImprovement as number,
      };
    });
  }
}
