/**
 * Template Repository - MongoDB persistence layer
 * Handles all template CRUD operations, cloning, forking, and sharing
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import {
  PromptTemplate,
  TemplateClone,
  TemplateFork,
  TemplateShare,
  TemplateSearchCriteria,
} from '../types/index.js';

export class TemplateRepository {
  private client: MongoClient;
  private db: Db | null = null;
  private templatesCollection: Collection<PromptTemplate> | null = null;

  constructor(mongoUri: string) {
    this.client = new MongoClient(mongoUri);
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.db = this.client.db('prompt_evaluation');
    this.templatesCollection = this.db.collection<PromptTemplate>('templates');

    // Create indexes for better query performance
    await this.templatesCollection.createIndex({ appId: 1, createdAt: -1 });
    await this.templatesCollection.createIndex({ tags: 1 });
    await this.templatesCollection.createIndex({ category: 1 });
    await this.templatesCollection.createIndex({ createdBy: 1 });
    await this.templatesCollection.createIndex({ isPublic: 1 });
    await this.templatesCollection.createIndex({ usageCount: -1 });
  }

  async disconnect(): Promise<void> {
    await this.client.close();
  }

  async createTemplate(template: Omit<PromptTemplate, 'id'>): Promise<PromptTemplate> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const newTemplate: PromptTemplate = {
      id: uuidv4(),
      ...template,
      version: 1,
      versionHistory: [{
        version: 1,
        changes: 'Created',
        createdAt: new Date(),
        createdBy: template.createdBy,
      }],
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.templatesCollection.insertOne(newTemplate);
    return newTemplate;
  }

  async getTemplate(templateId: string): Promise<PromptTemplate | null> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const template = await this.templatesCollection.findOne({ id: templateId });
    if (template) {
      await this.templatesCollection.updateOne(
        { id: templateId },
        { $set: { lastUsedAt: new Date() }, $inc: { usageCount: 1 } }
      );
    }
    return template || null;
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<PromptTemplate>
  ): Promise<PromptTemplate | null> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const newVersion = ((await this.getTemplate(templateId))?.version || 0) + 1;

    const result = await this.templatesCollection.findOneAndUpdate(
      { id: templateId },
      {
        $set: {
          ...updates,
          version: newVersion,
          updatedAt: new Date(),
        },
        $push: {
          versionHistory: {
            version: newVersion,
            changes: updates.description || 'Updated',
            createdAt: new Date(),
            createdBy: updates.createdBy || 'system',
          },
        },
      },
      { returnDocument: 'after' }
    );

    return ((result as any)?.value as PromptTemplate) || null;
  }

  async cloneTemplate(sourceId: string, newName: string, appId: string, userId: string): Promise<PromptTemplate | null> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const source = await this.getTemplate(sourceId);
    if (!source) return null;

    const { _id, ...sourceWithoutId } = source as any;
    const clone = await this.createTemplate({
      ...sourceWithoutId,
      name: newName,
      appId,
      forkedFrom: sourceId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      version: 1,
      versionHistory: [],
    });

    return clone;
  }

  async forkTemplate(
    sourceId: string,
    newName: string,
    appId: string,
    userId: string,
    customizations: string[] = []
  ): Promise<PromptTemplate | null> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const source = await this.getTemplate(sourceId);
    if (!source) return null;

    const { _id: sourceId2, ...sourceWithoutId2 } = source as any;
    const fork = await this.createTemplate({
      ...sourceWithoutId2,
      name: newName,
      appId,
      forkedFrom: sourceId,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      usageCount: 0,
      version: 1,
      versionHistory: [],
      description: `${source.description}\n\nCustomizations: ${customizations.join(', ')}`,
    });

    return fork;
  }

  async searchTemplates(criteria: TemplateSearchCriteria): Promise<PromptTemplate[]> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const filter: Record<string, any> = {};

    if (criteria.appId) filter.appId = criteria.appId;
    if (criteria.isPublic !== undefined) filter.isPublic = criteria.isPublic;
    if (criteria.createdBy) filter.createdBy = criteria.createdBy;
    if (criteria.category) filter.category = criteria.category;
    if (criteria.tags?.length) filter.tags = { $in: criteria.tags };
    if (criteria.minScore !== undefined) {
      filter['metrics.averageScore'] = { $gte: criteria.minScore };
    }

    if (criteria.search) {
      filter.$text = { $search: criteria.search };
    }

    let query = this.templatesCollection.find(filter);

    // Sorting
    const sortBy = criteria.sortBy || 'created';
    const sortOrder = criteria.sortOrder === 'desc' ? -1 : 1;

    if (sortBy === 'created') query = query.sort({ createdAt: sortOrder } as any);
    else if (sortBy === 'usage') query = query.sort({ usageCount: -sortOrder } as any);
    else if (sortBy === 'score') query = query.sort({ 'metrics.averageScore': -sortOrder } as any);
    else if (sortBy === 'name') query = query.sort({ name: sortOrder } as any);

    // Pagination
    const limit = criteria.limit || 20;
    const offset = criteria.offset || 0;

    return query.skip(offset).limit(limit).toArray();
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const result = await this.templatesCollection.deleteOne({ id: templateId });
    return result.deletedCount > 0;
  }

  async getTemplatesByApp(appId: string, limit = 50): Promise<PromptTemplate[]> {
    if (!this.templatesCollection) throw new Error('Database not connected');

    return this.templatesCollection
      .find({ appId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async getMetadata(appId: string) {
    if (!this.templatesCollection) throw new Error('Database not connected');

    const totalTemplates = await this.templatesCollection.countDocuments({ appId });
    const mostUsed = await this.templatesCollection
      .find({ appId })
      .sort({ usageCount: -1 })
      .limit(5)
      .toArray();

    const recentlyCreated = await this.templatesCollection
      .find({ appId })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();

    const clonedCount = await this.templatesCollection.countDocuments({
      appId,
      forkedFrom: { $exists: true },
    });

    return {
      totalTemplates,
      mostUsed,
      recentlyCreated,
      clonedCount,
      forkedCount: clonedCount,
    };
  }
}
