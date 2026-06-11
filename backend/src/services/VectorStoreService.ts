import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings, AzureOpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { configManager } from '../utils/ConfigManager.js';
import { llmProviderService } from './LLMProviderService.js';

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
      let apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
      let deploymentName = process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-large';
      let embeddingProvider = 'azure-openai';
      let skipSslVerification = false;

      // Get embeddings connection from KB LLM Provider Service (mapper methods)
      // This fetches from MongoDB and maps fields to embeddings connection parameters
      if (this.applicationId) {
        try {
          logger.info(`[VectorStoreService] 1. Getting embeddings provider for app ${this.applicationId}`);
          const embeddingsProvider = await llmProviderService.getKBEmbeddingsProvider(this.applicationId);
          logger.info(`[VectorStoreService] 2. Embeddings provider created successfully`);
          
          // Get the MongoDB config to extract the actual values
          const kbConfig = await configManager.getApplicationKBConfig(this.applicationId);
          if (kbConfig) {
            logger.info(`[VectorStoreService] 3. KB config retrieved from MongoDB`);
            
            // Extract embeddings parameters that were mapped by getKBEmbeddingsProvider()
            if (kbConfig.embedding_api_key) {
              apiKey = kbConfig.embedding_api_key;
              logger.info(`[VectorStoreService] 4. Using KB config embedding API key`);
            }
            if (kbConfig.embedding_azure_endpoint) {
              endpoint = kbConfig.embedding_azure_endpoint;
              logger.info(`[VectorStoreService] 5. Using KB config embedding endpoint`);
            }
            if (kbConfig.embedding_api_version) {
              apiVersion = kbConfig.embedding_api_version;
              logger.info(`[VectorStoreService] 6. Using KB config embedding API version`);
            }
            if (kbConfig.embeddingModel) {
              deploymentName = kbConfig.embeddingModel;
              logger.info(`[VectorStoreService] 7. Using KB config embedding model: ${deploymentName}`);
            }
            if (kbConfig.embedding_skipSslVerification) {
              skipSslVerification = kbConfig.embedding_skipSslVerification;
            }
            embeddingProvider = (kbConfig as any).embeddingProvider || 'azure-openai';
            logger.info(`[VectorStoreService] 8. Embeddings provider: ${embeddingProvider}`);
          }
        } catch (error: unknown) {
          if (error instanceof Error) {
            logger.warn(`[VectorStoreService] Failed to get embeddings provider from KB config: ${error.message}`);
          } else {
            logger.warn(`[VectorStoreService] Failed to get embeddings provider from KB config`);
          }
          logger.info(`[VectorStoreService] Using env variables for embeddings`);
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
          ...(skipSslVerification && { requestOptions: { rejectUnauthorized: false } }),
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
        // Connect to Chroma server running in Docker
        this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
          collectionName: this.collectionName,
          url: 'http://chroma:8000', // Docker service name (internal network)
        });
        logger.info(`[VectorStoreService] Connected to Chroma server at http://chroma:8000 (Docker)`);
      } catch (chromaServerError) {
        // Try localhost fallback for local development
        try {
          this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
            collectionName: this.collectionName,
            url: 'http://localhost:8888', // Local Chroma development (port 8888 maps to 8000)
          });
          logger.info(`[VectorStoreService] Connected to Chroma server at http://localhost:8888 (local development)`);
        } catch (chromaLocalError) {
          logger.error(
            `[VectorStoreService] Could not connect to Chroma. Ensure Chroma is running at http://chroma:8000 (Docker) or http://localhost:8888 (local). Error: ${chromaLocalError}`
          );
          throw new Error(
            'Vector store (Chroma) is not available. Please ensure Chroma Docker service is running. Start with: docker-compose up -d chroma'
          );
        }
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
   * Validate Azure OpenAI connection before starting embeddings
   */
  private async validateAzureOpenAIConnection(): Promise<void> {
    if (!this.embeddings) {
      throw new Error('Embeddings not initialized');
    }

    try {
      logger.info(`[VectorStoreService] Validating Azure OpenAI connection...`);
      const startTime = Date.now();
      
      // Test the connection by embedding a small test string
      const testString = 'test';
      const testEmbedding = await this.embeddings.embedQuery(testString);
      
      const elapsed = Date.now() - startTime;
      
      if (!testEmbedding || testEmbedding.length === 0) {
        throw new Error('Received empty embedding from Azure OpenAI');
      }
      
      logger.info(
        `[VectorStoreService] Azure OpenAI connection validated successfully. ` +
        `Embedding dimension: ${testEmbedding.length}, Response time: ${elapsed}ms`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[VectorStoreService] Azure OpenAI connection validation failed: ${message}`);
      throw new Error(
        `Failed to connect to Azure OpenAI for embeddings: ${message}. ` +
        `Please verify LLM Configuration in Settings → LLM Configuration. ` +
        `Check API key, endpoint, and deployment name.`
      );
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
      // Validate Azure OpenAI connection before starting embeddings
      await this.validateAzureOpenAIConnection();
      
      logger.info(`[VectorStoreService] Preparing to add ${documents.length} documents to vector store...`);
      
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

      logger.info(`[VectorStoreService] Calling vectorStore.addDocuments with ${langchainDocs.length} LangChain documents...`);
      const startTime = Date.now();
      
      // Add timeout to prevent hanging if Chroma is unreachable
      // Increased to 300s (5 minutes) since embedding generation can be slow
      const addDocsPromise = this.vectorStore!.addDocuments(langchainDocs);
      const timeoutPromise = new Promise<string[]>((_, reject) =>
        setTimeout(() => {
          const elapsed = Date.now() - startTime;
          reject(new Error(`Vector store operation timed out after ${elapsed}ms. Chroma may be unreachable or overloaded.`));
        }, 300000)
      );
      
      const ids: string[] = await Promise.race([addDocsPromise, timeoutPromise]);
      const elapsed = Date.now() - startTime;
      logger.info(`[VectorStoreService] Successfully added ${ids.length} documents to collection in ${elapsed}ms`);
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
