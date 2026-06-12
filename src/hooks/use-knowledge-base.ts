/**
 * Hook: useKnowledgeBase
 * 
 * Provides KB operations with automatic config fetching
 * Handles loading states, errors, and config validation
 * Used by both Upload and Chat tabs
 */

import { useState, useCallback, useEffect } from 'react';
import {
  fetchKBConfig,
  queryKnowledgeBase,
  uploadDocumentToKB,
  deleteDocumentFromKB,
  listKBDocuments,
  type KBConfig,
  type ChatQueryResponse,
  type EmbeddingResponse,
} from '@/api/kb-services-client';

interface UseKnowledgeBaseReturn {
  // Config state
  config: KBConfig | null;
  isLoadingConfig: boolean;
  configError: string | null;

  // Operations
  uploadDocument: (file: File, onProgress?: (progress: number) => void) => Promise<EmbeddingResponse>;
  queryKB: (query: string, threadId: string) => Promise<ChatQueryResponse>;
  deleteDocument: (documentId: string) => Promise<void>;
  listDocuments: () => Promise<Array<any>>;

  // Operation states
  isUploading: boolean;
  isQuerying: boolean;
  operationError: string | null;
}

/**
 * Hook to manage knowledge base operations for an application
 * Fetches config on mount and provides all KB operations
 */
export function useKnowledgeBase(applicationId: string): UseKnowledgeBaseReturn {
  const [config, setConfig] = useState<KBConfig | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);

  // Fetch KB config on mount or when applicationId changes
  useEffect(() => {
    const loadConfig = async (): Promise<void> => {
      setIsLoadingConfig(true);
      setConfigError(null);
      try {
        console.log('[v0-useKB] Loading KB config for app:', applicationId);
        const fetchedConfig = await fetchKBConfig(applicationId);
        setConfig(fetchedConfig);
        console.log('[v0-useKB] KB config loaded successfully');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[v0-useKB] Error loading KB config:', message);
        setConfigError(message);
        setConfig(null);
      } finally {
        setIsLoadingConfig(false);
      }
    };

    loadConfig();
  }, [applicationId]);

  // Upload document
  const uploadDocument = useCallback(
    async (file: File, onProgress?: (progress: number) => void): Promise<EmbeddingResponse> => {
      if (!config) {
        throw new Error('KB configuration not loaded');
      }

      setIsUploading(true);
      setOperationError(null);
      try {
        console.log('[v0-useKB] Uploading document:', file.name);
        const result = await uploadDocumentToKB(applicationId, file, onProgress);
        console.log('[v0-useKB] Document uploaded successfully');
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[v0-useKB] Upload error:', message);
        setOperationError(message);
        throw error;
      } finally {
        setIsUploading(false);
      }
    },
    [applicationId, config]
  );

  // Query knowledge base
  const queryKB = useCallback(
    async (query: string, threadId: string): Promise<ChatQueryResponse> => {
      if (!config) {
        throw new Error('KB configuration not loaded');
      }

      setIsQuerying(true);
      setOperationError(null);
      try {
        console.log('[v0-useKB] Querying KB');
        const result = await queryKnowledgeBase(applicationId, query, threadId);
        console.log('[v0-useKB] Query completed');
        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[v0-useKB] Query error:', message);
        setOperationError(message);
        throw error;
      } finally {
        setIsQuerying(false);
      }
    },
    [applicationId, config]
  );

  // Delete document
  const deleteDocument = useCallback(
    async (documentId: string): Promise<void> => {
      setOperationError(null);
      try {
        console.log('[v0-useKB] Deleting document:', documentId);
        await deleteDocumentFromKB(applicationId, documentId);
        console.log('[v0-useKB] Document deleted');
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[v0-useKB] Delete error:', message);
        setOperationError(message);
        throw error;
      }
    },
    [applicationId]
  );

  // List documents
  const listDocuments = useCallback(async (): Promise<Array<any>> => {
    setOperationError(null);
    try {
      console.log('[v0-useKB] Fetching documents list');
      const documents = await listKBDocuments(applicationId);
      console.log('[v0-useKB] Found', documents.length, 'documents');
      return documents;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[v0-useKB] List error:', message);
      setOperationError(message);
      throw error;
    }
  }, [applicationId]);

  return {
    config,
    isLoadingConfig,
    configError,
    uploadDocument,
    queryKB,
    deleteDocument,
    listDocuments,
    isUploading,
    isQuerying,
    operationError,
  };
}
