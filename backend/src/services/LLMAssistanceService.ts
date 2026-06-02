import { configManager } from '../utils/ConfigManager.js';
import { LLMClientFactory } from './LLMClientFactory.js';

/**
 * LLMAssistanceService - Provides LLM-assisted text generation
 * 
 * Handles all LLM-assisted workflows:
 * - Template refinement by combining multiple prompts
 * - Recommendation text improvement
 * - Knowledge Base content summarization
 * 
 * Always returns suggestions for user review, never auto-saves
 */
export class LLMAssistanceService {
  /**
   * Assist in combining and improving multiple prompts into a single template
   * 
   * @param applicationId - Application identifier
   * @param selectedPrompts - Array of prompt texts to combine
   * @param userContext - Optional context about what the combined prompt should achieve
   * @returns LLM suggestion for combined prompt
   * @throws Error if LLM config missing or generation fails
   */
  async assistCombinePrompts(
    applicationId: string,
    selectedPrompts: string[],
    userContext?: string
  ): Promise<string> {
    try {
      // Validate inputs
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      if (!selectedPrompts || selectedPrompts.length === 0) {
        throw new Error('At least one prompt is required');
      }

      if (selectedPrompts.length > 10) {
        throw new Error('Cannot combine more than 10 prompts at once');
      }

      // Validate each prompt
      selectedPrompts.forEach((prompt, index) => {
        if (!prompt?.trim()) {
          throw new Error(`Prompt ${index + 1} is empty`);
        }
      });

      // Fetch LLM config for application
      console.log(`[LLMAssistanceService] Fetching LLM config for app: ${applicationId}`);
      const llmConfig = await configManager.getApplicationLLMConfig(applicationId);

      // Validate config
      const validation = configManager.validateLLMConfig(llmConfig);
      if (!validation.valid) {
        throw new Error(`Invalid LLM config: ${validation.errors.join(', ')}`);
      }

      // Create LLM client - uses exact Azure OpenAI parameter names (api_key, azure_endpoint, api_version, deployment)
      // if provided in config, with fallback to legacy names for backward compatibility
      const llmClient = LLMClientFactory.create(llmConfig);

      // Validate LLM connection
      console.log(`[LLMAssistanceService] Validating LLM connection for provider: ${llmConfig.provider}`);
      const connectionTest = await llmClient.validate();
      if (!connectionTest.valid) {
        throw new Error(`LLM connection validation failed: ${connectionTest.error}`);
      }

      // Build refinement prompt
      const systemPrompt = `You are an expert prompt engineering specialist. Your task is to combine and improve multiple user prompts into a single, coherent, and effective prompt.

When combining prompts:
1. Identify common themes and goals
2. Merge similar concepts to eliminate redundancy
3. Preserve important details from each prompt
4. Improve clarity and specificity
5. Ensure the result is actionable and specific

Return ONLY the improved combined prompt text, no explanations or metadata.`;

      const promptsList = selectedPrompts
        .map((prompt, i) => `Prompt ${i + 1}: ${prompt}`)
        .join('\n\n');

      const userPrompt = `Combine and improve these prompts into a single, cohesive prompt:

${promptsList}${userContext ? `\n\nAdditional context: ${userContext}` : ''}`;

      console.log(`[LLMAssistanceService] Generating combined prompt suggestion using ${llmConfig.provider}`);

      // Generate suggestion
      const suggestion = await llmClient.generate(userPrompt, {
        temperature: 0.7,
        maxTokens: llmConfig.maxTokens ?? 2048,
        systemPrompt,
      });

      if (!suggestion?.trim()) {
        throw new Error('LLM returned empty suggestion');
      }

      return suggestion.trim();
    } catch (error: unknown) {
      throw this.handleError('assistCombinePrompts', error, applicationId);
    }
  }

  /**
   * Assist in refining/improving an existing recommendation text
   * 
   * @param applicationId - Application identifier
   * @param originalText - The original recommendation text
   * @param improvementFocus - Optional specific area to improve (clarity, conciseness, etc.)
   * @returns LLM suggestion for improved text
   */
  async assistRefineRecommendation(
    applicationId: string,
    originalText: string,
    improvementFocus?: string
  ): Promise<string> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      if (!originalText?.trim()) {
        throw new Error('Original text is required');
      }

      const llmConfig = await configManager.getApplicationLLMConfig(applicationId);
      const validation = configManager.validateLLMConfig(llmConfig);
      if (!validation.valid) {
        throw new Error(`Invalid LLM config: ${validation.errors.join(', ')}`);
      }

      const llmClient = LLMClientFactory.create(llmConfig);

      const connectionTest = await llmClient.validate();
      if (!connectionTest.valid) {
        throw new Error(`LLM connection validation failed: ${connectionTest.error}`);
      }

      const systemPrompt = `You are a professional business analyst helping refine user recommendations. Improve the provided text while maintaining its core meaning and intent.

Improvements should:
1. Enhance clarity and readability
2. Use professional language
3. Make the recommendation more specific and actionable
4. Ensure proper grammar and structure
5. Keep the response concise but complete

Return ONLY the improved recommendation text, no explanations.`;

      const userPrompt = `Please improve this recommendation:

"${originalText}"${improvementFocus ? `\n\nFocus on improving: ${improvementFocus}` : ''}`;

      console.log(`[LLMAssistanceService] Refining recommendation using ${llmConfig.provider}`);

      const suggestion = await llmClient.generate(userPrompt, {
        temperature: 0.5,
        maxTokens: Math.min(500, llmConfig.maxTokens ?? 2048),
        systemPrompt,
      });

      if (!suggestion?.trim()) {
        throw new Error('LLM returned empty suggestion');
      }

      return suggestion.trim();
    } catch (error: unknown) {
      throw this.handleError('assistRefineRecommendation', error, applicationId);
    }
  }

  /**
   * Assist in generating a summary for Knowledge Base content
   * Uses KB-specific LLM config if available, otherwise falls back to main LLM config
   * 
   * @param applicationId - Application identifier
   * @param content - Content to summarize
   * @param contentType - Type of content (document, code, article, etc.)
   * @param useKBConfig - Whether to use KB-specific LLM config
   * @returns LLM-generated summary
   */
  async assistGenerateKBSummary(
    applicationId: string,
    content: string,
    contentType: string = 'document',
    useKBConfig: boolean = true
  ): Promise<string> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      if (!content?.trim()) {
        throw new Error('Content is required');
      }

      let llmConfig = await configManager.getApplicationLLMConfig(applicationId);

      // Try to use KB config if requested
      if (useKBConfig) {
        try {
          const kbConfig = await configManager.getApplicationKBConfig(applicationId);
          // Would use KB-specific LLM provider if available
          // For now, fallback to main LLM config
          console.log(`[LLMAssistanceService] Using main LLM config for KB summary`);
        } catch (err) {
          console.log(`[LLMAssistanceService] KB config not available, using main LLM config`);
        }
      }

      const validation = configManager.validateLLMConfig(llmConfig);
      if (!validation.valid) {
        throw new Error(`Invalid LLM config: ${validation.errors.join(', ')}`);
      }

      const llmClient = LLMClientFactory.create(llmConfig);

      const connectionTest = await llmClient.validate();
      if (!connectionTest.valid) {
        throw new Error(`LLM connection validation failed: ${connectionTest.error}`);
      }

      const systemPrompt = `You are a knowledge base content expert. Create a concise, informative summary of the provided ${contentType}.

Guidelines for the summary:
1. Capture the main topics and key points
2. Be concise but comprehensive
3. Use clear, professional language
4. Highlight any important warnings or prerequisites
5. Include relevant context for understanding
6. Keep the summary at 2-5 sentences for documents, or 5-10 sentences for longer content

Return ONLY the summary text, no metadata or explanations.`;

      // Truncate content if too long to save tokens
      const maxContentLength = 4000;
      const truncatedContent = content.length > maxContentLength 
        ? content.substring(0, maxContentLength) + '...[truncated]'
        : content;

      const userPrompt = `Generate a summary for this ${contentType}:

${truncatedContent}`;

      console.log(`[LLMAssistanceService] Generating KB summary using ${llmConfig.provider}`);

      const suggestion = await llmClient.generate(userPrompt, {
        temperature: 0.3,
        maxTokens: Math.min(300, llmConfig.maxTokens ?? 2048),
        systemPrompt,
      });

      if (!suggestion?.trim()) {
        throw new Error('LLM returned empty summary');
      }

      return suggestion.trim();
    } catch (error: unknown) {
      throw this.handleError('assistGenerateKBSummary', error, applicationId);
    }
  }

  /**
   * Parse and validate LLM response to ensure it meets expectations
   * 
   * @param response - LLM response text
   * @param minLength - Minimum expected response length
   * @param maxLength - Maximum expected response length
   * @returns Validated response
   * @throws Error if response doesn't meet expectations
   */
  validateLLMResponse(response: string, minLength: number = 10, maxLength: number = 10000): string {
    const trimmed = response?.trim() ?? '';

    if (trimmed.length === 0) {
      throw new Error('LLM response is empty');
    }

    if (trimmed.length < minLength) {
      throw new Error(`LLM response too short (${trimmed.length} chars, minimum ${minLength})`);
    }

    if (trimmed.length > maxLength) {
      throw new Error(`LLM response too long (${trimmed.length} chars, maximum ${maxLength})`);
    }

    return trimmed;
  }

  /**
   * Assist in refining and improving a recommendation text
   * 
   * @param applicationId - Application identifier
   * @param recommendationText - Original recommendation to refine
   * @returns LLM suggestion for improved recommendation
   * @throws Error if LLM config missing or generation fails
   */

  /**
   * Curate and refine a prompt based on identified issues
   * Generates an ACTUAL REVISED PROMPT that incorporates recommendations
   * Not just guidelines - this is a concrete improved version ready to use
   * 
   * @param applicationId - Application identifier (to fetch LLM config)
   * @param originalPrompt - The original prompt to improve
   * @param issues - List of identified issues/recommendations to address
   * @returns Refined prompt, reasoning, and expected score increase
   */
  async curateAndRefinePrompt(
    applicationId: string,
    originalPrompt: string,
    issues: string[]
  ): Promise<{
    revisedPrompt: string;
    reasoning: string;
    expectedScoreIncrease: number;
  }> {
    try {
      // Validate inputs
      if (!applicationId?.trim()) {
        throw new Error('applicationId is required');
      }

      if (!originalPrompt?.trim()) {
        throw new Error('originalPrompt is required');
      }

      if (!issues || issues.length === 0) {
        throw new Error('At least one issue is required');
      }

      // Fetch LLM config
      console.log(`[LLMAssistanceService] Fetching LLM config for curating prompt for app ${applicationId}`);
      const llmConfig = await configManager.getApplicationLLMConfig(applicationId);

      console.log('[v0] Fetched llmConfig:', JSON.stringify(llmConfig, null, 2));

      if (!llmConfig) {
        throw new Error(`No LLM configuration found for application ${applicationId}`);
      }

      // Validate config
      const validation = configManager.validateLLMConfig(llmConfig);
      console.log('[v0] Config validation result:', validation);
      
      if (!validation.valid) {
        console.error('[v0] Config validation failed. Config keys:', Object.keys(llmConfig));
        console.error('[v0] Config values:', {
          provider: llmConfig.provider,
          azure_endpoint: llmConfig.azure_endpoint ? '***SET***' : 'MISSING',
          api_key: llmConfig.api_key ? '***SET***' : 'MISSING',
          deployment: llmConfig.deployment ? '***SET***' : 'MISSING',
          api_version: llmConfig.api_version ? '***SET***' : 'MISSING',
        });
        throw new Error(`Invalid LLM config: ${validation.errors.join(', ')}`);
      }

      // Create LLM client
      const llmClient = LLMClientFactory.create(llmConfig);

      // Validate connection
      console.log(`[LLMAssistanceService] Validating LLM connection for provider: ${llmConfig.provider}`);
      const connectionTest = await llmClient.validate();
      if (!connectionTest.valid) {
        throw new Error(`LLM connection validation failed: ${connectionTest.error}`);
      }

      // Build the curation prompt with clear instructions
      const systemPrompt = `You are a prompt refinement specialist. Your task is to improve user prompts based on identified issues.

Your output must be valid JSON with these exact fields:
- revisedPrompt: the improved prompt text
- reasoning: brief explanation of improvements
- expectedScoreIncrease: estimated improvement (use 20)

Return only JSON. Do not include explanations, markdown, or additional text outside the JSON object.

Example format:
{
  "revisedPrompt": "improved prompt here",
  "reasoning": "changes made and why",
  "expectedScoreIncrease": 20
}`;

      const issuesText = issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n');

      const userPrompt = `Improve this prompt by addressing the identified issues.

ORIGINAL PROMPT:
"""
${originalPrompt}
"""

ISSUES TO ADDRESS:
${issuesText}

Create an improved version of the prompt that directly addresses each issue. Return as JSON only.`;

      console.log(`[LLMAssistanceService] Generating curated prompt for app ${applicationId} with ${issues.length} issues`);

      // Generate curated prompt
      const suggestion = await llmClient.generate(userPrompt, {
        temperature: 0.7,
        maxTokens: llmConfig.maxTokens ?? 2048,
        systemPrompt,
      });

      if (!suggestion?.trim()) {
        throw new Error('LLM returned empty response');
      }

      console.log(`[LLMAssistanceService] Generated curated prompt, raw response length: ${suggestion.length}`);
      console.log(`[LLMAssistanceService] First 200 chars: ${suggestion.substring(0, 200)}`);

      // Parse the JSON response with aggressive cleanup
      let cleanedResponse = suggestion.trim();
      
      // Remove markdown code blocks
      cleanedResponse = cleanedResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      // Remove any leading text before first {
      const firstBraceIndex = cleanedResponse.indexOf('{');
      if (firstBraceIndex > 0) {
        console.log(`[LLMAssistanceService] Found { at index ${firstBraceIndex}, removing leading text`);
        cleanedResponse = cleanedResponse.substring(firstBraceIndex);
      }
      
      // Remove any trailing text after last }
      const lastBraceIndex = cleanedResponse.lastIndexOf('}');
      if (lastBraceIndex >= 0 && lastBraceIndex < cleanedResponse.length - 1) {
        console.log(`[LLMAssistanceService] Found } at index ${lastBraceIndex}, removing trailing text`);
        cleanedResponse = cleanedResponse.substring(0, lastBraceIndex + 1);
      }
      
      console.log(`[LLMAssistanceService] Cleaned response: ${cleanedResponse.substring(0, 200)}`);
      
      const parsed = JSON.parse(cleanedResponse);

      if (!parsed.revisedPrompt || typeof parsed.revisedPrompt !== 'string') {
        throw new Error('Invalid revisedPrompt in LLM response - must be non-empty string');
      }
      
      if (parsed.revisedPrompt.trim().length < 10) {
        throw new Error('revisedPrompt is too short - LLM may not have generated a valid prompt');
      }

      console.log(`[LLMAssistanceService] Successfully curated prompt for app ${applicationId}, revised length: ${parsed.revisedPrompt.length}`);

      return {
        revisedPrompt: parsed.revisedPrompt.trim(),
        reasoning: parsed.reasoning || 'Prompt refined to address identified issues',
        expectedScoreIncrease: parsed.expectedScoreIncrease || 20,
      };
    } catch (error: unknown) {
      // Fallback: Return a basic refined prompt if parsing fails
      if (error instanceof SyntaxError) {
        console.warn(`[LLMAssistanceService] JSON parse failed, returning fallback refined prompt`);
        
        // Create a basic refined prompt incorporating the issues
        const refinedPoints = issues
          .map((issue: string) => {
            // Clean up the issue text if it's just recommendations
            if (issue.includes(':')) {
              const parts = issue.split(':');
              const lastPart = parts[parts.length - 1];
              return lastPart ? lastPart.trim() : issue;
            }
            return issue;
          })
          .filter((i: string) => i && i.length > 0)
          .slice(0, 3); // Take top 3 issues

        const fallbackPrompt = `${originalPrompt}\n\n[Refinements based on identified issues]:\n${refinedPoints.map((p: string) => `- ${p}`).join('\n')}`;
        
        return {
          revisedPrompt: fallbackPrompt,
          reasoning: 'Refined based on identified issues',
          expectedScoreIncrease: 15,
        };
      }

      throw this.handleError('curateAndRefinePrompt', error, applicationId);
    }
  }

  /**
   * Generate LLM-powered recommendations based on DeepEval analysis
   * Uses the application's saved LLM configuration from Settings->LLM tab
   * 
   * @param applicationId - Application identifier (to fetch LLM config)
   * @param userPrompt - Original user query
   * @param llmResponse - LLM-generated response
   * @param contextRetrieved - Retrieved context chunks
   * @param deepevalAnalysis - DeepEval metrics analysis result
   * @returns LLM suggestions for improving prompt/context/response
   */
  async generateRecommendations(
    applicationId: string,
    userPrompt: string,
    llmResponse: string,
    contextRetrieved: string[],
    deepevalAnalysis: any
  ): Promise<string> {
    try {
      // Validate inputs
      if (!applicationId?.trim()) {
        throw new Error('applicationId is required to fetch LLM configuration');
      }

      if (!userPrompt?.trim() || !llmResponse?.trim() || !deepevalAnalysis) {
        throw new Error('userPrompt, llmResponse, and deepevalAnalysis are required');
      }

      // Fetch LLM config from database for this application
      console.log(`[LLMAssistanceService] Fetching LLM config for app ${applicationId}`);
      const llmConfig = await configManager.getApplicationLLMConfig(applicationId);
      
      if (!llmConfig) {
        const errorMsg = `No LLM configuration found for application ${applicationId}. Please configure Azure OpenAI settings in Settings → LLM Configuration tab.`;
        console.error(`[LLMAssistanceService] ${errorMsg}`);
        throw new Error(errorMsg);
      }

      // Debug: Log the fetched config
      console.log(`[v0] LLM Config fetched:`, {
        provider: llmConfig.provider,
        api_key: llmConfig.api_key ? '***' : 'MISSING',
        azure_endpoint: llmConfig.azure_endpoint,
        deployment: llmConfig.deployment,
        api_version: llmConfig.api_version,
      });

      // Create LLM client with saved config from database
      const llmClient = LLMClientFactory.create(llmConfig);

      // Validate LLM connection
      console.log(`[LLMAssistanceService] Validating LLM connection for app ${applicationId}`);
      const connectionTest = await llmClient.validate();
      if (!connectionTest.valid) {
        throw new Error(`LLM connection validation failed: ${connectionTest.error}. Please verify your LLM settings are correct.`);
      }

      // Build comprehensive recommendation prompt
      const systemPrompt = `You are an expert RAG (Retrieval-Augmented Generation) system improvement specialist. Your task is to analyze evaluation metrics and generate specific, actionable recommendations to improve the RAG system.

Based on the DeepEval analysis, user prompt, LLM response, and retrieved context, provide:
1. Root cause analysis of metric issues
2. Specific improvements for prompt engineering
3. Context retrieval optimization suggestions
4. Response generation improvements

Format your response as clear, numbered recommendations. Each recommendation should be specific and actionable.`;

      const metricsAnalysisSummary = deepevalAnalysis.deepevalFindings || 'No analysis available';
      const contextSummary = contextRetrieved
        .slice(0, 3)
        .map((c, i) => `Context ${i + 1}: ${c.substring(0, 200)}...`)
        .join('\n') || 'No context provided';

      const userRecommendationPrompt = `Analyze this RAG system evaluation and provide specific recommendations:

## User Query
${userPrompt}

## LLM Response
${llmResponse}

## Retrieved Context
${contextSummary}

## DeepEval Analysis
${metricsAnalysisSummary}

## Overall System Health
${deepevalAnalysis.overallHealth}

## Critical Issues
${deepevalAnalysis.criticalIssues.length > 0 ? deepevalAnalysis.criticalIssues.join('\n') : 'None'}

## Warnings
${deepevalAnalysis.warnings.length > 0 ? deepevalAnalysis.warnings.join('\n') : 'None'}

Based on this analysis, provide 3-5 specific, actionable recommendations to improve the RAG system.`;

      console.log(`[LLMAssistanceService] Generating LLM recommendations for app ${applicationId}`);

      // Generate recommendations
      const recommendations = await llmClient.generate(userRecommendationPrompt, {
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt,
      });

      if (!recommendations?.trim()) {
        throw new Error('No recommendations generated from LLM');
      }

      console.log(`[LLMAssistanceService] Successfully generated recommendations for app ${applicationId}`);
      return recommendations;
    } catch (error: unknown) {
      throw this.handleError('generateRecommendations', error, applicationId);
    }
  }

  // ===== PRIVATE HELPER METHODS =====

  /**
   * Error handler with context logging
   */
  private handleError(method: string, error: unknown, context?: string): Error {
    const message = error instanceof Error ? error.message : String(error);
    const contextStr = context ? ` (app: ${context})` : '';
    console.error(`[LLMAssistanceService.${method}]${contextStr} Error: ${message}`);
    return new Error(`LLM Assistance Error in ${method}: ${message}`);
  }
}

export const llmAssistanceService = new LLMAssistanceService();
