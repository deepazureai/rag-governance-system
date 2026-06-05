import { Router, type Router as ExpressRouter, Request, Response, NextFunction } from 'express';
import { asString } from '../utils/queryParamUtils.js';
import multer, { Multer, StorageEngine } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import mongoose from 'mongoose';
import { VectorStoreService, getVectorStore } from '../services/VectorStoreService.js';
import { DocumentProcessorService } from '../services/DocumentProcessorService.js';
import { llmAssistanceService } from '../services/LLMAssistanceService.js';
import { ragQueryService } from '../services/RAGQueryService.js';
import { kbPromptService } from '../services/KBPromptService.js';
import { logger } from '../utils/logger.js';

const knowledgeBaseRouter: ExpressRouter = Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'knowledge-base');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

interface UploadRequest extends Request {
  files?: Express.Multer.File[];
  file?: Express.Multer.File;
}

interface UploadBody {
  applicationId: string;
  namespace?: string;
}

interface SearchBody {
  applicationId: string;
  query: string;
  k?: number;
  namespace?: string;
  filters?: Record<string, string | number | boolean>;
}

interface ValidateResponseBody {
  applicationId: string;
  userPrompt: string;
  llmResponse: string;
  topK?: number;
}

interface SearchResult {
  id: number;
  content: string;
  relevanceScore: number;
  source: string;
  keyTerms?: string[];
  chunkIndex?: number;
}

interface UploadResult {
  filename: string;
  chunksCreated?: number;
  keyTerms?: string[];
  status: 'success' | 'error';
  error?: string;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any): void => {
      cb(null, uploadDir);
    },
    filename: (_req: any, file: any, cb: any): void => {
      const uniqueName = `${Date.now()}-${file.originalname as string}`;
      cb(null, uniqueName);
    },
  }) as any,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req: any, file: any, cb: any): void => {
    if (!file || !file.originalname) {
      cb(new Error('File metadata missing'));
      return;
    }
    const allowedTypes = ['.pdf', '.txt', '.json', '.csv', '.md', '.docx'];
    const fileExt = path.extname((file.originalname as string) ?? '').toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExt}`));
    }
  },
}) as any;

// Custom middleware to handle both single file and multiple files
const handleFileUpload = (req: any, res: Response, next: any) => {
  // Try to handle as multiple files first
  upload.array('files', 10)(req, res, (err1: any) => {
    if (err1 && err1.code === 'LIMIT_UNEXPECTED_FILE') {
      // If 'files' fails, try single file
      upload.single('file')(req, res, (err2: any) => {
        if (err2) {
          return next(err2);
        }
        // Convert single file to array format for consistency
        if (req.file) {
          req.files = [req.file];
        }
        next();
      });
    } else if (err1) {
      next(err1);
    } else {
      next();
    }
  });
};

/**
 * Upload and vectorize documents
 * POST /api/knowledge-base/upload
 */
knowledgeBaseRouter.post('/upload', handleFileUpload, async (req: any, res: Response): Promise<void> => {
  try {
    const files = (req.files ?? []) as Express.Multer.File[];
    const body = req.body as UploadBody;
    const { applicationId, namespace } = body;

    console.log('[v0] Upload request received:', { 
      filesCount: files.length, 
      applicationId,
      namespace 
    });

    if (files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    if (!applicationId || typeof applicationId !== 'string') {
      res.status(400).json({ error: 'applicationId is required' });
      return;
    }

    logger.info(`[KnowledgeBase] Starting upload for app ${applicationId}, ${files.length} files`);

    let vectorStore: VectorStoreService;
    try {
      vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);
      logger.info(`[KnowledgeBase] Vector store initialized for app ${applicationId}`);
    } catch (initError) {
      const message = initError instanceof Error ? initError.message : 'Vector store initialization failed';
      logger.error(`[KnowledgeBase] Failed to initialize vector store: ${message}`);
      res.status(503).json({
        error: 'Knowledge Base service unavailable',
        details: message,
        message: 'Please ensure Azure OpenAI credentials are configured in Settings → LLM Configuration. Check your API key, endpoint, and deployment name.',
      });
      return;
    }

    const results: UploadResult[] = [];

    for (const file of files) {
      try {
        logger.info(`[KnowledgeBase] Processing upload: ${file.originalname}`);

        // Parse document
        const parsedDoc = await DocumentProcessorService.parseDocument(file.path);

        // Clean text
        const cleanedText = DocumentProcessorService.cleanText(parsedDoc.text);

        // Extract key terms for metadata
        const keyTerms = DocumentProcessorService.extractKeyTerms(cleanedText);

        // Smart chunk the document
        const chunks = DocumentProcessorService.smartChunk(
          {
            ...parsedDoc,
            text: cleanedText,
          },
          1000, // chunk size
          200 // overlap
        );

        // Convert chunks to vector store format with enriched metadata
        const documentChunks = chunks.map((chunk) => ({
          content: chunk.content,
          metadata: {
            ...chunk.metadata,
            applicationId,
            namespace: namespace ?? 'default',
            keyTerms: keyTerms.slice(0, 5),
            originalFilename: parsedDoc.filename,
            uploadedAt: parsedDoc.metadata.uploadedAt,
          },
        }));

        // Add to vector store
        let ids: string[] = [];
        try {
          ids = await vectorStore.addDocuments(documentChunks, namespace);
          logger.info(`[KnowledgeBase] Successfully vectorized ${file.originalname} (${ids.length} chunks)`);
        } catch (vectorError) {
          const message = vectorError instanceof Error ? vectorError.message : 'Vectorization failed';
          logger.error(`[KnowledgeBase] Failed to vectorize ${file.originalname}: ${message}`);
          results.push({
            filename: file.originalname,
            status: 'error',
            error: `Vectorization failed: ${message}`,
          });
          continue;
        }

        results.push({
          filename: file.originalname,
          chunksCreated: ids.length,
          keyTerms,
          status: 'success',
        });

        // Clean up uploaded file
        fs.unlinkSync(file.path);
      } catch (error) {
        logger.error(`[KnowledgeBase] Failed to process ${file.originalname}:`, error);
        results.push({
          filename: file.originalname,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Check if any files succeeded
    const successCount = results.filter((r) => r.status === 'success').length;
    const allFailed = successCount === 0;

    res.status(allFailed ? 500 : 200).json({
      uploadedAt: new Date().toISOString(),
      applicationId,
      namespace: namespace ?? 'default',
      results,
      totalChunksCreated: results.reduce((sum, r) => sum + (r.chunksCreated ?? 0), 0),
      success: successCount > 0,
      message: allFailed ? 'All files failed to upload' : `${successCount}/${files.length} files uploaded successfully`,
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Upload request failed:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(500).json({
      error: 'Upload failed',
      details: message,
      message: 'Server error during upload. Check KB configuration and try again.',
    });
  }
});

/**
 * Search knowledge base
 * POST /api/knowledge-base/search
 */
knowledgeBaseRouter.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as SearchBody;
    const { applicationId, query, namespace } = body;
    const k = body.k ?? 5;
    const filters = body.filters;

    if (!query || !applicationId) {
      res.status(400).json({ error: 'Missing query or applicationId' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);

    const results = await vectorStore.hybridSearch(query, filters, { k });

    logger.info(`[KnowledgeBase] Search completed: "${query}" (${results.length} results)`);

    const searchResults: SearchResult[] = results.map((result, idx) => ({
      id: idx,
      content: result.content.substring(0, 500), // Limit preview length
      relevanceScore: typeof result.metadata.relevanceScore === 'number' ? result.metadata.relevanceScore : 0,
      source: String(result.metadata.source ?? 'unknown'),
      keyTerms: Array.isArray(result.metadata.keyTerms) ? (result.metadata.keyTerms as string[]) : [],
      chunkIndex: typeof result.metadata.chunkIndex === 'number' ? result.metadata.chunkIndex : undefined,
    }));

    res.json({
      query,
      applicationId,
      namespace: namespace ?? 'default',
      timestamp: new Date().toISOString(),
      resultsCount: searchResults.length,
      results: searchResults,
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Search failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Search failed' });
  }
});

/**
 * Validate LLM response against knowledge base
 * POST /api/knowledge-base/validate-response
 */
knowledgeBaseRouter.post('/validate-response', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ValidateResponseBody;
    const { applicationId, userPrompt, llmResponse } = body;
    const topK = body.topK ?? 3;

    if (!applicationId || !userPrompt || !llmResponse) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);

    // Search for relevant documents using user prompt
    const relevantDocs = await vectorStore.search(userPrompt, { k: topK });

    // Simple validation: check if key terms from LLM response appear in knowledge base
    const llmTerms = DocumentProcessorService.extractKeyTerms(llmResponse, 5);
    const knowledgeBaseCombined = relevantDocs.map((doc) => doc.content).join(' ');
    const kbTerms = DocumentProcessorService.extractKeyTerms(knowledgeBaseCombined, 10);

    const matchedTerms = llmTerms.filter((term) => kbTerms.includes(term));
    const groundednessScore = llmTerms.length > 0 ? (matchedTerms.length / llmTerms.length) * 100 : 0;

    res.json({
      applicationId,
      userPrompt,
      validationResults: {
        timestamp: new Date().toISOString(),
        llmTerms,
        matchedTerms,
        groundednessScore: Math.round(groundednessScore),
        supportingDocuments: relevantDocs.slice(0, 3).map((doc, idx) => ({
          id: idx,
          preview: doc.content.substring(0, 300),
          relevance: Math.round(((typeof doc.metadata.relevanceScore === 'number' ? doc.metadata.relevanceScore : 0) * 100)),
          source: String(doc.metadata.source ?? 'unknown'),
        })),
        interpretation:
          groundednessScore >= 80
            ? 'Response is well-grounded in knowledge base'
            : groundednessScore >= 50
              ? 'Response partially grounded; some claims lack supporting evidence'
              : 'Response has low groundedness; many claims unsupported by knowledge base',
      },
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Validation failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Validation failed' });
  }
});

/**
 * Get knowledge base stats
 * GET /api/knowledge-base/stats/:applicationId
 */
knowledgeBaseRouter.get('/stats/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);
    
    if (!applicationId) {
      res.status(400).json({ error: 'Missing applicationId' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);
    const stats = await vectorStore.getStats();

    res.json({
      applicationId,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Stats retrieval failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to get stats' });
  }
});

/**
 * GET /api/knowledge-base/prompts/:applicationId
 * Retrieve KB prompts extracted from uploaded documents
 * Used by kb-prompt-selector.tsx for template synthesis
 */
knowledgeBaseRouter.get('/prompts/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);

    if (!applicationId) {
      res.status(400).json({ error: 'Missing applicationId' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);

    // Get all documents from vector store for this application
    const allDocs = await vectorStore.search('', { k: 10000 });

    interface KBPromptResult {
      _id: string;
      prompt: string;
      context: string;
      relevanceScore: number;
      usageCount: number;
      source: string;
      createdAt: string;
    }

    // Transform vector store chunks into prompts
    // Each chunk can be treated as a "prompt" with context being the surrounding chunks
    const prompts: KBPromptResult[] = allDocs.map((doc, idx) => ({
      _id: `kb-${idx}-${Date.now()}`,
      prompt: doc.content.substring(0, 200).trim(), // First 200 chars as prompt
      context: doc.content, // Full chunk as context
      relevanceScore: typeof doc.metadata.relevanceScore === 'number' ? doc.metadata.relevanceScore : 0.5,
      usageCount: 0,
      source: String(doc.metadata.source ?? 'unknown'),
      createdAt: String(doc.metadata.uploadedAt ?? new Date().toISOString()),
    }));

    logger.info(`[KnowledgeBase] Retrieved ${prompts.length} prompts for app: ${applicationId}`);

    res.json({
      success: true,
      applicationId,
      data: prompts,
      count: prompts.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to retrieve prompts:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve prompts' });
  }
});

/**
 * POST /api/knowledge-base/assist/generate-summary
 * LLM-assisted KB content summary generation
 * Accepts document content, returns LLM-suggested summary for user review
 */
knowledgeBaseRouter.post('/assist/generate-summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId, documentId, contentText } = req.body as Record<string, unknown>;

    if (!applicationId?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Application ID is required' });
      return;
    }

    if (!contentText?.toString().trim()) {
      res.status(400).json({ success: false, message: 'Content text is required' });
      return;
    }

    const content = contentText.toString().trim();

    if (content.length < 50 || content.length > 50000) {
      res.status(400).json({ success: false, message: 'Content must be between 50 and 50000 characters' });
      return;
    }

    logger.info(`[knowledgeBaseRoutes] Generating summary for KB content in app: ${applicationId}, doc: ${documentId || 'N/A'}`);

    const suggestion = await llmAssistanceService.assistGenerateKBSummary(
      applicationId.toString(),
      content
    );

    const validatedSuggestion = llmAssistanceService.validateLLMResponse(suggestion, 50, 2000);

    logger.info(`[knowledgeBaseRoutes] Generated KB summary suggestion (${validatedSuggestion.length} chars)`);

    res.status(200).json({
      success: true,
      message: 'KB summary suggestion generated successfully',
      data: {
        suggestion: validatedSuggestion,
        originalContentLength: content.length,
        documentId: documentId || null,
        llmProvider: 'configured-kb-provider',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[knowledgeBaseRoutes] Error in generate-summary assistance: ${message}`);
    res.status(500).json({ success: false, message });
  }
});

/**
 * GET /api/knowledge-base/prompts/:applicationId/:promptId
 * Fetch single KB prompt by ID for template synthesis enrichment
 */
knowledgeBaseRouter.get('/prompts/:applicationId/:promptId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);
    const promptId = asString(req.params.promptId);

    if (!applicationId || !promptId) {
      res.status(400).json({ error: 'Missing applicationId or promptId' });
      return;
    }

    logger.info(`[KnowledgeBase] Fetching single prompt: ${promptId} for app ${applicationId}`);

    const vectorStore = await getVectorStore(`app-${applicationId}`, applicationId);

    // Get all documents and find the matching one
    const allDocs = await vectorStore.search('', { k: 10000 });

    interface KBPromptResult {
      _id: string;
      prompt: string;
      context: string;
      relevanceScore: number;
      usageCount: number;
      source: string;
      createdAt: string;
    }

    // Find document matching the promptId
    const matchingDoc = allDocs.find((doc: any) => {
      const generatedId = `kb-${allDocs.indexOf(doc)}-${doc.metadata?.uploadedAt?.getTime?.() || Date.now()}`;
      return generatedId === promptId || doc.metadata?.id === promptId;
    });

    if (!matchingDoc) {
      res.status(404).json({ error: 'KB prompt not found' });
      return;
    }

    const prompt: KBPromptResult = {
      _id: promptId,
      prompt: matchingDoc.content.substring(0, 200).trim(),
      context: matchingDoc.content,
      relevanceScore: typeof matchingDoc.metadata.relevanceScore === 'number' 
        ? matchingDoc.metadata.relevanceScore 
        : 0.5,
      usageCount: 0,
      source: String(matchingDoc.metadata.source ?? 'unknown'),
      createdAt: String(matchingDoc.metadata.uploadedAt ?? new Date().toISOString()),
    };

    logger.info(`[KnowledgeBase] Retrieved single prompt: ${promptId}`);

    res.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to retrieve single prompt:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve prompt' });
  }
});

/**
 * PATCH /api/knowledge-base/prompts/:promptId/badge
 * Update badge status for a KB prompt (approval workflow)
 */
knowledgeBaseRouter.patch('/prompts/:promptId/badge', async (req: Request, res: Response): Promise<void> => {
  try {
    const promptId = asString(req.params.promptId);
    const body = req.body as Record<string, unknown>;

    const badgeStatusValue = body.badgeStatus;
    const badgedByValue = body.badgedBy;
    const badgeNotesValue = body.badgeNotes;

    const badgeStatus = typeof badgeStatusValue === 'string' ? badgeStatusValue : 'approved';
    const badgedBy = typeof badgedByValue === 'string' ? badgedByValue : 'system';
    const badgeNotes = typeof badgeNotesValue === 'string' ? badgeNotesValue : '';

    if (!promptId) {
      res.status(400).json({ error: 'Missing promptId' });
      return;
    }

    if (!['approved', 'pending', 'rejected'].includes(badgeStatus)) {
      res.status(400).json({ error: 'Invalid badge status' });
      return;
    }

    logger.info(`[KnowledgeBase] Updating badge status for prompt ${promptId}: ${badgeStatus}`);

    const KBPromptCollection = require('mongoose').connection.collection('kbprompts');

    const updateData: Record<string, unknown> = {
      badgeStatus,
      badgedBy,
      badgedAt: new Date(),
    };

    if (badgeNotes) {
      updateData.badgeNotes = badgeNotes;
    }

    let query: Record<string, unknown> = {};

    // Try to match by MongoDB ObjectId if promptId looks like one
    if (promptId.match(/^[0-9a-f]{24}$/i)) {
      query._id = new (require('mongoose')).Types.ObjectId(promptId);
    } else {
      // Fallback to string comparison
      query._id = promptId;
    }

    const result = await KBPromptCollection.findOneAndUpdate(query, { $set: updateData }, { returnDocument: 'after' });

    if (!result) {
      res.status(404).json({ error: 'KB prompt not found' });
      return;
    }

    logger.info(`[KnowledgeBase] Badge status updated for prompt ${promptId}`);

    res.json({
      success: true,
      data: {
        promptId,
        badgeStatus,
        badgedAt: new Date(),
        badgedBy,
      },
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to update badge status:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update badge status' });
  }
});

/**
 * GET /api/knowledge-base/badged-prompts/:applicationId
 * Fetch all badged (approved) KB prompts for BA review and template creation
 */
knowledgeBaseRouter.get('/badged-prompts/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);

    if (!applicationId) {
      res.status(400).json({ error: 'Missing applicationId' });
      return;
    }

    logger.info(`[KnowledgeBase] Fetching badged prompts for app ${applicationId}`);

    // Mock badged prompts - in production this would query the vector store or MongoDB
    // For now, return empty array as template
    const badgedPrompts: any[] = [];

    logger.info(`[KnowledgeBase] Retrieved ${badgedPrompts.length} badged prompts`);

    res.json({
      success: true,
      data: badgedPrompts,
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to retrieve badged prompts:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to retrieve badged prompts' });
  }
});

/**
 * POST /api/knowledge-base/chat
 * Execute RAG query: retrieve context, call LLM, return response with sources
 * Complete RAG pipeline: semantic search → context formatting → LLM call → response
 */
knowledgeBaseRouter.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as any;
    const { applicationId, threadId, userMessage } = body;
    const { temperature, maxTokens } = body;

    if (!applicationId || !userMessage?.trim()) {
      res.status(400).json({
        success: false,
        error: 'applicationId and userMessage are required',
      });
      return;
    }

    logger.info(`[KnowledgeBase] Chat query: app=${applicationId}, thread=${threadId}, query="${userMessage.substring(0, 100)}"`);

    // Execute full RAG pipeline
    const ragResponse = await ragQueryService.query({
      applicationId,
      query: userMessage,
      topK: 5,
      temperature,
      maxTokens,
    });

    // TODO: Store chat history in RAG session if threadId provided
    if (threadId) {
      logger.debug(`[KnowledgeBase] TODO: Store message in RAG session ${threadId}`);
    }

    res.json({
      success: true,
      data: {
        applicationId,
        threadId,
        userMessage,
        assistantMessage: ragResponse.assistantMessage,
        contextUsed: ragResponse.contextUsed,
        searchResults: ragResponse.searchResults,
        tokensUsed: ragResponse.tokensUsed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Chat query failed:', error);
    const message = error instanceof Error ? error.message : 'Chat query failed';
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/knowledge-base/prompts/badge
 * Create and badge a KB prompt from RAG chat response
 * Used when user badges a response in KB Chat to send to BA Review
 */
knowledgeBaseRouter.post('/prompts/badge', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as any;
    const {
      applicationId,
      userQuery,
      llmGeneratedResponse,
      contextRetrieved,
      embeddingModelUsed,
      ragSessionId,
      badgeStatus,
      badgedBy,
      badgeNotes,
      kbLlmConfigUsed,
    } = body;

    if (!applicationId || !userQuery || !llmGeneratedResponse) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: applicationId, userQuery, llmGeneratedResponse',
      });
      return;
    }

    logger.info(
      `[KnowledgeBase] Creating badged KB prompt: app=${applicationId}, query="${userQuery.substring(0, 50)}"`
    );

    const KBPromptCollection = require('mongoose').connection.collection('kbprompts');

    const promptData = {
      applicationId,
      userQuery,
      llmGeneratedResponse,
      contextRetrieved: contextRetrieved || [],
      embeddingModelUsed: embeddingModelUsed || 'text-embedding-3-large',
      ragSessionId: ragSessionId || 'transient-session',
      badgeStatus: badgeStatus || 'approved',
      badgedBy: badgedBy || 'system',
      badgedAt: new Date(),
      badgeNotes: badgeNotes || '',
      kbLlmConfigUsed: kbLlmConfigUsed || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Insert the badged prompt
    const result = await KBPromptCollection.insertOne(promptData);

    logger.info(`[KnowledgeBase] Badged KB prompt created with ID: ${result.insertedId}`);

    res.json({
      success: true,
      data: {
        promptId: result.insertedId.toString(),
        ...promptData,
        badgedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to create badged prompt:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create badged prompt',
    });
  }
});

/**
 * GET /api/knowledge-base/kb-prompts/approved
 * Fetch approved KB prompts for BA Review Queue
 * Used by BA Review Dashboard to populate KB Prompts tab
 */
knowledgeBaseRouter.get('/kb-prompts/approved', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = req.query.appId as string;

    if (!applicationId) {
      res.status(400).json({ error: 'Missing applicationId query parameter' });
      return;
    }

    logger.info(`[KnowledgeBase] Fetching approved KB prompts for app: ${applicationId}`);

    const KBPromptCollection = require('mongoose').connection.collection('kbprompts');

    // Find all approved prompts for the application
    const prompts = await KBPromptCollection.find({
      applicationId,
      badgeStatus: { $in: ['approved', 'pending'] },
    })
      .sort({ badgedAt: -1, createdAt: -1 })
      .limit(50)
      .toArray();

    logger.info(`[KnowledgeBase] Found ${prompts.length} approved KB prompts for app`);

    // Format response to match BA Review expectations
    const formattedPrompts = prompts.map((p: any) => ({
      id: p._id.toString(),
      source: 'kb_prompt',
      userQuery: p.userQuery,
      llmGeneratedResponse: p.llmGeneratedResponse,
      contextRetrieved: p.contextRetrieved || [],
      badgeStatus: p.badgeStatus || 'pending',
      badgedAt: p.badgedAt,
      badgedBy: p.badgedBy,
      badgeNotes: p.badgeNotes,
      embeddingModelUsed: p.embeddingModelUsed,
      ragSessionId: p.ragSessionId,
      documentSource: p.contextRetrieved?.[0]?.source || 'Unknown',
      relevanceScores: p.contextRetrieved?.map((c: any) => c.relevanceScore) || [],
    }));

    res.json({
      success: true,
      data: {
        prompts: formattedPrompts,
        count: formattedPrompts.length,
      },
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to fetch approved prompts:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch approved prompts',
    });
  }
});

/**
 * Create and badge a KB prompt (combined operation)
 * POST /api/knowledge-base/prompts/badge
 */
knowledgeBaseRouter.post('/prompts/badge', async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      applicationId,
      userQuery,
      llmGeneratedResponse,
      contextRetrieved,
      embeddingModelUsed,
      ragSessionId,
      badgeNotes,
      badgedBy = 'tester',
    } = req.body;

    if (!applicationId?.trim()) {
      res.status(400).json({ error: 'Application ID is required' });
      return;
    }
    if (!userQuery?.trim()) {
      res.status(400).json({ error: 'User query is required' });
      return;
    }
    if (!llmGeneratedResponse?.trim()) {
      res.status(400).json({ error: 'LLM response is required' });
      return;
    }

    logger.info(`[KnowledgeBase] Creating and badging KB prompt for app: ${applicationId}`);

    const db = mongoose.connection;
    const kbConfigCollection = db.collection('knowledgebaseconfigs');
    
    // Get the KB config for this app
    const kbConfig = await kbConfigCollection.findOne({ applicationId });
    
    if (!kbConfig) {
      res.status(400).json({ error: 'No KB configuration found for this application' });
      return;
    }

    // Create the KB prompt with all fields
    const kbPromptData = {
      applicationId,
      ragSessionId: ragSessionId || `transient-${Date.now()}`,
      userQuery,
      llmGeneratedResponse,
      contextRetrieved: (contextRetrieved || []).map((ctx: any) => ({
        source: ctx.source || ctx.documentId || 'Unknown',
        content: ctx.content || '',
        relevanceScore: ctx.relevanceScore || 0,
      })),
      embeddingModelUsed: embeddingModelUsed || 'text-embedding-3-large',
      kbLlmConfigUsed: kbConfig._id,
      isActive: true,
      badgeStatus: 'approved',
      badgedAt: new Date(),
      badgedBy,
      badgeNotes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const kbPromptCollection = db.collection('kbprompts');
    const result = await kbPromptCollection.insertOne(kbPromptData);

    if (!result.insertedId) {
      throw new Error('Failed to create KB prompt');
    }

    const savedPrompt = await kbPromptCollection.findOne({ _id: result.insertedId });

    logger.info(`[KnowledgeBase] Successfully created and badged prompt: ${result.insertedId}`);

    res.json({
      success: true,
      data: savedPrompt,
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to create and badge prompt:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create and badge prompt',
    });
  }
});

/**
 * Badge a KB prompt as approved or rejected
 * PATCH /api/knowledge-base/prompts/:applicationId/:promptId/badge
 */
knowledgeBaseRouter.patch('/prompts/:applicationId/:promptId/badge', async (req: Request, res: Response): Promise<void> => {
  try {
    const applicationId = asString(req.params.applicationId);
    const promptId = asString(req.params.promptId);
    const { status, badgedBy, notes } = req.body as { status: string; badgedBy: string; notes?: string };

    if (!applicationId?.trim()) {
      res.status(400).json({ error: 'Application ID is required' });
      return;
    }
    if (!promptId?.trim()) {
      res.status(400).json({ error: 'Prompt ID is required' });
      return;
    }
    if (!status || !['approved', 'rejected'].includes(status)) {
      res.status(400).json({ error: 'Status must be approved or rejected' });
      return;
    }
    if (!badgedBy?.trim()) {
      res.status(400).json({ error: 'Badged by user is required' });
      return;
    }

    logger.info(`[KnowledgeBase] Badging prompt ${promptId} as ${status}`);

    const updatedPrompt = await kbPromptService.badgeKBPrompt(
      promptId,
      status as 'approved' | 'rejected',
      badgedBy,
      notes
    );

    res.json({
      success: true,
      data: updatedPrompt,
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Failed to badge prompt:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to badge prompt',
    });
  }
});

export default knowledgeBaseRouter;
