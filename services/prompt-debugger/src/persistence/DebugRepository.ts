/**
 * MongoDB Persistence Layer for Debug Analysis
 * Stores and retrieves debug results with type safety
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { PromptDebugAnalysis } from '../types/index.js';

interface DebugDocument {
  _id?: string;
  promptId: string;
  appId: string;
  analysis: PromptDebugAnalysis;
  createdAt: Date;
  updatedAt: Date;
}

export class DebugRepository {
  private client: MongoClient;
  private db: Db | null = null;
  private collection: Collection<DebugDocument> | null = null;

  constructor(mongoUri: string) {
    if (!mongoUri?.trim()) {
      throw new Error('MongoDB URI is required');
    }
    this.client = new MongoClient(mongoUri);
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect();
      this.db = this.client.db('prompt-debugger');
      this.collection = this.db.collection<DebugDocument>('debug_analyses');

      // Create indexes
      if (this.collection) {
        await this.collection.createIndex({ promptId: 1, appId: 1 }, { unique: true });
        await this.collection.createIndex({ appId: 1, createdAt: -1 });
      }

      console.log('[v0] MongoDB connected');
    } catch (error) {
      console.error('[v0] MongoDB connection error:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('[v0] MongoDB disconnected');
    } catch (error) {
      console.error('[v0] MongoDB disconnect error:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  async saveDebugAnalysis(analysis: PromptDebugAnalysis): Promise<void> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    const now = new Date();
    const document: DebugDocument = {
      promptId: analysis.promptId,
      appId: analysis.appId,
      analysis,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await this.collection.updateOne(
        { promptId: analysis.promptId, appId: analysis.appId },
        { $set: document },
        { upsert: true },
      );

      console.log(`[v0] Saved debug analysis for prompt ${analysis.promptId}`);
    } catch (error) {
      console.error('[v0] Error saving debug analysis:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getDebugAnalysis(promptId: string, appId: string): Promise<PromptDebugAnalysis | null> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    try {
      const doc = await this.collection.findOne({ promptId, appId });
      return doc?.analysis ?? null;
    } catch (error) {
      console.error('[v0] Error fetching debug analysis:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  async getRecentAnalyses(appId: string, limit = 10): Promise<PromptDebugAnalysis[]> {
    if (!this.collection) {
      throw new Error('Database not connected');
    }

    try {
      const docs = await this.collection
        .find({ appId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();

      return docs.map((doc) => doc.analysis);
    } catch (error) {
      console.error('[v0] Error fetching recent analyses:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
}
