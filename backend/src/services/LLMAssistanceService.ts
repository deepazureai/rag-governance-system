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
