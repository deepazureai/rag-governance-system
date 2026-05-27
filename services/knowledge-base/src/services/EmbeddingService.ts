/**
 * Embedding Service
 * Uses LangChain for embeddings with support for multiple models
 * Handles batch processing and caching
 */

import { OpenAIEmbeddings } from '@langchain/openai';
import { EmbeddedChunk, EmbeddingConfig, DocumentChunk } from '../types/index.js';

export class EmbeddingService {
  private config: EmbeddingConfig;
  private embedder: OpenAIEmbeddings;
  private embeddingCache: Map<string, number[]>;

  constructor(config: EmbeddingConfig) {
    this.validateConfig(config);
    this.config = config;
    this.embeddingCache = new Map();

    // Initialize embedder based on model
    if (config.model === 'openai') {
      this.embedder = new OpenAIEmbeddings({
        modelName: 'text-embedding-3-small',
        batchSize: config.batchSize,
      });
    } else {
      throw new Error(`Unsupported embedding model: ${config.model}`);
    }
  }

  private validateConfig(config: EmbeddingConfig): void {
    if (!config.model) throw new Error('Embedding model is required');
    if (config.dimension < 256 || config.dimension > 3072) {
      throw new Error('Embedding dimension must be between 256 and 3072');
    }
    if (config.batchSize < 1 || config.batchSize > 100) {
      throw new Error('Batch size must be between 1 and 100');
    }
  }

  /**
   * Generate embeddings for document chunks
   * Implements batch processing and caching for efficiency
   */
  async embedChunks(chunks: DocumentChunk[]): Promise<EmbeddedChunk[]> {
    console.log(`[v0] Starting embedding of ${chunks.length} chunks`);

    const embeddedChunks: EmbeddedChunk[] = [];
    const textsToEmbed: { chunkIndex: number; text: string }[] = [];

    // Separate cached and uncached chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const cacheKey = this.generateCacheKey(chunk.content);

      if (this.embeddingCache.has(cacheKey)) {
        const embedding = this.embeddingCache.get(cacheKey);
        if (embedding) {
          embeddedChunks.push(this.createEmbeddedChunk(chunk, embedding));
        }
      } else {
        textsToEmbed.push({ chunkIndex: i, text: chunk.content });
      }
    }

    // Process uncached texts in batches
    if (textsToEmbed.length > 0) {
      const embeddings = await this.batchEmbed(textsToEmbed.map((t) => t.text));

      for (let i = 0; i < textsToEmbed.length; i++) {
        const { chunkIndex } = textsToEmbed[i];
        const chunk = chunks[chunkIndex];
        const embedding = embeddings[i];
        const cacheKey = this.generateCacheKey(chunk.content);

        this.embeddingCache.set(cacheKey, embedding);
        embeddedChunks.push(this.createEmbeddedChunk(chunk, embedding));
      }
    }

    console.log(`[v0] Completed embedding of ${embeddedChunks.length} chunks`);
    return embeddedChunks;
  }

  /**
   * Generate embedding for a single query
   */
  async embedQuery(query: string): Promise<number[]> {
    const cacheKey = this.generateCacheKey(query);

    if (this.embeddingCache.has(cacheKey)) {
      const cached = this.embeddingCache.get(cacheKey);
      if (cached) return cached;
    }

    const embeddings = await this.embedder.embedQuery(query);

    // Normalize to configured dimension
    const normalized = this.normalizeDimension(embeddings);
    this.embeddingCache.set(cacheKey, normalized);

    return normalized;
  }

  /**
   * Batch embed multiple texts
   */
  private async batchEmbed(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches according to config
    for (let i = 0; i < texts.length; i += this.config.batchSize) {
      const batch = texts.slice(i, i + this.config.batchSize);

      const batchEmbeddings = await this.embedder.embedDocuments(batch);
      const normalized = batchEmbeddings.map((emb: number[]) => this.normalizeDimension(emb));

      embeddings.push(...normalized);
    }

    return embeddings;
  }

  /**
   * Normalize embedding dimension to configured size
   * Use PCA-like approach or truncation for dimension reduction
   */
  private normalizeDimension(embedding: number[]): number[] {
    if (embedding.length === this.config.dimension) {
      return embedding;
    }

    if (embedding.length > this.config.dimension) {
      // Truncate to configured dimension
      return embedding.slice(0, this.config.dimension);
    } else {
      // Pad with zeros (in production, use proper dimensionality reduction)
      const padded = [...embedding];
      while (padded.length < this.config.dimension) {
        padded.push(0);
      }
      return padded;
    }
  }

  /**
   * Create EmbeddedChunk from chunk and embedding
   */
  private createEmbeddedChunk(chunk: DocumentChunk, embedding: number[]): EmbeddedChunk {
    return {
      id: `emb-${chunk.id}`,
      chunkId: chunk.id,
      documentId: chunk.documentId,
      appId: chunk.appId,
      embedding,
      content: chunk.content,
      metadata: chunk.metadata,
      createdAt: new Date(),
    };
  }

  /**
   * Generate cache key for embedding
   */
  private generateCacheKey(text: string): string {
    // Use hash of text for caching (in production, use proper hashing)
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `embed-${Math.abs(hash)}`;
  }

  /**
   * Clear embedding cache
   */
  clearCache(): void {
    this.embeddingCache.clear();
    console.log('[v0] Embedding cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; capacity: number } {
    return {
      size: this.embeddingCache.size,
      capacity: this.embeddingCache.size * 1536, // Approximate size in bytes (1536 dims × 8 bytes)
    };
  }
}
