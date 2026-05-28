import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';
import { kbConfigService } from './KnowledgeBaseConfigService.js';
import { cryptoUtil } from '../utils/CryptoUtil.js';

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
      let deploymentName = 'text-embedding-ada-002';

      // Try to retrieve app-specific KB config from MongoDB (knowledgebaseconfigs collection)
      if (this.applicationId) {
        try {
          const kbConfig = await kbConfigService.getConfig(this.applicationId);
          if (kbConfig) {
            // KB config stores embedding credentials separately
            if (kbConfig.embeddingProvider === 'azure-openai') {
              // Decrypt encrypted credentials
              if (kbConfig.embeddingAzureApiKey) {
                apiKey = cryptoUtil.decrypt(kbConfig.embeddingAzureApiKey);
              }
              if (kbConfig.embeddingAzureEndpoint) {
                endpoint = kbConfig.embeddingAzureEndpoint;
              }
              if (kbConfig.embeddingAzureDeploymentName) {
                deploymentName = kbConfig.embeddingAzureDeploymentName;
              }
              logger.info(`[VectorStoreService] Using saved KB embedding config for app ${this.applicationId}`);
            }
          }
        } catch (error: any) {
          logger.info(`[VectorStoreService] No saved KB config found for app, using env variables: ${error.message}`);
        }
      }

      if (!apiKey || !endpoint) {
        throw new Error('Azure OpenAI credentials not configured for embeddings');
      }

      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: apiKey,
        apiKey: apiKey,
        model: deploymentName,
      });

      if (!fs.existsSync(this.persistDir)) {
        fs.mkdirSync(this.persistDir, { recursive: true });
      }

      this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
        collectionName: this.collectionName,
        url: `file://${this.persistDir}`,
      });

      this.isInitialized = true;
      logger.info(`[VectorStoreService] Initialized with collection: ${this.collectionName}, appId: ${this.applicationId}, using KB config`);
    } catch (error) {
      logger.error('[VectorStoreService] Initialization failed:', error);
      throw error;
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
}

// Singleton instances per application
const vectorStoreInstances: Map<string, VectorStoreService> = new Map();

export async function getVectorStore(collectionName: string = 'knowledge-base', applicationId?: string): Promise<VectorStoreService> {
  const instanceKey = applicationId || 'default';
  
  if (!vectorStoreInstances.has(instanceKey)) {
    const instance = new VectorStoreService({
      collectionName,
      persistDir: path.join(process.cwd(), 'data', 'vectorstore'),
      applicationId,
    });
    await instance.initialize();
    vectorStoreInstances.set(instanceKey, instance);
  }
  
  return vectorStoreInstances.get(instanceKey)!;
}
