import mongoose from 'mongoose';
import { KnowledgeBaseDocument, KnowledgeBaseDocumentInput } from '../types/models.js';
import { logger } from '../utils/logger.js';

/**
 * Knowledge Base Document Service
 * Handles CRUD operations for uploaded KB documents
 */
export class KnowledgeBaseDocumentService {
  private readonly collection = 'knowledgebasedocuments';

  /**
   * Create a new KB document record
   */
  async createDocument(input: KnowledgeBaseDocumentInput): Promise<KnowledgeBaseDocument> {
    try {
      logger.info(`[KBDocumentService] Creating document record for app: ${input.applicationId}, file: ${input.fileName}`);
      
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const doc = {
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(doc as any);
      
      logger.info(`[KBDocumentService] Document created with ID: ${result.insertedId}`);
      
      return {
        ...input,
        _id: result.insertedId,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[KBDocumentService] Failed to create document: ${message}`);
      throw error;
    }
  }

  /**
   * Update a KB document status
   */
  async updateDocumentStatus(
    documentId: string,
    status: 'processing' | 'success' | 'error',
    embeddingStatus: 'pending' | 'success' | 'error',
    totalChunks?: number,
    errorMessage?: string
  ): Promise<KnowledgeBaseDocument | null> {
    try {
      logger.info(`[KBDocumentService] Updating document ${documentId}: status=${status}, embeddingStatus=${embeddingStatus}`);
      
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const updateOp: any = {
        $set: {
          status,
          embeddingStatus,
          updatedAt: new Date(),
        }
      };

      if (totalChunks !== undefined) {
        updateOp.$set.totalChunks = totalChunks;
      }

      if (errorMessage) {
        updateOp.$set.errorMessage = errorMessage;
      }

      if (status === 'success') {
        updateOp.$set.processedAt = new Date();
      }

      const result = await collection.findOneAndUpdate(
        { documentId },
        updateOp,
        { returnDocument: 'after' }
      );

      return result?.value || result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[KBDocumentService] Failed to update document ${documentId}: ${message}`);
      throw error;
    }
  }

  /**
   * Get all documents for an application
   */
  async getDocumentsByApplication(applicationId: string, namespace?: string): Promise<KnowledgeBaseDocument[]> {
    try {
      const query: any = { applicationId };
      if (namespace) {
        query.namespace = namespace;
      }

      logger.info(`[KBDocumentService] Fetching documents for app: ${applicationId}, query:`, query);
      
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const documents = await collection
        .find(query)
        .sort({ uploadedAt: -1 })
        .toArray();

      logger.info(`[KBDocumentService] Found ${documents.length} documents for app ${applicationId}`);
      
      return documents as KnowledgeBaseDocument[];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[KBDocumentService] Failed to fetch documents: ${message}`);
      throw error;
    }
  }

  /**
   * Get a single document by documentId
   */
  async getDocument(documentId: string): Promise<KnowledgeBaseDocument | null> {
    try {
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const doc = await collection.findOne({ documentId });
      return doc as KnowledgeBaseDocument | null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[KBDocumentService] Failed to fetch document ${documentId}: ${message}`);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId: string): Promise<boolean> {
    try {
      logger.info(`[KBDocumentService] Deleting document: ${documentId}`);
      
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.deleteOne({ documentId });
      
      logger.info(`[KBDocumentService] Deleted ${result.deletedCount} document(s)`);
      return result.deletedCount > 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[KBDocumentService] Failed to delete document: ${message}`);
      throw error;
    }
  }

  /**
   * Delete all documents for an application
   */
  async deleteApplicationDocuments(applicationId: string): Promise<number> {
    try {
      logger.info(`[KBDocumentService] Deleting all documents for app: ${applicationId}`);
      
      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.deleteMany({ applicationId });
      
      logger.info(`[KBDocumentService] Deleted ${result.deletedCount} documents for app ${applicationId}`);
      return result.deletedCount;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`[KBDocumentService] Failed to delete application documents: ${message}`);
      throw error;
    }
  }
}

export const kbDocumentService = new KnowledgeBaseDocumentService();
