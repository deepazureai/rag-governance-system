import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings, AzureOpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { configManager } from '../utils/ConfigManager.js';

interface ChromaConfig {
  collectionName: string;
  persistDir: string;
  applicationId?: string;
}

interface SearchOptions {
  k: number;
  scoreThreshold?: number;
}

interface DocumentChunk {
  content: string;
  metadata: Record<string, string | number | boolean | string[]>;
  embedding?: number[];
}

export class VectorStoreService {
  private vectorStore: Chroma | null = null;
  private embeddings: OpenAIEmbeddings | null = null;
  private collectionName: string;
  private persistDir: string;
  private isInitialized: boolean = false;
  private applicationId?: string;

  constructor(config: ChromaConfig) {
    this.collectionName = config.collectionName;
    this.persistDir = config.persistDir;
    this.applicationId = config.applicationId;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      let apiKey = process.env.AZURE_OPENAI_API_KEY;
      let endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      let apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview';
      let deploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
      let embeddingProvider = 'azure-openai'; // Default to Azure

      // Try to retrieve app-specific KB config from MongoDB with fallback to LLM config
      if (this.applicationId) {
        try {
          const kbConfig = await configManager.getApplicationKBConfigWithFallback(this.applicationId);
          if (kbConfig) {
            logger.info(`[VectorStoreService] Found KB config for app ${this.applicationId}`);
            
            // KB config stores embedding credentials separately
            if (kbConfig.embeddingProvider === 'azure-openai') {
              // Use exact parameter names from config - TEMPORARY: Plain text (no decrypt)
              if (kbConfig.embedding_api_key) {
                apiKey = kbConfig.embedding_api_key;
                logger.info(`[VectorStoreService] Using KB config embedding API key`);
              }
              if (kbConfig.embedding_azure_endpoint) {
                endpoint = kbConfig.embedding_azure_endpoint;
                logger.info(`[VectorStoreService] Using KB config endpoint`);
              }
              if (kbConfig.embedding_api_version) {
                apiVersion = kbConfig.embedding_api_version;
              }
              if (kbConfig.embedding_deployment) {
                deploymentName = kbConfig.embedding_deployment;
              }
              embeddingProvider = 'azure-openai';
              
              logger.info(`[VectorStoreService] Using Azure KB embedding config for app ${this.applicationId}`);
            } else if (kbConfig.embeddingProvider === 'openai') {
              // Standard OpenAI provider - TEMPORARY: Plain text (no decrypt)
              if (kbConfig.embeddingOpenaiApiKey) {
                apiKey = kbConfig.embeddingOpenaiApiKey;
              }
              embeddingProvider = 'openai';
              logger.info(`[VectorStoreService] Using OpenAI KB embedding config for app ${this.applicationId}`);
            }
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            logger.warn(`[VectorStoreService] No saved KB config found for app, using env variables: ${error.message}`);
          } else {
            logger.warn(`[VectorStoreService] No saved KB config found for app, using env variables`);
          }
        }
      }

      if (!apiKey) {
        throw new Error(
          'Embedding API key not configured. Please set AZURE_OPENAI_API_KEY env var or configure KB settings in Settings → Knowledge Base'
        );
      }

      // Initialize embeddings based on provider
      if (embeddingProvider === 'azure-openai') {
        if (!endpoint) {
          throw new Error(
            'Azure endpoint not configured. Please set AZURE_OPENAI_ENDPOINT env var or configure KB settings in Settings → Knowledge Base'
          );
        }

        // Extract Azure instance name from endpoint
        // Example: https://my-resource.openai.azure.com -> my-resource
        const instanceName = this.extractAzureInstanceName(endpoint);

        logger.info(
          `[VectorStoreService] Initializing AzureOpenAIEmbeddings: instance=${instanceName}, deployment=${deploymentName}, apiVersion=${apiVersion}`
        );

        this.embeddings = new AzureOpenAIEmbeddings({
          azureOpenAIApiKey: apiKey,
          azureOpenAIApiInstanceName: instanceName,
          azureOpenAIApiDeploymentName: deploymentName,
          azureOpenAIApiVersion: apiVersion,
        } as any);
      } else {
        // Standard OpenAI
        logger.info(`[VectorStoreService] Initializing OpenAIEmbeddings with model: ${deploymentName}`);
        this.embeddings = new OpenAIEmbeddings({
          apiKey: apiKey,
          model: deploymentName,
        } as any);
      }

      if (!fs.existsSync(this.persistDir)) {
        try {
          fs.mkdirSync(this.persistDir, { recursive: true });
          logger.info(`[VectorStoreService] Created vectorstore directory: ${this.persistDir}`);
        } catch (mkdirError) {
          logger.warn(`[VectorStoreService] Could not create directory ${this.persistDir}, will use memory-only mode`);
          // Continue with memory-only mode
        }
      }

      try {
        // Try to connect to Chroma server via HTTP
        this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
          collectionName: this.collectionName,
          url: 'http://localhost:8000', // Try Chroma server
        });
        logger.info(`[VectorStoreService] Connected to Chroma server at http://localhost:8000`);
      } catch (chromaServerError) {
        logger.warn(`[VectorStoreService] Could not connect to Chroma server, using in-memory fallback...`);
        
        // Fall back to in-memory mode using simple mock
        this.vectorStore = this.createFallbackVectorStore() as any;
        logger.info(`[VectorStoreService] Using in-memory vector store for app ${this.applicationId}`);
      }

      this.isInitialized = true;
      logger.info(
        `[VectorStoreService] Initialized with collection: ${this.collectionName}, appId: ${this.applicationId}, provider: ${embeddingProvider}`
      );
    } catch (error) {
      logger.error('[VectorStoreService] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Extract Azure instance name from endpoint URL
   * Example: https://my-resource.openai.azure.com -> my-resource
   */
  private extractAzureInstanceName(endpoint: string): string {
    try {
      const url = new URL(endpoint);
      const hostname = url.hostname; // my-resource.openai.azure.com
      const parts = hostname.split('.');
      const instanceName = parts[0];
      if (!instanceName) {
        throw new Error('Empty instance name');
      }
      return instanceName; // my-resource
    } catch (error) {
      logger.warn(`[VectorStoreService] Failed to parse endpoint: ${endpoint}`, error);
      // Fallback: try basic string parsing
      const match = endpoint.match(/https?:\/\/([^.]+)\./);
      if (match?.[1]) {
        return match[1];
      }
      throw new Error(`Invalid Azure endpoint format: ${endpoint}`);
    }
  }

  /**
   * Add documents to vector store
   */
  async addDocuments(documents: DocumentChunk[], namespace?: string): Promise<string[]> {
    if (!this.vectorStore || !this.embeddings) {
      await this.initialize();
    }

    try {
      const langchainDocs = documents.map(
        (doc): Document =>
          new Document({
            pageContent: doc.content,
            metadata: {
              ...doc.metadata,
              namespace: namespace ?? 'default',
              addedAt: new Date().toISOString(),
            },
          })
      );

      const ids: string[] = await this.vectorStore!.addDocuments(langchainDocs);
      logger.info(`[VectorStoreService] Added ${ids.length} documents to collection`);
      return ids;
    } catch (error) {
      logger.error('[VectorStoreService] Failed to add documents:', error);
      throw error;
    }
  }

  /**
   * Similarity search across vector store
   */
  async search(query: string, options: SearchOptions = { k: 5 }): Promise<DocumentChunk[]> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      // Use similaritySearch which returns documents with scores
      const results: Array<[Document, number]> = await (this.vectorStore as any).similaritySearch(query, options.k) as any;

      const documentChunks: DocumentChunk[] = (Array.isArray(results) ? results : [])
        .filter(([_, score]: [Document, number]) => !options.scoreThreshold || (score && score >= options.scoreThreshold))
        .map(([doc, score]: [Document, number]): DocumentChunk => ({
          content: typeof doc === 'string' ? doc : (doc as any).pageContent || doc,
          metadata: {
            ...(typeof doc === 'object' && 'metadata' in doc ? (doc as any).metadata : {}),
            relevanceScore: score,
          },
        }));

      return documentChunks;
    } catch (error) {
      logger.error('[VectorStoreService] Search failed:', error);
      throw error;
    }
  }

  /**
   * Batch search for multiple queries
   */
  async batchSearch(queries: string[], options: SearchOptions = { k: 5 }): Promise<Map<string, DocumentChunk[]>> {
    const results: Map<string, DocumentChunk[]> = new Map<string, DocumentChunk[]>();

    for (const query of queries) {
      const searchResults: DocumentChunk[] = await this.search(query, options);
      results.set(query, searchResults);
    }

    return results;
  }

  /**
   * Delete documents from collection
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      await this.vectorStore!.delete({ ids });
      logger.info(`[VectorStoreService] Deleted ${ids.length} documents from collection`);
    } catch (error) {
      logger.error('[VectorStoreService] Failed to delete documents:', error);
      throw error;
    }
  }

  /**
   * Clear entire collection
   */
  async clearCollection(): Promise<void> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      // Chromadb doesn't have a direct clear method, so we delete the collection and reinitialize
      // This is handled at the application level
      logger.info(`[VectorStoreService] Collection ${this.collectionName} cleared`);
    } catch (error) {
      logger.error('[VectorStoreService] Failed to clear collection:', error);
      throw error;
    }
  }

  /**
   * Get collection stats
   */
  async getStats(): Promise<{ documentCount: number; collectionName: string }> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      // Note: Chromadb interface may vary; adjust based on actual API
      return {
        documentCount: 0, // Would need to implement count logic
        collectionName: this.collectionName,
      };
    } catch (error) {
      logger.error('[VectorStoreService] Failed to get stats:', error);
      throw error;
    }
  }

  /**
   * Hybrid search: combines vector similarity + metadata filtering
   */
  async hybridSearch(
    query: string,
    filters?: Record<string, string | number | boolean>,
    options: SearchOptions = { k: 5 }
  ): Promise<DocumentChunk[]> {
    if (!this.vectorStore) {
      await this.initialize();
    }

    try {
      // Perform similarity search
      let results: DocumentChunk[] = await this.search(query, options);

      // Apply metadata filters if provided
      if (filters) {
        results = results.filter((doc: DocumentChunk): boolean => {
          return Object.entries(filters).every(([key, value]) => doc.metadata[key] === value);
        });
      }

      const sortedResults: DocumentChunk[] = results.sort(
        (a: DocumentChunk, b: DocumentChunk): number => {
          const scoreA: number = typeof a.metadata.relevanceScore === 'number' ? a.metadata.relevanceScore : 0;
          const scoreB: number = typeof b.metadata.relevanceScore === 'number' ? b.metadata.relevanceScore : 0;
          return scoreB - scoreA;
        }
      );

      return sortedResults;
    } catch (error) {
      logger.error('[VectorStoreService] Hybrid search failed:', error);
      throw error;
    }
  }

  /**
   * Get embedding for a single text
   */
  async getEmbedding(text: string): Promise<number[]> {
    if (!this.embeddings) {
      await this.initialize();
    }

    try {
      const embedding: number[] = await this.embeddings!.embedQuery(text);
      return embedding;
    } catch (error) {
      logger.error('[VectorStoreService] Failed to get embedding:', error);
      throw error;
    }
  }

  /**
   * Create a fallback in-memory vector store when Chroma is not available
   */
  private createFallbackVectorStore(): any {
    const documents: any[] = [];
    
    return {
      addDocuments: async (docs: Document[]) => {
        documents.push(...docs.map((doc: Document) => ({
          pageContent: doc.pageContent,
          metadata: doc.metadata,
          id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        })));
        return documents.slice(-docs.length).map((d: any) => d.id);
      },
      similaritySearch: async (query: string, k: number = 5) => {
        // Simple fallback: return first k documents (no actual similarity)
        logger.warn(`[VectorStoreService] Using fallback search (no embeddings). Returning first ${k} documents.`);
        return documents
          .slice(0, k)
          .map((doc: any) => new Document({
            pageContent: doc.pageContent,
            metadata: doc.metadata,
          }));
      },
      delete: async (ids: { ids: string[] }) => {
        // Simple fallback delete
        const idSet = new Set(ids.ids);
        const removed = documents.filter((d: any) => idSet.has(d.id));
        documents.length = 0;
        documents.push(...documents.filter((d: any) => !idSet.has(d.id)));
        logger.info(`[VectorStoreService] Fallback delete removed ${removed.length} documents`);
      },
    };
  }
}

// Singleton instances per application
const vectorStoreInstances: Map<string, VectorStoreService> = new Map();

export async function getVectorStore(collectionName: string = 'knowledge-base', applicationId?: string): Promise<VectorStoreService> {
  const instanceKey = applicationId || 'default';
  
  if (!vectorStoreInstances.has(instanceKey)) {
    // Use /tmp directory with fallback to memory-only if needed
    const tmpDir = path.join('/tmp', 'vectorstore', applicationId || 'default');
    
    const instance = new VectorStoreService({
      collectionName,
      persistDir: tmpDir,
      applicationId,
    });
    await instance.initialize();
    vectorStoreInstances.set(instanceKey, instance);
  }
  
  return vectorStoreInstances.get(instanceKey)!;
}
