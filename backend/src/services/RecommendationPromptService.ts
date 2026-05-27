import mongoose, { Types } from 'mongoose';
import { RecommendationPrompt, RecommendationPromptInput, SaveRecommendationInput } from '../../src/types/models';
import { RecommendationPromptSchema } from '../../src/schemas/index';

/**
 * Recommendation Prompt Service
 * Manages saved recommendations from raw data analysis
 */
export class RecommendationPromptService {
  private readonly collection = 'recommendationprompts';

  /**
   * Save a recommendation to the registry
   */
  async saveRecommendation(
    applicationId: string,
    recordId: string,
    recommendation: Omit<RecommendationPromptInput, 'applicationId' | 'recordId'>,
    input: SaveRecommendationInput
  ): Promise<RecommendationPrompt> {
    try {
      const data: RecommendationPromptInput = {
        applicationId,
        recordId,
        ...recommendation,
        rating: input.rating,
        userNotes: input.userNotes,
      };

      const validation = RecommendationPromptSchema.safeParse(data);
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
        throw new Error('Failed to save recommendation');
      }

      const saved = await collection.findOne({ _id: result.insertedId });
      return saved as RecommendationPrompt;
    } catch (error: unknown) {
      throw this.handleError('saveRecommendation', error);
    }
  }

  /**
   * Get recommendation by ID
   */
  async getRecommendation(id: string): Promise<RecommendationPrompt | null> {
    try {
      if (!id?.trim()) {
        throw new Error('Recommendation ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const rec = await collection.findOne({ _id: objectId }) as RecommendationPrompt | null;
      return rec;
    } catch (error: unknown) {
      throw this.handleError('getRecommendation', error);
    }
  }

  /**
   * List all saved recommendations for an application
   */
  async listRecommendations(
    applicationId: string,
    limit: number = 50,
    skip: number = 0
  ): Promise<{ recommendations: RecommendationPrompt[]; total: number }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const [recommendations, total] = await Promise.all([
        collection
          .find({ applicationId, isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .toArray(),
        collection.countDocuments({ applicationId, isActive: true }),
      ]);

      return {
        recommendations: recommendations as RecommendationPrompt[],
        total,
      };
    } catch (error: unknown) {
      throw this.handleError('listRecommendations', error);
    }
  }

  /**
   * Update recommendation rating and notes
   */
  async updateRecommendation(
    id: string,
    rating?: number,
    userNotes?: string
  ): Promise<RecommendationPrompt> {
    try {
      if (!id?.trim()) {
        throw new Error('Recommendation ID is required');
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
        throw new Error('Recommendation not found');
      }

      return result.value as RecommendationPrompt;
    } catch (error: unknown) {
      throw this.handleError('updateRecommendation', error);
    }
  }

  /**
   * Delete recommendation (soft delete - mark as inactive)
   */
  async deleteRecommendation(id: string): Promise<void> {
    try {
      if (!id?.trim()) {
        throw new Error('Recommendation ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const result = await collection.updateOne(
        { _id: objectId },
        { $set: { isActive: false, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        throw new Error('Recommendation not found');
      }
    } catch (error: unknown) {
      throw this.handleError('deleteRecommendation', error);
    }
  }

  /**
   * Get statistics for application recommendations
   */
  async getStats(applicationId: string): Promise<{
    totalCount: number;
    averageRating: number;
    topSuggestions: string[];
  }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const recommendations = (await collection
        .find({ applicationId, isActive: true })
        .toArray()) as unknown as RecommendationPrompt[];

      const totalCount = recommendations.length;
      const ratedRecommendations = recommendations.filter(r => r.rating !== undefined);
      const averageRating =
        ratedRecommendations.length > 0
          ? ratedRecommendations.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratedRecommendations.length
          : 0;

      const allSuggestions: string[] = [];
      recommendations.forEach(rec => {
        rec.suggestions.forEach(sugg => {
          allSuggestions.push(sugg.suggestion);
        });
      });

      const suggestionCounts = new Map<string, number>();
      allSuggestions.forEach(s => {
        suggestionCounts.set(s, (suggestionCounts.get(s) ?? 0) + 1);
      });

      const topSuggestions = Array.from(suggestionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([s]) => s);

      return {
        totalCount,
        averageRating,
        topSuggestions,
      };
    } catch (error: unknown) {
      throw this.handleError('getStats', error);
    }
  }

  /**
   * Handle errors with proper logging
   */
  private handleError(method: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[RecommendationPromptService.${method}] Error: ${message}`);
    return new Error(`Recommendation Service Error in ${method}: ${message}`);
  }
}

export const recommendationPromptService = new RecommendationPromptService();
