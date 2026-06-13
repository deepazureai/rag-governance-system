import { logger } from '../utils/logger.js';
import { configManager } from '../utils/ConfigManager.js';
import { getVectorStore } from './VectorStoreService.js';
import { llmProviderService } from './LLMProviderService.js';

// DocumentChunk interface for search results
interface DocumentChunk {
  content: string;
  metadata: Record<string, string | number | boolean | string[]>;
  embedding?: number[];
}

export interface RAGQueryRequest {
  applicationId: string;
  query: string;
  topK?: number;
  temperature?: number;
  maxTokens?: number;
}

export interface RAGQueryResponse {
  assistantMessage: string;
  contextUsed: Array<{
    source: string;
    content: string;
    relevanceScore: number;
  }>;
  tokensUsed: number;
  searchResults: number;
}

/**
 * RAG Query Service
 * Implements complete RAG pipeline:
 * 1. Retrieve documents using semantic search
 * 2. Rank and select relevant context
 * 3. Format context for LLM
 * 4. Call LLM with KB config settings
 * 5. Return response with source citations
 */
class RAGQueryService {
  /**
   * Execute full RAG query pipeline
   */
  async query(request: RAGQueryRequest): Promise<RAGQueryResponse> {
    const { applicationId, query, topK = 5, temperature, maxTokens } = request;

    logger.info(`[RAGQueryService] Starting RAG query for app: ${applicationId}`);

    try {
      // Get Chat Completion LLM provider from KB config (using mapper method)
      // This fetches from MongoDB and maps fields to chat completion parameters
      logger.info(`[RAGQueryService] 1. Getting chat completion provider for app: ${applicationId}`);
      const chatCompletionProvider = await llmProviderService.getKBChatCompletionProvider(applicationId);
      logger.info(`[RAGQueryService] 2. Chat completion provider created successfully`);
      
      // Get the KB config to extract LLM parameters
      const kbConfig = await configManager.getApplicationKBConfigWithFallback(applicationId);
      if (!kbConfig) {
        throw new Error(
          'KB configuration not found. Please configure Settings -> LLM before querying.'
        );
      }

      logger.info(`[RAGQueryService] 3. KB config retrieved: provider=${kbConfig.kbLlmProvider}`);

      // Retrieve relevant documents using semantic search
      logger.info(`[RAGQueryService] 4. Retrieving documents from vector store`);
      const vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);
      const searchResults: DocumentChunk[] = await vectorStore.hybridSearch(query, undefined, { k: topK });

      if (searchResults.length === 0) {
        logger.warn(`[RAGQueryService] No relevant documents found for query: "${query}"`);
        return {
          assistantMessage:
            'No relevant documents found in the knowledge base to answer your question. Please upload relevant documents first.',
          contextUsed: [],
          tokensUsed: 0,
          searchResults: 0,
        };
      }

      logger.info(
        `[RAGQueryService] 5. Found ${searchResults.length} relevant documents with relevance scores: ${searchResults.map((d) => d.metadata.relevanceScore).join(', ')}`
      );

      // Format context for LLM prompt
      const contextString = searchResults
        .map((doc: DocumentChunk, idx: number) => `[Document ${idx + 1}]\n${doc.content}`)
        .join('\n\n---\n\n');

      const systemPrompt = `You are a helpful assistant answering questions based on provided knowledge base documents. 
Always base your answers on the provided context. If the context doesn't contain relevant information, say so explicitly.
Provide clear, concise answers and cite which documents you used.`;

      const userPrompt = `Context from knowledge base:

${contextString}

---

Question: ${query}

Please answer the question based on the provided context. If the context doesn't contain enough information, please say so.`;

      // Get LLM configuration from KB config using standardized mapper (same as Test Connection)
      // This ensures consistent field extraction, decryption, and fallback handling
      logger.info(`[RAGQueryService] 6. Mapping KB config to chat completion LLMConfig`);
      const llmConfig = llmProviderService.mapKBConfigToChatCompletion(kbConfig);
      
      const finalTemperature = temperature ?? (llmConfig.temperature !== undefined ? llmConfig.temperature : 0.3);
      const finalMaxTokens = maxTokens ?? (llmConfig.maxTokens || 1000);

      logger.info(
        `[RAGQueryService] 7. Chat completion config: provider=${llmConfig.provider}, deployment=${llmConfig.deployment}, temperature=${finalTemperature}, maxTokens=${finalMaxTokens}`
      );

      // Call LLM with proper configuration
      let llmResponse: string;
      let tokensUsed = 0;

      if (llmConfig.provider === 'azure-openai') {
        logger.info(`[RAGQueryService] 8. Calling Azure OpenAI with chat completion parameters`);
        llmResponse = await this.callAzureOpenAI(kbConfig, systemPrompt, userPrompt, finalTemperature, finalMaxTokens);
      } else {
        throw new Error(`Unsupported LLM provider: ${llmConfig.provider}`);
      }

      logger.info(`[RAGQueryService] 9. LLM response generated successfully`);

      // Format response with source citations
      const response: RAGQueryResponse = {
        assistantMessage: llmResponse,
        contextUsed: searchResults.map((doc: DocumentChunk) => ({
          source: String(doc.metadata.source || 'Unknown'),
          content: doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : ''),
          relevanceScore: typeof doc.metadata.relevanceScore === 'number' ? doc.metadata.relevanceScore : 0,
        })),
        tokensUsed,
        searchResults: searchResults.length,
      };

      logger.info(
        `[RAGQueryService] 9. RAG query completed: contextDocs=${response.contextUsed.length}, tokensUsed=${tokensUsed}`
      );

      return response;
    } catch (error) {
      logger.error('[RAGQueryService] RAG query failed:', error);
      throw error;
    }
  }

  /**
   * Call Azure OpenAI LLM with proper configuration using REST API
   */
  private async callAzureOpenAI(
    kbConfig: any,
    systemPrompt: string,
    userPrompt: string,
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    try {
      // TEMPORARY: Plain text credentials for baseline testing (no decryption needed)
      const apiKey = kbConfig.kbllm_api_key || kbConfig.azureApiKey;
      const endpoint = kbConfig.kbllm_azure_endpoint || kbConfig.azureEndpoint;
      const apiVersion = kbConfig.kbllm_api_version || kbConfig.azureApiVersion || '2024-02-15-preview';
      const deploymentName = kbConfig.kbllm_deployment || kbConfig.azureDeploymentName || 'gpt-4';

      logger.info(
        `[RAGQueryService] Azure OpenAI config: endpoint=${endpoint}, deployment=${deploymentName}, apiVersion=${apiVersion}`
      );

      if (!apiKey || !endpoint) {
        throw new Error(
          'Azure OpenAI credentials not configured in KB settings. Please configure Settings -> Knowledge Base.'
        );
      }

      // Remove trailing slash from endpoint if present
      const cleanEndpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

      // Build Azure OpenAI API URL
      const url = `${cleanEndpoint}/openai/deployments/${deploymentName}/chat/completions?api-version=${apiVersion}`;

      logger.debug(`[RAGQueryService] Calling Azure OpenAI: ${url}`);

      // Call Azure OpenAI REST API
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error(`[RAGQueryService] Azure OpenAI API error: status=${response.status}, body=${errorData}`);
        throw new Error(`Azure OpenAI API failed: ${response.status} - ${errorData}`);
      }

      const data = (await response.json()) as any;

      if (!data.choices?.[0]?.message?.content) {
        throw new Error('Empty response from Azure OpenAI');
      }

      logger.info(
        `[RAGQueryService] Azure OpenAI response: tokens=${data.usage?.total_tokens || 0}, finish_reason=${data.choices[0]?.finish_reason}`
      );

      return data.choices[0].message.content;
    } catch (error) {
      logger.error('[RAGQueryService] Azure OpenAI call failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const ragQueryService = new RAGQueryService();
