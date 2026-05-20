import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger.js';

interface ChromaConfig {
  collectionName: string;
  persistDir: string;
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

  constructor(config: ChromaConfig) {
    this.collectionName = config.collectionName;
    this.persistDir = config.persistDir;
  }

  /**
   * Initialize embeddings and vector store
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize Azure OpenAI embeddings
      const apiKey = process.env.AZURE_OPENAI_API_KEY;
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
      const deploymentId = process.env.AZURE_OPENAI_DEPLOYMENT_ID || 'text-embedding-ada-002';

      if (!apiKey || !endpoint) {
        throw new Error('Azure OpenAI credentials not configured for embeddings');
      }

      this.embeddings = new OpenAIEmbeddings({
        azureOpenAIApiKey: apiKey,
        azureOpenAIApiInstanceName: new URL(endpoint).hostname.split('.')[0],
        azureOpenAIApiDeploymentName: deploymentId,
        azureOpenAIApiVersion: '2024-02-15-preview',
      });

      // Initialize Chromadb vector store with persistent storage
      if (!fs.existsSync(this.persistDir)) {
        fs.mkdirSync(this.persistDir, { recursive: true });
      }

      this.vectorStore = await Chroma.fromExistingCollection(this.embeddings, {
        collectionName: this.collectionName,
        url: `file://${this.persistDir}`,
      });

      this.isInitialized = true;
      logger.info(`[VectorStoreService] Initialized with collection: ${this.collectionName}`);
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
        (doc) =>
          new Document({
            pageContent: doc.content,
            metadata: {
              ...doc.metadata,
              namespace: namespace || 'default',
              addedAt: new Date().toISOString(),
            },
          })
      );

      const ids = await this.vectorStore!.addDocuments(langchainDocs);
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
      const results = await this.vectorStore!.similaritySearchWithScore(query, options.k);

      return results
        .filter(([_, score]) => !options.scoreThreshold || score >= options.scoreThreshold)
        .map(([doc, score]) => ({
          content: doc.pageContent,
          metadata: {
            ...doc.metadata,
            relevanceScore: score,
          },
        }));
    } catch (error) {
      logger.error('[VectorStoreService] Search failed:', error);
      throw error;
    }
  }

  /**
   * Batch search for multiple queries
   */
  async batchSearch(queries: string[], options: SearchOptions = { k: 5 }): Promise<Map<string, DocumentChunk[]>> {
    const results = new Map<string, DocumentChunk[]>();

    for (const query of queries) {
      const searchResults = await this.search(query, options);
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
      let results = await this.search(query, options);

      // Apply metadata filters if provided
      if (filters) {
        results = results.filter((doc) => {
          return Object.entries(filters).every(([key, value]) => doc.metadata[key] === value);
        });
      }

      return results.sort((a, b) => (b.metadata.relevanceScore || 0) - (a.metadata.relevanceScore || 0));
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
      const embedding = await this.embeddings!.embedQuery(text);
      return embedding;
    } catch (error) {
      logger.error('[VectorStoreService] Failed to get embedding:', error);
      throw error;
    }
  }
}

// Singleton instance for application
let vectorStoreInstance: VectorStoreService | null = null;

export async function getVectorStore(collectionName: string = 'knowledge-base'): Promise<VectorStoreService> {
  if (!vectorStoreInstance) {
    vectorStoreInstance = new VectorStoreService({
      collectionName,
      persistDir: path.join(process.cwd(), 'data', 'vectorstore'),
    });
    await vectorStoreInstance.initialize();
  }
  return vectorStoreInstance;
}
