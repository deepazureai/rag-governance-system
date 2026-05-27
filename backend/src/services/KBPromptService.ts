import mongoose, { Types } from 'mongoose';
import { KBPrompt, KBPromptInput, SaveKBPromptInput } from '../../src/types/models';
import { KBPromptSchema } from '../../src/schemas/index';

/**
 * KB Prompt Service
 * Manages saved knowledge base query outcomes
 */
export class KBPromptService {
  private readonly collection = 'kbprompts';

  /**
   * Save a KB prompt outcome to the registry
   */
  async saveKBPrompt(
    applicationId: string,
    ragSessionId: string,
    kbData: Omit<KBPromptInput, 'applicationId' | 'ragSessionId'>,
    input: SaveKBPromptInput
  ): Promise<KBPrompt> {
    try {
      const data: KBPromptInput = {
        applicationId,
        ragSessionId,
        ...kbData,
        rating: input.rating,
        userNotes: input.userNotes,
      };

      const validation = KBPromptSchema.safeParse(data);
      if (!validation.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.error.errors)}`);
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.insertOne({
        ...validation.data,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      if (!result.insertedId) {
        throw new Error('Failed to save KB prompt');
      }

      const saved = await collection.findOne({ _id: result.insertedId });
      return saved as KBPrompt;
    } catch (error: unknown) {
      throw this.handleError('saveKBPrompt', error);
    }
  }

  /**
   * Get KB prompt by ID
   */
  async getKBPrompt(id: string): Promise<KBPrompt | null> {
    try {
      if (!id?.trim()) {
        throw new Error('KB Prompt ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const prompt = await collection.findOne({ _id: objectId }) as KBPrompt | null;
      return prompt;
    } catch (error: unknown) {
      throw this.handleError('getKBPrompt', error);
    }
  }

  /**
   * List all saved KB prompts for an application
   */
  async listKBPrompts(
    applicationId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<{ prompts: KBPrompt[]; total: number }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const [prompts, total] = await Promise.all([
        collection
          .find({ applicationId, isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .toArray(),
        collection.countDocuments({ applicationId, isActive: true }),
      ]);

      return {
        prompts: prompts as KBPrompt[],
        total,
      };
    } catch (error: unknown) {
      throw this.handleError('listKBPrompts', error);
    }
  }

  /**
   * List KB prompts by RAG session
   */
  async listBySession(
    applicationId: string,
    ragSessionId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<{ prompts: KBPrompt[]; total: number }> {
    try {
      if (!applicationId?.trim() || !ragSessionId?.trim()) {
        throw new Error('Application ID and RAG session ID are required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const [prompts, total] = await Promise.all([
        collection
          .find({ applicationId, ragSessionId, isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .toArray(),
        collection.countDocuments({ applicationId, ragSessionId, isActive: true }),
      ]);

      return {
        prompts: prompts as KBPrompt[],
        total,
      };
    } catch (error: unknown) {
      throw this.handleError('listBySession', error);
    }
  }

  /**
   * Update KB prompt rating and notes
   */
  async updateKBPrompt(
    id: string,
    rating?: number,
    userNotes?: string
  ): Promise<KBPrompt> {
    try {
      if (!id?.trim()) {
        throw new Error('KB Prompt ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (rating !== undefined) updates.rating = rating;
      if (userNotes !== undefined) updates.userNotes = userNotes;

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: updates },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('KB Prompt not found');
      }

      return result.value as KBPrompt;
    } catch (error: unknown) {
      throw this.handleError('updateKBPrompt', error);
    }
  }

  /**
   * Delete KB prompt (soft delete - mark as inactive)
   */
  async deleteKBPrompt(id: string): Promise<void> {
    try {
      if (!id?.trim()) {
        throw new Error('KB Prompt ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const result = await collection.updateOne(
        { _id: objectId },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        throw new Error('KB Prompt not found');
      }
    } catch (error: unknown) {
      throw this.handleError('deleteKBPrompt', error);
    }
  }

  /**
   * Get quality statistics for KB prompts
   */
  async getQualityStats(applicationId: string): Promise<{
    totalCount: number;
    averageRating: number;
    averageRelevanceScore: number;
    topContextSources: string[];
  }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const prompts = (await collection
        .find({ applicationId, isActive: true })
        .toArray()) as unknown as KBPrompt[];

      const totalCount = prompts.length;
      const ratedPrompts = prompts.filter(p => p.rating !== undefined);
      const averageRating =
        ratedPrompts.length > 0
          ? ratedPrompts.reduce((sum, p) => sum + (p.rating ?? 0), 0) / ratedPrompts.length
          : 0;

      const allRelevanceScores: number[] = [];
      const sourceCounts = new Map<string, number>();

      prompts.forEach(prompt => {
        prompt.contextRetrieved.forEach(ctx => {
          allRelevanceScores.push(ctx.relevanceScore);
          sourceCounts.set(ctx.source, (sourceCounts.get(ctx.source) ?? 0) + 1);
        });
      });

      const averageRelevanceScore =
        allRelevanceScores.length > 0
          ? allRelevanceScores.reduce((a, b) => a + b, 0) / allRelevanceScores.length
          : 0;

      const topContextSources = Array.from(sourceCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([source]) => source);

      return {
        totalCount,
        averageRating,
        averageRelevanceScore,
        topContextSources,
      };
    } catch (error: unknown) {
      throw this.handleError('getQualityStats', error);
    }
  }

  /**
   * Handle errors with proper logging
   */
  private handleError(method: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[KBPromptService.${method}] Error: ${message}`);
    return new Error(`KB Prompt Service Error in ${method}: ${message}`);
  }
}

export const kbPromptService = new KBPromptService();
