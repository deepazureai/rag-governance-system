import { getAzureOpenAIClient, getDeploymentId } from './AzureOpenAIConfig.js';
import { llmConfigService } from './LLMConfigService.js';

/**
 * Hallucination Detection Service
 * Uses Azure OpenAI as LLM Judge to detect hallucinations and provide detailed reasoning
 */

export interface HallucinationAnalysis {
  hallucinationScore: number; // 0-100: 0=no hallucination, 100=severe hallucination
  groundednessScore: number; // 0-100: how well grounded in source material
  detectedHallucinations: string[];
  missingContexts: string[]; // What's missing from the prompt
  incompleteElements: string[]; // What's incomplete in the prompt
  promptGaps: string[]; // Specific gaps in prompt structure
  suggestions: PromptSuggestion[];
  reasoning: string;
  rawAnalysis: string;
}

export interface PromptSuggestion {
  category: 'structure' | 'context' | 'clarity' | 'constraints';
  issue: string;
  currentScore: number;
  suggestedScore: number;
  suggestion: string;
  example: string;
}

async function callAzureOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = getAzureOpenAIClient();
  const deploymentId = getDeploymentId();

  try {
    const response = await client.chat.completions.create({
      model: deploymentId,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from Azure OpenAI');
    }

    return content;
  } catch (error) {
    console.error('[HallucinationDetection] Azure OpenAI call failed:', error);
    throw error;
  }
}

export async function detectHallucinations(
  sourceDocuments: string[],
  userPrompt: string,
  llmResponse: string,
  applicationId?: string
): Promise<HallucinationAnalysis> {
  // Try to retrieve app-specific Azure config
  let appConfig: Awaited<ReturnType<typeof llmConfigService.getDefaultConfig>> | null = null;
  if (applicationId) {
    try {
      appConfig = await llmConfigService.getDefaultConfig(applicationId);
      console.log('[HallucinationDetection] Using saved config for app:', applicationId);
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('[HallucinationDetection] No saved config found, using env variables:', error.message);
      } else {
        console.log('[HallucinationDetection] No saved config found, using env variables');
      }
    }
  }
  const systemPrompt = `You are an expert LLM Judge and RAG evaluator. Analyze the given source documents, user prompt, and LLM response to detect hallucinations, missing context, and prompt gaps.

Respond ONLY with valid JSON (no markdown, no code blocks, just raw JSON) with this exact structure:
{
  "hallucinations": ["specific statement that hallucinates", "another hallucinated claim"],
  "groundednessScore": 45,
  "hallucinationScore": 55,
  "missingContexts": ["what contextual information is needed", "what additional context would help"],
  "incompleteElements": ["what part of prompt is incomplete", "what's underdefined"],
  "promptGaps": ["specific structural gap 1", "specific structural gap 2"],
  "suggestedImprovements": [
    {
      "category": "structure",
      "issue": "Prompt lacks clear output format specification",
      "currentScore": 40,
      "suggestedScore": 65,
      "suggestion": "Add explicit JSON schema or format requirements",
      "example": "Respond with a JSON object containing: {title, summary, keyPoints}"
    },
    {
      "category": "context",
      "issue": "Missing domain-specific terminology definitions",
      "currentScore": 40,
      "suggestedScore": 75,
      "suggestion": "Define key technical terms upfront",
      "example": "By 'groundedness', we mean claims verifiable in source documents"
    }
  ],
  "reasoning": "Detailed explanation of hallucinations and root causes"
}`;

  const sourceContext = sourceDocuments.join('\n---\n');
  const userPromptForAnalysis = `ANALYZE THIS FOR HALLUCINATIONS:

SOURCE DOCUMENTS:
${sourceContext}

USER PROMPT:
${userPrompt}

LLM RESPONSE:
${llmResponse}

Identify:
1. Specific hallucinations in the response
2. How grounded the response is (0-100)
3. What context/information is missing from the PROMPT that would prevent hallucinations
4. What elements of the PROMPT are incomplete or under-specified
5. Structural gaps in the PROMPT
6. Concrete suggestions to improve the prompt structure and context to increase groundedness`;

  const response = await callAzureOpenAI(systemPrompt, userPromptForAnalysis);

  // Parse JSON response
  let analysisData;
  try {
    // Remove markdown code blocks if present
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    analysisData = JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('[HallucinationDetection] Failed to parse response:', response);
    throw new Error(`Failed to parse hallucination analysis: ${error}`);
  }

  const suggestions: PromptSuggestion[] = (
    analysisData.suggestedImprovements || []
  ).map((sugg: any) => ({
    category: sugg.category || 'structure',
    issue: sugg.issue || '',
    currentScore: sugg.currentScore || 40,
    suggestedScore: sugg.suggestedScore || 75,
    suggestion: sugg.suggestion || '',
    example: sugg.example || '',
  }));

  return {
    hallucinationScore: analysisData.hallucinationScore || 50,
    groundednessScore: analysisData.groundednessScore || 50,
    detectedHallucinations: analysisData.hallucinations || [],
    missingContexts: analysisData.missingContexts || [],
    incompleteElements: analysisData.incompleteElements || [],
    promptGaps: analysisData.promptGaps || [],
    suggestions,
    reasoning: analysisData.reasoning || '',
    rawAnalysis: response,
  };
}

export async function analyzePromptQuality(prompt: string): Promise<{
  score: number;
  issues: string[];
  suggestions: string[];
}> {
  const systemPrompt = `You are an expert prompt engineering specialist. Analyze the given prompt for clarity, specificity, and best practices.

Respond ONLY with valid JSON (no markdown):
{
  "score": 65,
  "issues": ["issue 1", "issue 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`;

  const userPromptForAnalysis = `Analyze this prompt for quality and clarity:

${prompt}

Return JSON with: score (0-100), issues found, and specific suggestions.`;

  const response = await callAzureOpenAI(systemPrompt, userPromptForAnalysis);

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('[PromptQuality] Failed to parse response:', response);
    return {
      score: 50,
      issues: ['Unable to parse quality analysis'],
      suggestions: ['Check Azure OpenAI configuration'],
    };
  }
}

export async function generateImprovedPrompt(
  originalPrompt: string,
  issues: string[],
  targetGroundedness: number = 80
): Promise<{
  improvedPrompt: string;
  improvements: string[];
  expectedGroundednessIncrease: number;
}> {
  const systemPrompt = `You are an expert prompt engineer. Improve the given prompt to increase groundedness and reduce hallucinations.

Respond ONLY with valid JSON:
{
  "improvedPrompt": "the new prompt",
  "improvements": ["improvement 1", "improvement 2"],
  "expectedIncrease": 25
}`;

  const userPromptForAnalysis = `Improve this prompt to achieve ${targetGroundedness}/100 groundedness:

ORIGINAL PROMPT:
${originalPrompt}

IDENTIFIED ISSUES:
${issues.join('\n')}

Create an improved prompt that:
1. Adds explicit constraints and output format
2. Includes domain-specific context
3. Defines key terms
4. Specifies exactly what source material to reference
5. Adds verification steps

Return JSON with: improvedPrompt, list of improvements made, and expectedIncrease.`;

  const response = await callAzureOpenAI(systemPrompt, userPromptForAnalysis);

  try {
    const cleanedResponse = response
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('[PromptImprovement] Failed to parse response:', response);
    return {
      improvedPrompt: originalPrompt,
      improvements: [],
      expectedGroundednessIncrease: 0,
    };
  }
}
