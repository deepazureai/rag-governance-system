import mongoose, { Types } from 'mongoose';
import { PromptTemplate, PromptTemplateInput } from '../../src/types/models';
import { PromptTemplateSchema } from '../../src/schemas/index';

/**
 * Prompt Template Service
 * Manages creation, versioning, and sharing of prompt templates
 */
export class PromptTemplateService {
  private readonly collection = 'prompttemplates';

  /**
   * Create a new prompt template
   */
  async createTemplate(input: PromptTemplateInput): Promise<PromptTemplate> {
    try {
      const validation = PromptTemplateSchema.safeParse(input);
      if (!validation.success) {
        throw new Error(`Validation failed: ${JSON.stringify(validation.error.errors)}`);
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const result = await collection.insertOne({
        ...validation.data,
        version: 1,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
        usageMetrics: { totalUsageCount: 0 },
      });

      if (!result.insertedId) {
        throw new Error('Failed to create template');
      }

      const created = await collection.findOne({ _id: result.insertedId });
      return created as PromptTemplate;
    } catch (error: unknown) {
      throw this.handleError('createTemplate', error);
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(id: string): Promise<PromptTemplate | null> {
    try {
      if (!id?.trim()) {
        throw new Error('Template ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const template = await collection.findOne({ _id: objectId }) as PromptTemplate | null;
      return template;
    } catch (error: unknown) {
      throw this.handleError('getTemplate', error);
    }
  }

  /**
   * List all templates for an application
   */
  async listTemplates(
    applicationId: string,
    filters?: { status?: string; tags?: string[]; isPublic?: boolean },
    limit: number = 50,
    skip: number = 0
  ): Promise<{ templates: PromptTemplate[]; total: number }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const query: Record<string, unknown> = { applicationId };
      if (filters?.status) query.status = filters.status;
      if (filters?.isPublic !== undefined) query.isPublic = filters.isPublic;
      if (filters?.tags && filters.tags.length > 0) {
        query.tags = { $in: filters.tags };
      }

      const [templates, total] = await Promise.all([
        collection
          .find(query)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .toArray(),
        collection.countDocuments(query),
      ]);

      return {
        templates: templates as PromptTemplate[],
        total,
      };
    } catch (error: unknown) {
      throw this.handleError('listTemplates', error);
    }
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate> {
    try {
      if (!id?.trim()) {
        throw new Error('Template ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('Template not found');
      }

      return result.value as PromptTemplate;
    } catch (error: unknown) {
      throw this.handleError('updateTemplate', error);
    }
  }

  /**
   * Update template status (draft → published → archived)
   */
  async publishTemplate(id: string, publishedBy: string): Promise<PromptTemplate> {
    try {
      if (!id?.trim() || !publishedBy?.trim()) {
        throw new Error('Template ID and published by user ID are required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        {
          $set: {
            status: 'published',
            publishedAt: new Date(),
            publishedBy,
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('Template not found');
      }

      return result.value as PromptTemplate;
    } catch (error: unknown) {
      throw this.handleError('publishTemplate', error);
    }
  }

  /**
   * Archive template
   */
  async archiveTemplate(id: string): Promise<PromptTemplate> {
    try {
      if (!id?.trim()) {
        throw new Error('Template ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        {
          $set: {
            status: 'archived',
            archivedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { returnDocument: 'after' }
      );

      if (!result || !result.value) {
        throw new Error('Template not found');
      }

      return result.value as PromptTemplate;
    } catch (error: unknown) {
      throw this.handleError('archiveTemplate', error);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      if (!id?.trim()) {
        throw new Error('Template ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const result = await collection.deleteOne({ _id: objectId });

      if (result.deletedCount === 0) {
        throw new Error('Template not found');
      }
    } catch (error: unknown) {
      throw this.handleError('deleteTemplate', error);
    }
  }

  /**
   * Increment usage count for a template
   */
  async recordUsage(id: string, qualityScore?: number, satisfaction?: number): Promise<void> {
    try {
      if (!id?.trim()) {
        throw new Error('Template ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);
      const objectId = new Types.ObjectId(id);

      const updates: Record<string, unknown> = {
        'usageMetrics.totalUsageCount': { $inc: 1 },
        'usageMetrics.lastUsedAt': new Date(),
        updatedAt: new Date(),
      };

      if (qualityScore !== undefined) {
        updates['usageMetrics.averageQualityScore'] = qualityScore;
      }

      if (satisfaction !== undefined) {
        updates['usageMetrics.averageUserSatisfaction'] = satisfaction;
      }

      await collection.updateOne({ _id: objectId }, { $set: updates });
    } catch (error: unknown) {
      throw this.handleError('recordUsage', error);
    }
  }

  /**
   * Get templates by source (recommendations or KB prompts)
   */
  async getTemplatesBySource(
    applicationId: string,
    sourceId: string,
    sourceType: 'recommendation' | 'kb-prompt'
  ): Promise<PromptTemplate[]> {
    try {
      if (!applicationId?.trim() || !sourceId?.trim()) {
        throw new Error('Application ID and source ID are required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const query =
        sourceType === 'recommendation'
          ? { applicationId, sourceRecommendationIds: new Types.ObjectId(sourceId) }
          : { applicationId, sourceKBPromptIds: new Types.ObjectId(sourceId) };

      const templates = await collection.find(query).toArray();
      return templates as PromptTemplate[];
    } catch (error: unknown) {
      throw this.handleError('getTemplatesBySource', error);
    }
  }

  /**
   * Get template usage statistics
   */
  async getUsageStats(applicationId: string): Promise<{
    totalTemplates: number;
    publishedCount: number;
    draftCount: number;
    totalUsages: number;
    mostUsedTemplate?: { id: string; name: string; usageCount: number };
  }> {
    try {
      if (!applicationId?.trim()) {
        throw new Error('Application ID is required');
      }

      const db = mongoose.connection;
      const collection = db.collection(this.collection);

      const templates = (await collection
        .find({ applicationId })
        .toArray()) as unknown as PromptTemplate[];

      const totalTemplates = templates.length;
      const publishedCount = templates.filter(t => t.status === 'published').length;
      const draftCount = templates.filter(t => t.status === 'draft').length;

      const totalUsages = templates.reduce((sum, t) => sum + (t.usageMetrics?.totalUsageCount ?? 0), 0);

      let mostUsedTemplate: { id: string; name: string; usageCount: number } | undefined;
      if (templates.length > 0) {
        const sorted = templates.sort((a, b) => (b.usageMetrics?.totalUsageCount ?? 0) - (a.usageMetrics?.totalUsageCount ?? 0));
        if (sorted[0]._id) {
          mostUsedTemplate = {
            id: sorted[0]._id.toString(),
            name: sorted[0].name,
            usageCount: sorted[0].usageMetrics?.totalUsageCount ?? 0,
          };
        }
      }

      return {
        totalTemplates,
        publishedCount,
        draftCount,
        totalUsages,
        mostUsedTemplate,
      };
    } catch (error: unknown) {
      throw this.handleError('getUsageStats', error);
    }
  }

  /**
   * Handle errors with proper logging
   */
  private handleError(method: string, error: unknown): Error {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PromptTemplateService.${method}] Error: ${message}`);
    return new Error(`Prompt Template Service Error in ${method}: ${message}`);
  }
}

export const promptTemplateService = new PromptTemplateService();
