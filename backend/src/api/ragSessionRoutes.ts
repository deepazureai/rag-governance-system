import { Router, Request, Response } from 'express';
import { ragSessionManager, CreateSessionRequest } from '../services/RAGSessionManager.js';

export const ragSessionRouter = Router();

/**
 * POST /api/rag-sessions/create
 * Create a new RAG session for document analysis
 */
ragSessionRouter.post('/create', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, sessionName, description, embeddingModel, embeddingProvider, llmProvider, llmModel } = req.body;

    // Validation
    if (!applicationId?.trim() || !sessionName?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID and session name are required',
      });
      return;
    }

    const createSessionRequest: CreateSessionRequest = {
      applicationId,
      sessionName,
      description: description || '',
      embeddingModel: embeddingModel || 'text-embedding-3-small',
      embeddingProvider: embeddingProvider || 'openai',
      llmProvider: llmProvider || 'openai',
      llmModel: llmModel || 'gpt-4',
    };

    const session = await ragSessionManager.createSession(createSessionRequest);

    res.status(201).json({
      success: true,
      data: session,
      message: `RAG session created: ${session.sessionName}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error creating session:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to create RAG session',
    });
  }
});

/**
 * GET /api/rag-sessions/app/:applicationId
 * List all sessions for an application
 */
ragSessionRouter.get('/app/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const { activeOnly } = req.query;

    if (!applicationId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Application ID is required',
      });
      return;
    }

    const sessions = await ragSessionManager.getApplicationSessions(
      applicationId,
      activeOnly === 'false' ? false : true
    );

    res.json({
      success: true,
      data: {
        sessions,
        count: sessions.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error fetching sessions:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RAG sessions',
    });
  }
});

/**
 * GET /api/rag-sessions/:sessionId
 * Get a specific RAG session with chat history
 */
ragSessionRouter.get('/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const session = await ragSessionManager.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error fetching session:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch RAG session',
    });
  }
});

/**
 * POST /api/rag-sessions/:sessionId/chat
 * Add a message to session chat history
 */
ragSessionRouter.post('/:sessionId/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { role, content } = req.body;

    if (!sessionId?.trim() || !role?.trim() || !content?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Session ID, role, and content are required',
      });
      return;
    }

    if (!['user', 'assistant'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Role must be either "user" or "assistant"',
      });
      return;
    }

    const updatedSession = await ragSessionManager.addChatMessage(sessionId, role, content);

    if (!updatedSession) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        sessionId,
        message: { role, content, timestamp: new Date() },
        chatHistoryLength: updatedSession.chatHistory.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error adding message:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to add message to session',
    });
  }
});

/**
 * GET /api/rag-sessions/:sessionId/chat-history
 * Get chat history for a session
 */
ragSessionRouter.get('/:sessionId/chat-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { limit } = req.query;

    if (!sessionId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : 50;
    const chatHistory = await ragSessionManager.getChatHistory(sessionId, Math.max(1, Math.min(limitNum, 500)));

    res.json({
      success: true,
      data: {
        sessionId,
        chatHistory,
        count: chatHistory.length,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error fetching chat history:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history',
    });
  }
});

/**
 * PUT /api/rag-sessions/:sessionId/metadata
 * Update session metadata (file uploads, vector store info)
 */
ragSessionRouter.put('/:sessionId/metadata', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { uploadedFileNames, vectorStoreId, totalChunks } = req.body;

    if (!sessionId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const updatedSession = await ragSessionManager.updateSessionMetadata(sessionId, {
      uploadedFileNames: Array.isArray(uploadedFileNames) ? uploadedFileNames : undefined,
      vectorStoreId: vectorStoreId || undefined,
      totalChunks: typeof totalChunks === 'number' ? totalChunks : undefined,
    });

    if (!updatedSession) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: updatedSession,
      message: 'Session metadata updated',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error updating metadata:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to update session metadata',
    });
  }
});

/**
 * POST /api/rag-sessions/:sessionId/token-usage
 * Track token usage for billing/analytics
 */
ragSessionRouter.post('/:sessionId/token-usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const { tokensUsed } = req.body;

    if (!sessionId?.trim() || typeof tokensUsed !== 'number' || tokensUsed < 0) {
      res.status(400).json({
        success: false,
        error: 'Valid session ID and positive token count are required',
      });
      return;
    }

    await ragSessionManager.updateTokenUsage(sessionId, tokensUsed);

    res.json({
      success: true,
      message: `Added ${tokensUsed} tokens to session usage`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error updating token usage:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to update token usage',
    });
  }
});

/**
 * GET /api/rag-sessions/:sessionId/stats
 * Get session statistics
 */
ragSessionRouter.get('/:sessionId/stats', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const stats = await ragSessionManager.getSessionStats(sessionId);

    if (!stats) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error fetching stats:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session statistics',
    });
  }
});

/**
 * POST /api/rag-sessions/:sessionId/clear-history
 * Clear chat history while keeping embeddings
 */
ragSessionRouter.post('/:sessionId/clear-history', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const updatedSession = await ragSessionManager.clearChatHistory(sessionId);

    if (!updatedSession) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Chat history cleared successfully',
      data: { sessionId },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error clearing history:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to clear chat history',
    });
  }
});

/**
 * DELETE /api/rag-sessions/:sessionId
 * Delete a RAG session
 */
ragSessionRouter.delete('/:sessionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId } = req.params;

    if (!sessionId?.trim()) {
      res.status(400).json({
        success: false,
        error: 'Session ID is required',
      });
      return;
    }

    const deleted = await ragSessionManager.deleteSession(sessionId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Session not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Session deleted successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ragSessionRouter] Error deleting session:', message);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
    });
  }
});

export default ragSessionRouter;
