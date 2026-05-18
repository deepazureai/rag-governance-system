/**
 * Indexing and Search Service
 * Manages ChromaDB index creation, hybrid search, and re-ranking
 * Uses HNSW algorithm with configurable distance metrics
 */

import { EmbeddedChunk, HybridSearchRequest, HybridSearchResponse, SearchResult, RerankConfig } from '../types/index.js';

interface ChromaClient {
  addEmbeddings(
    embeddings: number[][],
    documents: string[],
    metadatas: Record<string, unknown>[],
    ids: string[],
  ): Promise<void>;
  query(embeddings: number[][], topK: number): Promise<QueryResult>;
}

interface QueryResult {
  ids: string[][];
  distances: number[][];
  documents: string[][];
  metadatas: Record<string, unknown>[][];
}

export class IndexingService {
  private client: ChromaClient | null = null;
  private indexName: string;
  private appId: string;
  private metric: 'cosine' | 'l2' | 'inner_product';
  private rerankConfig: RerankConfig;

  constructor(
    indexName: string,
    appId: string,
    metric: 'cosine' | 'l2' | 'inner_product' = 'cosine',
    rerankConfig?: RerankConfig,
  ) {
    this.indexName = indexName;
    this.appId = appId;
    this.metric = metric;
    this.rerankConfig = rerankConfig || { enabled: false, topK: 10 };

    console.log(`[v0] Initialized IndexingService for ${indexName} with ${metric} metric`);
  }

  /**
   * Initialize ChromaDB client
   */
  async initialize(chromaServerUrl?: string): Promise<void> {
    // In production, initialize actual ChromaDB client
    // For now, mock implementation
    console.log(`[v0] Initializing ChromaDB connection to ${chromaServerUrl || 'localhost'}`);

    // Mock client that would be replaced with actual ChromaDB client
    this.client = {
      addEmbeddings: async () => console.log('[v0] Mock: Added embeddings to index'),
      query: async () => ({
        ids: [[]],
        distances: [[]],
        documents: [[]],
        metadatas: [[]],
      }),
    };
  }

  /**
   * Index embedded chunks
   * Uses HNSW algorithm for efficient similarity search
   */
  async indexChunks(embeddedChunks: EmbeddedChunk[]): Promise<void> {
    if (!this.client) {
      throw new Error('ChromaDB client not initialized');
    }

    console.log(`[v0] Indexing ${embeddedChunks.length} embedded chunks`);

    const embeddings = embeddedChunks.map((chunk) => chunk.embedding);
    const documents = embeddedChunks.map((chunk) => chunk.content);
    const metadatas = embeddedChunks.map((chunk) => ({
      ...chunk.metadata,
      chunkId: chunk.chunkId,
      documentId: chunk.documentId,
      appId: chunk.appId,
      createdAt: chunk.createdAt.toISOString(),
    }));
    const ids = embeddedChunks.map((chunk) => chunk.id);

    await this.client.addEmbeddings(embeddings, documents, metadatas, ids);

    console.log(`[v0] Successfully indexed ${embeddedChunks.length} chunks`);
  }

  /**
   * Hybrid search combining semantic and text-based search
   */
  async hybridSearch(request: HybridSearchRequest): Promise<HybridSearchResponse> {
    if (!this.client) {
      throw new Error('ChromaDB client not initialized');
    }

    const startTime = Date.now();
    console.log(`[v0] Starting hybrid search for query: "${request.query}"`);

    const hybridWeight = request.hybridWeight || { semantic: 0.7, textual: 0.3 };

    // Semantic search using embeddings
    const semanticResults = await this.semanticSearch(request);

    // Text search using BM25 or full-text search
    const textualResults = await this.textualSearch(request);

    // Combine results based on weights
    const combinedResults = this.combineResults(
      semanticResults,
      textualResults,
      hybridWeight.semantic,
      hybridWeight.textual,
    );

    // Re-rank if enabled
    let finalResults = combinedResults;
    if (this.rerankConfig.enabled && this.rerankConfig.topK > 0) {
      finalResults = await this.rerankResults(combinedResults);
    }

    // Sort by final score and limit results
    finalResults.sort((a, b) => (b.rankingScore || b.relevanceScore) - (a.rankingScore || a.relevanceScore));
    finalResults = finalResults.slice(0, request.limit);

    const executionTimeMs = Date.now() - startTime;

    console.log(
      `[v0] Hybrid search completed in ${executionTimeMs}ms, returned ${finalResults.length} results`,
    );

    return {
      results: finalResults,
      query: request.query,
      executionTimeMs,
      totalResults: finalResults.length,
    };
  }

  /**
   * Semantic search using vector similarity
   */
  private async semanticSearch(request: HybridSearchRequest): Promise<SearchResult[]> {
    if (!this.client || !request.queryEmbedding) {
      return [];
    }

    const results = await this.client.query([request.queryEmbedding], request.limit * 2); // Fetch more for combining

    const searchResults: SearchResult[] = [];

    if (results.ids && results.ids.length > 0) {
      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances?.[0]?.[i] ?? 0;
        const semanticScore = this.distanceToSimilarity(distance);

        searchResults.push({
          id: results.ids[0][i] || '',
          chunkId: (results.metadatas?.[0]?.[i]?.chunkId as string) || '',
          documentId: (results.metadatas?.[0]?.[i]?.documentId as string) || '',
          sourceType: 'uploaded-document',
          sourceName: 'Knowledge Base',
          content: (results.documents?.[0]?.[i] as string) || '',
          relevanceScore: semanticScore * 100,
          semanticScore,
          metadata: results.metadatas?.[0]?.[i] || {},
        });
      }
    }

    return searchResults;
  }

  /**
   * Text-based search using full-text search
   * In production, implement with PostgreSQL FTS or Elasticsearch
   */
  private async textualSearch(request: HybridSearchRequest): Promise<SearchResult[]> {
    // Placeholder: implement actual BM25 or full-text search
    // This would query a text index for keyword matches
    console.log(`[v0] Performing text search for: "${request.query}"`);

    return [];
  }

  /**
   * Combine semantic and textual search results
   */
  private combineResults(
    semanticResults: SearchResult[],
    textualResults: SearchResult[],
    semanticWeight: number,
    textualWeight: number,
  ): SearchResult[] {
    const combinedMap = new Map<string, SearchResult>();

    // Add semantic results with weighted score
    for (const result of semanticResults) {
      const weighted: SearchResult = {
        ...result,
        relevanceScore: result.semanticScore * semanticWeight * 100,
      };
      combinedMap.set(result.id, weighted);
    }

    // Add/merge textual results
    for (const result of textualResults) {
      if (combinedMap.has(result.id)) {
        const existing = combinedMap.get(result.id)!;
        existing.relevanceScore =
          (existing.semanticScore || 0) * semanticWeight * 100 + (result.textScore || 0) * textualWeight;
      } else {
        const weighted: SearchResult = {
          ...result,
          relevanceScore: (result.textScore || 0) * textualWeight * 100,
        };
        combinedMap.set(result.id, weighted);
      }
    }

    return Array.from(combinedMap.values());
  }

  /**
   * Re-rank top results using cross-encoder
   */
  private async rerankResults(
    results: SearchResult[],
  ): Promise<SearchResult[]> {
    if (!this.rerankConfig.enabled || results.length === 0) {
      return results;
    }

    console.log(`[v0] Re-ranking top ${Math.min(this.rerankConfig.topK, results.length)} results`);

    // In production, use cross-encoder model for re-ranking
    // For now, apply simple re-ranking based on BM25 score

    const toRerank = results.slice(0, this.rerankConfig.topK);

    // Mock re-ranking: boost score by 10% if document length is optimal
    const reranked = toRerank.map((result) => ({
      ...result,
      rankingScore: result.relevanceScore * (result.content.length > 100 ? 1.1 : 1.0),
    }));

    return [...reranked, ...results.slice(this.rerankConfig.topK)];
  }

  /**
   * Convert distance to similarity score
   * For cosine: similarity = 1 - distance
   * For L2: similarity = 1 / (1 + distance)
   */
  private distanceToSimilarity(distance: number): number {
    if (this.metric === 'cosine') {
      return Math.max(0, 1 - distance);
    } else if (this.metric === 'l2') {
      return 1 / (1 + distance);
    } else {
      // inner_product: already in similarity range
      return Math.max(0, Math.min(1, distance));
    }
  }

  /**
   * Delete index
   */
  async deleteIndex(): Promise<void> {
    console.log(`[v0] Deleting index: ${this.indexName}`);
    // In production, implement actual index deletion
  }

  /**
   * Get index statistics
   */
  getIndexStats(): {
    indexName: string;
    appId: string;
    metric: string;
    documentCount: number;
  } {
    return {
      indexName: this.indexName,
      appId: this.appId,
      metric: this.metric,
      documentCount: 0, // Would be retrieved from ChromaDB
    };
  }
}
