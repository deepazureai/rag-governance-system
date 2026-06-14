import { RAGSession, RAGSessionDocument, ChatMessage, ContextDetail } from '../models/RAGSession.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * RAG Session Manager Service
 * Handles multi-session management for knowledge base interactions
 * Each session maintains its own embeddings, vector store, and chat history
 */

interface CreateSessionRequest {
  applicationId: string;
  sessionName: string;
  description?: string;
  embeddingModel: string;
  embeddingProvider: string;
  llmProvider: string;
  llmModel: string;
  vectorStoreType?: 'chroma' | 'pinecone' | 'weaviate';
  chunkSize?: number;
  overlapSize?: number;
}

interface QuerySessionRequest {
  sessionId: string;
  userQuery: string;
  context?: string;
}

class RAGSessionManager {
  /**
   * Create a new RAG session
   */
  async createSession(request: CreateSessionRequest): Promise<RAGSessionDocument> {
    const sessionId: string = uuidv4();
    
    const session = new RAGSession({
      sessionId,
      applicationId: request.applicationId,
      sessionName: request.sessionName,
      description: request.description || '',
      embeddingModel: request.embeddingModel,
      embeddingProvider: request.embeddingProvider,
      llmProvider: request.llmProvider,
      llmModel: request.llmModel,
      vectorStoreType: request.vectorStoreType || 'chroma',
      chunkSize: request.chunkSize || 1024,
      overlapSize: request.overlapSize || 128,
      chatHistory: [],
      uploadedFileNames: [],
      fileUploadDates: [],
      totalChunks: 0,
      totalQueries: 0,
      totalTokensUsed: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
    });

    const savedSession: RAGSessionDocument = await session.save();
    console.log(`[RAGSessionManager] Created new session: ${sessionId} for app: ${request.applicationId}`);
    
    return savedSession;
  }

  /**
   * Get all sessions for an application
   */
  async getApplicationSessions(applicationId: string, activeOnly: boolean = true): Promise<RAGSessionDocument[]> {
    const query: Record<string, unknown> = { applicationId };
    
    if (activeOnly) {
      query.isActive = true;
    }

    const sessions: RAGSessionDocument[] = await RAGSession.find(query)
      .sort({ lastAccessedAt: -1 })
      .exec();

    return sessions;
  }

  /**
   * Get a specific session by ID
   */
  async getSession(sessionId: string): Promise<RAGSessionDocument | null> {
    if (!sessionId?.trim()) {
      throw new Error('Session ID is required');
    }

    const session: RAGSessionDocument | null = await RAGSession.findOne({ sessionId }).exec();
    
    if (session) {
      session.lastAccessedAt = new Date();
      await session.save();
    }

    return session;
  }

  /**
   * Add a message to session chat history with full context
   * Creates session if it doesn't exist (upsert behavior)
   */
  async addChatMessage(
    sessionId: string,
    role: 'user' | 'assistant',
    content: string,
    options?: {
      contextRetrieved?: ContextDetail[];
      tokensUsed?: number;
      embeddingTime?: number;
      searchTime?: number;
      llmCallTime?: number;
      metadata?: Record<string, unknown>;
      applicationId?: string;
      sessionName?: string;
    }
  ): Promise<RAGSessionDocument | null> {
    if (!sessionId?.trim() || !content?.trim()) {
      throw new Error('Session ID and content are required');
    }

    const message: ChatMessage = {
      role,
      content,
      timestamp: new Date(),
      messageId: uuidv4(),
      ...(options?.contextRetrieved && { contextRetrieved: options.contextRetrieved }),
      ...(typeof options?.tokensUsed === 'number' && { tokensUsed: options.tokensUsed }),
      ...(typeof options?.embeddingTime === 'number' && { embeddingTime: options.embeddingTime }),
      ...(typeof options?.searchTime === 'number' && { searchTime: options.searchTime }),
      ...(typeof options?.llmCallTime === 'number' && { llmCallTime: options.llmCallTime }),
      ...(options?.metadata && { metadata: options.metadata }),
    };

    const updateData: Record<string, unknown> = {
      $push: { chatHistory: message },
      $set: { updatedAt: new Date(), lastAccessedAt: new Date() },
      $inc: { totalQueries: role === 'user' ? 1 : 0 },
    };

    // Add tokens to total if provided
    if (typeof options?.tokensUsed === 'number' && options.tokensUsed > 0) {
      (updateData as any).$inc.totalTokensUsed = options.tokensUsed;
    }

    try {
      // Check if session exists first
      let session = await RAGSession.findOne({ sessionId }).exec();
      
      if (!session) {
        // Session doesn't exist - need to create it with required fields
        const appId = options?.applicationId || 'unknown';
        const sessionName = options?.sessionName || `Session-${sessionId}`;
        
        console.log(`[RAGSessionManager] Creating new session: ${sessionId} for app: ${appId}`);
        
        session = new RAGSession({
          applicationId: appId,
          sessionId,
          sessionName,
          chatHistory: [message],
          totalQueries: role === 'user' ? 1 : 0,
          totalTokensUsed: options?.tokensUsed || 0,
          embeddingModel: 'text-embedding-3-large',  // Default
          embeddingProvider: 'azure-openai',  // Default
          llmProvider: 'azure-openai',  // Default
          llmModel: 'gpt-4.1-mini',  // Default
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date(),
          isActive: true,
        });
        
        await session.save();
        console.log(`[RAGSessionManager] ✓ Created new session ${sessionId}, total messages: 1`);
      } else {
        // Session exists - update it with new message
        session = await RAGSession.findOneAndUpdate(
          { sessionId },
          updateData,
          { new: true }
        ).exec();
        console.log(`[RAGSessionManager] ✓ Added message to existing session ${sessionId}, total messages: ${session?.chatHistory?.length || 0}`);
      }

      if (!session) {
        console.error(`[RAGSessionManager] Failed to save message to session: ${sessionId}`);
        throw new Error(`Failed to save message to session: ${sessionId}`);
      }

      return session;
    } catch (error) {
      console.error(`[RAGSessionManager] Error adding message to session ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Get chat history for a session
   */
  async getChatHistory(sessionId: string, limit: number = 50): Promise<ChatMessage[]> {
    if (!sessionId?.trim()) {
      throw new Error('Session ID is required');
    }

    const session: RAGSessionDocument | null = await RAGSession.findOne({ sessionId })
      .select('chatHistory')
      .exec();

    if (!session) {
      return [];
    }

    // Return last N messages
    return session.chatHistory.slice(-limit);
  }

  /**
   * Update session metadata (e.g., when documents are uploaded)
   */
  async updateSessionMetadata(
    sessionId: string,
    metadata: {
      uploadedFileNames?: string[];
      vectorStoreId?: string;
      totalChunks?: number;
    }
  ): Promise<RAGSessionDocument | null> {
    if (!sessionId?.trim()) {
      throw new Error('Session ID is required');
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      lastAccessedAt: new Date(),
    };

    if (Array.isArray(metadata.uploadedFileNames)) {
      updateData.uploadedFileNames = metadata.uploadedFileNames;
      updateData.fileUploadDates = metadata.uploadedFileNames.map(() => new Date());
    }

    if (metadata.vectorStoreId?.trim()) {
      updateData.vectorStoreId = metadata.vectorStoreId;
    }

    if (typeof metadata.totalChunks === 'number' && metadata.totalChunks >= 0) {
      updateData.totalChunks = metadata.totalChunks;
    }

    const session: RAGSessionDocument | null = await RAGSession.findOneAndUpdate(
      { sessionId },
      { $set: updateData },
      { new: true }
    ).exec();

    return session;
  }

  /**
   * Update token usage statistics
   */
  async updateTokenUsage(sessionId: string, tokensUsed: number): Promise<void> {
    if (!sessionId?.trim() || typeof tokensUsed !== 'number' || tokensUsed < 0) {
      throw new Error('Valid Session ID and token count are required');
    }

    await RAGSession.findOneAndUpdate(
      { sessionId },
      {
        $inc: { totalTokensUsed: tokensUsed },
        $set: { updatedAt: new Date() },
      }
    ).exec();
  }

  /**
   * Deactivate a session (soft delete)
   */
  async deactivateSession(sessionId: string): Promise<RAGSessionDocument | null> {
    if (!sessionId?.trim()) {
      throw new Error('Session ID is required');
    }

    const session: RAGSessionDocument | null = await RAGSession.findOneAndUpdate(
      { sessionId },
      { $set: { isActive: false, updatedAt: new Date() } },
      { new: true }
    ).exec();

    console.log(`[RAGSessionManager] Deactivated session: ${sessionId}`);
    
    return session;
  }

  /**
   * Delete a session and its chat history
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    if (!sessionId?.trim()) {
      throw new Error('Session ID is required');
    }

    const result = await RAGSession.deleteOne({ sessionId }).exec();
    
    if (result.deletedCount > 0) {
      console.log(`[RAGSessionManager] Deleted session: ${sessionId}`);
      return true;
    }

    return false;
  }

  /**
   * Clear chat history for a session while keeping embeddings
   */
  async clearChatHistory(sessionId: string): Promise<RAGSessionDocument | null> {
    if (!sessionId?.trim()) {
      throw new Error('Session ID is required');
    }

    const session: RAGSessionDocument | null = await RAGSession.findOneAndUpdate(
      { sessionId },
      {
        $set: { chatHistory: [], updatedAt: new Date() },
      },
      { new: true }
    ).exec();

    return session;
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<Record<string, unknown> | null> {
    if (!sessionId?.trim()) {
      throw new Error('Session ID is required');
    }

    const session: RAGSessionDocument | null = await RAGSession.findOne({ sessionId })
      .select('totalChunks totalQueries totalTokensUsed uploadedFileNames chatHistory createdAt updatedAt')
      .exec();

    if (!session) {
      return null;
    }

    return {
      sessionId,
      totalChunks: session.totalChunks,
      totalQueries: session.totalQueries,
      totalTokensUsed: session.totalTokensUsed,
      uploadedFilesCount: session.uploadedFileNames.length,
      chatHistoryLength: session.chatHistory.length,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      sessionAgeHours: Math.floor(
        (new Date().getTime() - session.createdAt.getTime()) / (1000 * 60 * 60)
      ),
    };
  }
}

export const ragSessionManager = new RAGSessionManager();
export type { CreateSessionRequest, QuerySessionRequest };
