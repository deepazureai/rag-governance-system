/**
 * Template Creator Service Types
 * Defines data models for templates, versions, and sharing
 */

export interface PromptTemplate {
  id: string;
  appId: string;
  name: string;
  description: string;
  originalPromptId?: string;
  promptText: string;
  expectedOutput?: string;
  tags: string[];
  category: string;
  
  // LLM Analysis & Recommendations
  analysis?: {
    rootCauses: Array<{
      metric: string;
      score: number;
      issue: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      expectedImprovement: number;
    }>;
  };
  
  // Metrics
  metrics?: {
    framework: string;
    scores: Record<string, number>;
    averageScore: number;
  };
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  usageCount: number;
  
  // Parent template for clones/forks
  forkedFrom?: string;
  isPublic: boolean;
  
  // Versioning
  version: number;
  versionHistory: Array<{
    version: number;
    changes: string;
    createdAt: Date;
    createdBy: string;
  }>;
}

export interface TemplateClone {
  sourceTemplateId: string;
  newTemplateId: string;
  clonedAt: Date;
  clonedBy: string;
}

export interface TemplateFork {
  sourceTemplateId: string;
  forkedTemplateId: string;
  forkedAt: Date;
  forkedBy: string;
  customizations: string[];
}

export interface TemplateShare {
  templateId: string;
  sharedBy: string;
  sharedWith: string[];
  shareToken: string;
  expiresAt?: Date;
  permissions: 'view' | 'clone' | 'edit';
  createdAt: Date;
}

export interface TemplateMetadata {
  totalTemplates: number;
  mostUsed: PromptTemplate[];
  recentlyCreated: PromptTemplate[];
  sharedWithMe: PromptTemplate[];
  clonedCount: number;
  forkedCount: number;
}

export interface TemplateDownload {
  format: 'json' | 'yaml' | 'csv';
  templateIds: string[];
  includeMetrics: boolean;
  includeAnalysis: boolean;
}

export interface TemplateSearchCriteria {
  appId?: string;
  search?: string;
  tags?: string[];
  category?: string;
  isPublic?: boolean;
  createdBy?: string;
  minScore?: number;
  sortBy?: 'created' | 'usage' | 'score' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
