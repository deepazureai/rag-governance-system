import { PromptTemplate } from '@/src/types/index';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

class PromptTemplateClient {
  /**
   * Create a new prompt template
   */
  async createTemplate(applicationId: string, data: {
    templateName: string;
    description: string;
    promptTemplate: string;
    qualityGuidelines: string;
    category?: string;
    tags?: string[];
    baEmail: string;
    matchingPatterns?: string[];
    autoApply?: boolean;
  }): Promise<PromptTemplate> {
    const response = await fetch(`${API_URL}/api/prompt-templates/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        ...data,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create template');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Get all templates for an application
   */
  async getTemplates(
    applicationId: string,
    options?: {
      status?: 'draft' | 'published' | 'archived';
      category?: string;
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ templates: PromptTemplate[]; pagination: any }> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.category) params.append('category', options.category);
    if (options?.page) params.append('page', String(options.page));
    if (options?.pageSize) params.append('pageSize', String(options.pageSize));

    const response = await fetch(
      `${API_URL}/api/prompt-templates/${applicationId}?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch templates');
    }

    const result = await response.json();
    return {
      templates: result.data,
      pagination: result.pagination,
    };
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<PromptTemplate> {
    const response = await fetch(`${API_URL}/api/prompt-templates/detail/${templateId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch template');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Publish a template
   */
  async publishTemplate(templateId: string, baEmail: string): Promise<PromptTemplate> {
    const response = await fetch(`${API_URL}/api/prompt-templates/${templateId}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baEmail }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to publish template');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Archive a template
   */
  async archiveTemplate(templateId: string): Promise<PromptTemplate> {
    const response = await fetch(`${API_URL}/api/prompt-templates/${templateId}/archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to archive template');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Create a new version of a template
   */
  async createNewVersion(templateId: string, data: {
    promptTemplate: string;
    qualityGuidelines: string;
    description?: string;
    baEmail: string;
  }): Promise<PromptTemplate> {
    const response = await fetch(`${API_URL}/api/prompt-templates/${templateId}/new-version`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create new version');
    }

    const result = await response.json();
    return result.data;
  }

  /**
   * Export templates as JSON or CSV
   */
  async exportTemplates(
    applicationId: string,
    format: 'json' | 'csv' = 'json',
    status?: 'draft' | 'published' | 'archived'
  ): Promise<Blob> {
    const params = new URLSearchParams();
    params.append('format', format);
    if (status) params.append('status', status);

    const response = await fetch(
      `${API_URL}/api/prompt-templates/${applicationId}/export?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to export templates');
    }

    return await response.blob();
  }

  /**
   * Download exported templates (triggers browser download)
   */
  async downloadTemplates(
    applicationId: string,
    format: 'json' | 'csv' = 'json',
    status?: 'draft' | 'published' | 'archived'
  ): Promise<void> {
    const blob = await this.exportTemplates(applicationId, format, status);

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `templates_${applicationId}_${new Date().toISOString().split('T')[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<void> {
    const response = await fetch(`${API_URL}/api/prompt-templates/${templateId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete template');
    }
  }

  /**
   * Generate LLM-assisted combined prompt suggestion
   */
  async generateLLMSuggestion(
    applicationId: string,
    selectedPromptIds: string[],
    userContext?: string
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      suggestion: string;
      selectedPromptIds: string[];
      llmProvider: string;
      generatedAt: string;
    };
  }> {
    const response = await fetch(`${API_URL}/api/prompt-templates/assist/combine-prompts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        selectedPromptIds,
        userContext,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to generate LLM suggestion');
    }

    return result;
  }
}

export const promptTemplateClient = new PromptTemplateClient();
