/**
 * Knowledge Base Services Client
 * 
 * Provides reusable API calls for KB operations:
 * - Fetch KB config from MongoDB by applicationId
 * - Create embeddings using configured provider
 * - Query KB with chat completions
 * - Manage documents and chat sessions
 * 
 * Uses config fetched from /api/llm-config/kb/app/:appId
 * Same config is used for embeddings (Upload tab) and chat (Chat tab)
 */

import { validateResponse } from '@/lib/knowledge-base-validation';

export interface KBConfig {
  applicationId: string;
  kbLlmProvider: string;
  embeddingProvider: string;
  temperature?: number;
  maxTokens?: number;
  kbllm_skipSslVerification?: boolean;
  embedding_skipSslVerification?: boolean;
  // Provider-specific fields (decrypted by backend)
  kbllm_azure_endpoint?: string;
  kbllm_api_key?: string;
  kbllm_deployment?: string;
  kbllm_api_version?: string;
  embedding_azure_endpoint?: string;
  embedding_api_key?: string;
  embedding_deployment?: string;
  embedding_api_version?: string;
}

export interface EmbeddingResponse {
  documentId: string;
  fileName: string;
  totalChunks: number;
  embeddingStatus: 'success' | 'error';
  message: string;
}

export interface ChatQueryResponse {
  message: string;
  contextSources: Array<{
    documentId: string;
    chunkId: string;
    content: string;
    relevanceScore: number;
  }>;
  queryTime: number;
  searchTime: number;
}

interface CachedConfig {
  data: KBConfig;
  timestamp: number;
}

// Cache for KB configs (15 minute TTL)
const configCache = new Map<string, CachedConfig>();
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Fetch KB configuration from MongoDB for the given application ID
 * Caches config for 15 minutes to reduce API calls
 */
export async function fetchKBConfig(applicationId: string): Promise<KBConfig> {
  // Check cache first
  const cached = configCache.get(applicationId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    console.log('[v0-kbservices] KB config loaded from cache for app:', applicationId);
    return cached.data;
  }

  try {
    console.log('[v0-kbservices] Fetching KB config from API for app:', applicationId);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const response = await fetch(`${apiUrl}/api/llm-config/kb/app/${applicationId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `KB configuration not found for application ${applicationId}. Please configure KB settings in Settings → KB tab.`
        );
      }
      throw new Error(`Failed to fetch KB config: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data) {
      throw new Error('Invalid KB config response from server');
    }

    const config = data.data as KBConfig;
    
    // Validate required fields
    if (!config.kbLlmProvider || !config.embeddingProvider) {
      throw new Error('KB configuration is incomplete. Missing required providers.');
    }

    // Cache the config
    configCache.set(applicationId, { data: config, timestamp: Date.now() });
    console.log('[v0-kbservices] KB config cached for app:', applicationId);

    return config;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0-kbservices] Error fetching KB config:', message);
    throw error;
  }
}

/**
 * Clear KB config cache for specific app or all apps
 */
export function clearKBConfigCache(applicationId?: string): void {
  if (applicationId) {
    configCache.delete(applicationId);
    console.log('[v0-kbservices] Cleared KB config cache for app:', applicationId);
  } else {
    configCache.clear();
    console.log('[v0-kbservices] Cleared all KB config caches');
  }
}

/**
 * Upload document to knowledge base and create embeddings
 * Uses embeddings provider from KB config
 */
export async function uploadDocumentToKB(
  applicationId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<EmbeddingResponse> {
  try {
    console.log('[v0-kbservices] 1. Starting document upload for app:', applicationId);

    // Fetch KB config to get embeddings provider info
    console.log('[v0-kbservices] 2. Fetching KB config for embeddings provider');
    const config = await fetchKBConfig(applicationId);
    
    if (!config.embeddingProvider) {
      throw new Error('Embeddings provider not configured. Please set up KB settings.');
    }

    console.log('[v0-kbservices] 3. Using embeddings provider:', config.embeddingProvider);

    // Create FormData with file and config
    const formData = new FormData();
    formData.append('file', file);
    formData.append('applicationId', applicationId);
    formData.append('embeddingProvider', config.embeddingProvider);

    // Call backend endpoint to upload and create embeddings
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const response = await fetch(`${apiUrl}/api/knowledge-base/upload`, {
      method: 'POST',
      body: formData,
    });

    console.log('[v0-kbservices] 4. Upload response status:', response.status);

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json() as EmbeddingResponse;
    console.log('[v0-kbservices] 5. Document uploaded - chunks:', result.totalChunks);

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0-kbservices] Error uploading document:', message);
    throw error;
  }
}

/**
 * Query knowledge base with chat completion
 * Uses KB chat LLM provider from config
 */
export async function queryKnowledgeBase(
  applicationId: string,
  query: string,
  threadId: string
): Promise<ChatQueryResponse> {
  try {
    console.log('[v0-kbservices] 1. Starting KB query for app:', applicationId);

    // Fetch KB config to get chat provider info
    console.log('[v0-kbservices] 2. Fetching KB config for chat provider');
    const config = await fetchKBConfig(applicationId);

    if (!config.kbLlmProvider) {
      throw new Error('KB Chat LLM provider not configured. Please set up KB settings.');
    }

    console.log('[v0-kbservices] 3. Using KB chat provider:', config.kbLlmProvider);
    console.log('[v0-kbservices] 4. Query:', query.substring(0, 50) + '...');

    // Call backend endpoint for KB query
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const response = await fetch(`${apiUrl}/api/knowledge-base/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        applicationId,
        query,
        threadId,
        temperature: config.temperature || 0.7,
        maxTokens: config.maxTokens || 2048,
      }),
    });

    console.log('[v0-kbservices] 5. Query response status:', response.status);

    if (!response.ok) {
      throw new Error(`Query failed: ${response.statusText}`);
    }

    const result = await response.json() as ChatQueryResponse;
    console.log('[v0-kbservices] 6. Query completed - sources:', result.contextSources.length, 'time:', result.queryTime + 'ms');

    return result;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0-kbservices] Error querying KB:', message);
    throw error;
  }
}

/**
 * Delete document from knowledge base
 */
export async function deleteDocumentFromKB(applicationId: string, documentId: string): Promise<void> {
  try {
    console.log('[v0-kbservices] Deleting document:', documentId, 'from app:', applicationId);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const response = await fetch(`${apiUrl}/api/knowledge-base/documents/${documentId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ applicationId }),
    });

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    console.log('[v0-kbservices] Document deleted successfully');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0-kbservices] Error deleting document:', message);
    throw error;
  }
}

/**
 * Get list of documents in knowledge base
 */
export async function listKBDocuments(
  applicationId: string
): Promise<
  Array<{
    documentId: string;
    fileName: string;
    fileSize: number;
    uploadDate: Date;
    totalChunks: number;
    status: 'indexed' | 'processing' | 'failed';
  }>
> {
  try {
    console.log('[v0-kbservices] Fetching documents for app:', applicationId);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
    const response = await fetch(`${apiUrl}/api/knowledge-base/documents?applicationId=${applicationId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[v0-kbservices] Found', data.documents?.length || 0, 'documents');

    return data.documents || [];
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[v0-kbservices] Error fetching documents:', message);
    throw error;
  }
}
