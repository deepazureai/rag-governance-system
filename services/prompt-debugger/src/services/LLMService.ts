import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { LLMConfig, LLMResponse, LLMProvider, RootCauseAnalysis, DebugRecommendation } from '../types/index.js';

/**
 * Multi-Provider LLM Service
 * Supports Claude, OpenAI, DeepSeek, and custom providers
 * Strict type safety with type guards on all external API responses
 */

interface ProviderClient {
  provider: LLMProvider;
  call(prompt: string): Promise<LLMResponse>;
}

export class LLMService {
  private config: LLMConfig;
  private client: ProviderClient;

  constructor(config: LLMConfig) {
    this.validateConfig(config);
    this.config = config;
    this.client = this.createClient(config);
  }

  private validateConfig(config: LLMConfig): void {
    if (!config.provider) throw new Error('LLM provider is required');
    if (!config.model) throw new Error('LLM model is required');
    if (!config.apiKey?.trim()) throw new Error('LLM API key is required');

    const validProviders: LLMProvider[] = ['claude', 'openai', 'deepseek', 'custom'];
    if (!validProviders.includes(config.provider)) {
      throw new Error(`Invalid provider: ${config.provider}`);
    }
  }

  private createClient(config: LLMConfig): ProviderClient {
    switch (config.provider) {
      case 'claude':
        return new ClaudeClient(config);
      case 'openai':
        return new OpenAIClient(config);
      case 'deepseek':
        return new DeepSeekClient(config);
      case 'custom':
        return new CustomClient(config);
      default:
        throw new Error(`Unknown provider: ${config.provider}`);
    }
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

    const response = await this.client.call(prompt);
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
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

    const response = await this.client.call(prompt);
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from LLM response');
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

/**
 * Claude Provider Implementation
 */
class ClaudeClient implements ProviderClient {
  provider: LLMProvider = 'claude';
  private anthropic: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    this.anthropic = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
    this.maxTokens = config.maxTokens || 2048;
  }

  async call(prompt: string): Promise<LLMResponse> {
    const response = await this.anthropic.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return {
      content: content.text,
      provider: 'claude',
      model: this.model,
      tokensUsed: response.usage?.output_tokens || 0,
    };
  }
}

/**
 * OpenAI Provider Implementation
 */
class OpenAIClient implements ProviderClient {
  provider: LLMProvider = 'openai';
  private model: string;
  private apiKey: string;
  private maxTokens: number;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: LLMConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.maxTokens = config.maxTokens || 2048;
  }

  async call(prompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(choices) || !choices[0]) {
      throw new Error('Invalid OpenAI response structure');
    }

    const message = choices[0].message as Record<string, unknown> | undefined;
    if (typeof message?.content !== 'string') {
      throw new Error('Invalid OpenAI message format');
    }

    return {
      content: message.content,
      provider: 'openai',
      model: this.model,
      tokensUsed: (data.usage as Record<string, unknown>)?.completion_tokens as number || 0,
    };
  }
}

/**
 * DeepSeek Provider Implementation
 */
class DeepSeekClient implements ProviderClient {
  provider: LLMProvider = 'deepseek';
  private model: string;
  private apiKey: string;
  private maxTokens: number;
  private baseUrl = 'https://api.deepseek.com/v1';

  constructor(config: LLMConfig) {
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.maxTokens = config.maxTokens || 2048;
  }

  async call(prompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(choices) || !choices[0]) {
      throw new Error('Invalid DeepSeek response structure');
    }

    const message = choices[0].message as Record<string, unknown> | undefined;
    if (typeof message?.content !== 'string') {
      throw new Error('Invalid DeepSeek message format');
    }

    return {
      content: message.content,
      provider: 'deepseek',
      model: this.model,
      tokensUsed: (data.usage as Record<string, unknown>)?.completion_tokens as number || 0,
    };
  }
}

/**
 * Custom Provider Implementation
 * Supports any OpenAI-compatible API endpoint
 */
class CustomClient implements ProviderClient {
  provider: LLMProvider = 'custom';
  private model: string;
  private apiKey: string;
  private baseUrl: string;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    if (!config.baseUrl) {
      throw new Error('baseUrl required for custom provider');
    }
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.maxTokens = config.maxTokens || 2048;
  }

  async call(prompt: string): Promise<LLMResponse> {
    const response = await axios.post(
      `${this.baseUrl}/chat/completions`,
      {
        model: this.model,
        max_tokens: this.maxTokens,
        messages: [{ role: 'user', content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data = response.data as Record<string, unknown>;
    const choices = data.choices as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(choices) || !choices[0]) {
      throw new Error('Invalid custom provider response structure');
    }

    const message = choices[0].message as Record<string, unknown> | undefined;
    if (typeof message?.content !== 'string') {
      throw new Error('Invalid custom provider message format');
    }

    return {
      content: message.content,
      provider: 'custom',
      model: this.model,
      tokensUsed: (data.usage as Record<string, unknown>)?.completion_tokens as number || 0,
    };
  }
}
