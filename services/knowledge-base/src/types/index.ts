/**
 * Knowledge Base Service Types
 * Comprehensive type definitions for embedding, indexing, and search
 */

// Document sources
export type DataSourceType = 'uploaded-document' | 'postgresql' | 'external';

export interface Document {
  id: string;
  appId: string;
  sourceType: DataSourceType;
  sourceId: string; // File ID, table name, or external source ID
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Chunking configuration
export interface ChunkingConfig {
  method: 'recursive-character' | 'token-based' | 'semantic';
  chunkSize: number; // characters or tokens
  chunkOverlap: number; // overlap percentage (0-50)
  separators?: string[]; // Priority order for recursive splitting
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  appId: string;
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
  tokenCount: number;
  startPosition: number;
  endPosition: number;
}

// Embedding configuration
export interface EmbeddingConfig {
  model: 'sentence-transformers' | 'openai' | 'custom';
  dimension: number;
  batchSize: number;
  temperature?: number;
}

export interface EmbeddedChunk {
  id: string;
  chunkId: string;
  documentId: string;
  appId: string;
  embedding: number[];
  content: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

// Indexing configuration
export interface IndexConfig {
  indexName: string;
  appId: string;
  metric: 'cosine' | 'l2' | 'inner_product';
  space: 'l2' | 'cosine' | 'ip';
  indexed: boolean;
  lastIndexedAt?: Date;
}

// Search request and response
export interface SearchRequest {
  appId: string;
  query: string;
  queryEmbedding?: number[]; // Pre-computed embedding
  limit: number;
  threshold?: number; // Minimum similarity score
  includeMetadata?: boolean;
  filters?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  chunkId: string;
  documentId: string;
  sourceType: DataSourceType;
  sourceName: string;
  content: string;
  relevanceScore: number; // 0-100
  semanticScore: number; // Cosine similarity 0-1
  textScore?: number; // BM25 or full-text score
  metadata: Record<string, unknown>;
  rankingScore?: number; // After re-ranking
}

export interface HybridSearchRequest extends SearchRequest {
  hybridWeight?: {
    semantic: number; // 0-1
    textual: number; // 0-1
  };
  rerankTopK?: number; // Re-rank top N results
}

export interface HybridSearchResponse {
  results: SearchResult[];
  query: string;
  executionTimeMs: number;
  totalResults: number;
}

// Re-ranking configuration
export interface RerankConfig {
  enabled: boolean;
  model?: 'cross-encoder' | 'colbert';
  topK: number; // Number of results to re-rank
  threshold?: number; // Minimum re-rank score
}

// Data source management
export interface DataSource {
  id: string;
  appId: string;
  type: DataSourceType;
  name: string;
  status: 'active' | 'syncing' | 'failed' | 'paused';
  config: Record<string, unknown>; // PostgreSQL connection, file metadata, etc.
  documentCount: number;
  chunkCount: number;
  lastSyncAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Ingestion job
export interface IngestionJob {
  id: string;
  appId: string;
  dataSourceId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  documentsProcessed: number;
  chunksCreated: number;
  embeddingsGenerated: number;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Statistics
export interface KnowledgeBaseStats {
  appId: string;
  totalDocuments: number;
  totalChunks: number;
  totalEmbeddings: number;
  dataSources: DataSource[];
  indexStatus: IndexConfig;
  storageUsedMB: number;
  lastUpdated: Date;
}

// Error response
export interface ErrorResponse {
  error: {
    message: string;
    code: string;
    details?: Record<string, unknown>;
  };
}

// Type guards
export function isSearchResult(value: unknown): value is SearchResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.chunkId === 'string' &&
    typeof obj.documentId === 'string' &&
    typeof obj.content === 'string' &&
    typeof obj.relevanceScore === 'number'
  );
}

export function isHybridSearchResponse(value: unknown): value is HybridSearchResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    Array.isArray(obj.results) &&
    typeof obj.query === 'string' &&
    typeof obj.executionTimeMs === 'number'
  );
}
