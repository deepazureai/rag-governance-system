import { Router, Request, Response, NextFunction } from 'express';
import multer, { Multer, StorageEngine } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { VectorStoreService, getVectorStore } from '../services/VectorStoreService.js';
import { DocumentProcessorService } from '../services/DocumentProcessorService.js';
import { logger } from '../utils/logger.js';

const router = Router();

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
    destination: (
      _req: Express.Request,
      _file: Express.Multer.File,
      cb: (error: Error | null, destination?: string) => void
    ): void => {
      cb(null, uploadDir);
    },
    filename: (
      _req: Express.Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename?: string) => void
    ): void => {
      const uniqueName = `${Date.now()}-${file.originalname}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (
    _req: Express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, acceptFile?: boolean) => void
  ): void => {
    const allowedTypes = ['.pdf', '.txt', '.json', '.csv'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${fileExt}`));
    }
  },
});

/**
 * Upload and vectorize documents
 * POST /api/knowledge-base/upload
 */
router.post('/upload', upload.array('files', 10), async (req: UploadRequest, res: Response): Promise<void> => {
  try {
    const files = req.files ?? [];
    const body = req.body as UploadBody;
    const { applicationId, namespace } = body;

    if (files.length === 0) {
      res.status(400).json({ error: 'No files provided' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`);
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
        const ids = await vectorStore.addDocuments(documentChunks, namespace);

        logger.info(`[KnowledgeBase] Successfully vectorized ${file.originalname} (${ids.length} chunks)`);

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

    res.json({
      uploadedAt: new Date().toISOString(),
      applicationId,
      namespace: namespace ?? 'default',
      results,
      totalChunksCreated: results.reduce((sum, r) => sum + (r.chunksCreated ?? 0), 0),
    });
  } catch (error) {
    logger.error('[KnowledgeBase] Upload failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Upload failed' });
  }
});

/**
 * Search knowledge base
 * POST /api/knowledge-base/search
 */
router.post('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as SearchBody;
    const { applicationId, query, namespace } = body;
    const k = body.k ?? 5;
    const filters = body.filters;

    if (!query || !applicationId) {
      res.status(400).json({ error: 'Missing query or applicationId' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`);

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
router.post('/validate-response', async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as ValidateResponseBody;
    const { applicationId, userPrompt, llmResponse } = body;
    const topK = body.topK ?? 3;

    if (!applicationId || !userPrompt || !llmResponse) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`);

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
router.get('/stats/:applicationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    
    if (!applicationId) {
      res.status(400).json({ error: 'Missing applicationId' });
      return;
    }

    const vectorStore = await getVectorStore(`app-${applicationId}`);
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

export const knowledgeBaseRouter = router;
