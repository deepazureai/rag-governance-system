/**
 * Template Service - Core business logic
 * Handles template operations, validation, and export functionality
 */

import { v4 as uuidv4 } from 'uuid';
import { PromptTemplate, TemplateDownload } from '../types/index.js';
import { TemplateRepository } from '../persistence/TemplateRepository.js';

export class TemplateService {
  constructor(private repository: TemplateRepository) {}

  async createTemplate(
    appId: string,
    name: string,
    promptText: string,
    userId: string,
    metadata?: Partial<PromptTemplate>
  ): Promise<PromptTemplate> {
    const now = new Date();
    const template = await this.repository.createTemplate({
      appId,
      name,
      promptText,
      createdBy: userId,
      description: metadata?.description || '',
      tags: metadata?.tags || [],
      category: metadata?.category || 'general',
      isPublic: metadata?.isPublic || false,
      expectedOutput: metadata?.expectedOutput,
      analysis: metadata?.analysis,
      metrics: metadata?.metrics,
      createdAt: now,
      updatedAt: now,
      usageCount: 0,
      version: 1,
      versionHistory: [],
    });

    return template;
  }

  async cloneTemplate(
    sourceTemplateId: string,
    newName: string,
    appId: string,
    userId: string
  ): Promise<PromptTemplate | null> {
    return this.repository.cloneTemplate(sourceTemplateId, newName, appId, userId);
  }

  async forkTemplate(
    sourceTemplateId: string,
    newName: string,
    appId: string,
    userId: string,
    customizations: string[] = []
  ): Promise<PromptTemplate | null> {
    return this.repository.forkTemplate(
      sourceTemplateId,
      newName,
      appId,
      userId,
      customizations
    );
  }

  async getTemplate(templateId: string): Promise<PromptTemplate | null> {
    return this.repository.getTemplate(templateId);
  }

  async updateTemplate(
    templateId: string,
    updates: Partial<PromptTemplate>,
    userId: string
  ): Promise<PromptTemplate | null> {
    return this.repository.updateTemplate(templateId, {
      ...updates,
      updatedAt: new Date(),
      createdBy: userId,
    });
  }

  async deleteTemplate(templateId: string): Promise<boolean> {
    return this.repository.deleteTemplate(templateId);
  }

  async searchTemplates(criteria: any): Promise<PromptTemplate[]> {
    return this.repository.searchTemplates(criteria);
  }

  async getAppTemplates(appId: string): Promise<PromptTemplate[]> {
    return this.repository.getTemplatesByApp(appId);
  }

  async exportTemplates(templates: PromptTemplate[], format: 'json' | 'yaml' | 'csv'): Promise<string> {
    if (format === 'json') {
      return JSON.stringify(templates, null, 2);
    }

    if (format === 'yaml') {
      return this.toYaml(templates);
    }

    if (format === 'csv') {
      return this.toCsv(templates);
    }

    throw new Error(`Unsupported export format: ${format}`);
  }

  private toYaml(templates: PromptTemplate[]): string {
    return templates
      .map((t) => {
        return `- id: ${t.id}
  name: ${t.name}
  description: ${t.description}
  promptText: |
    ${t.promptText.split('\n').join('\n    ')}
  tags: [${t.tags.join(', ')}]
  category: ${t.category}
  isPublic: ${t.isPublic}
  createdBy: ${t.createdBy}
  createdAt: ${t.createdAt}`;
      })
      .join('\n---\n');
  }

  private toCsv(templates: PromptTemplate[]): string {
    const headers = ['ID', 'Name', 'Category', 'Tags', 'Creator', 'CreatedAt', 'Score'];
    const rows = templates.map((t) => [
      t.id,
      t.name,
      t.category,
      t.tags.join(';'),
      t.createdBy,
      t.createdAt.toISOString(),
      t.metrics?.averageScore?.toFixed(1) || 'N/A',
    ]);

    return [
      headers.join(','),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(',')),
    ].join('\n');
  }

  async downloadTemplates(templateIds: string[], format: 'json' | 'yaml' | 'csv'): Promise<string> {
    const templates = await Promise.all(
      templateIds.map((id) => this.getTemplate(id))
    );

    const validTemplates = templates.filter((t): t is PromptTemplate => t !== null);

    if (validTemplates.length === 0) {
      throw new Error('No valid templates found');
    }

    return this.exportTemplates(validTemplates, format);
  }

  async generateShareToken(templateId: string, expiresIn?: number): Promise<string> {
    const token = uuidv4();
    // In production, store token in database with expiration
    return token;
  }

  async getMetrics(appId: string) {
    return this.repository.getMetadata(appId);
  }
}
