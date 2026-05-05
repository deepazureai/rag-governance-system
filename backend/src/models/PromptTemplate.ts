import mongoose, { Schema, Document } from 'mongoose';

export interface IPromptTemplateVersion {
  version: number;
  promptTemplate: string;
  qualityGuidelines: string;
  createdBy: string;
  createdAt: Date;
  description?: string;
}

export interface IPromptTemplateUsageMetrics {
  totalUsageCount: number;
  lastUsedAt: Date;
  averageQualityScore?: number;
  averageUserSatisfaction?: number;
  successRate?: number;
}

export interface IPromptTemplate extends Document {
  applicationId: string;
  templateName: string;
  description: string;
  
  // Template content
  promptTemplate: string;  // The reusable prompt pattern with placeholders {}, {context}, etc.
  qualityGuidelines: string;  // BA guidelines for this template
  
  // Metadata
  category?: string;  // e.g., 'customer-support', 'technical-docs', 'product-info'
  tags?: string[];  // For easier filtering and organization
  
  // Scope
  matchingPatterns?: string[];  // Regex or keyword patterns to auto-apply this template
  autoApply: boolean;  // Auto-apply to matching user queries
  autoApplyThreshold?: number;  // Similarity threshold (0-1)
  
  // Quality metrics
  expectedQualityScore?: number;  // Expected average score for this template
  expectedUserSatisfaction?: number;  // Expected thumbs-up rate
  
  // Version history
  versions: IPromptTemplateVersion[];
  currentVersion: number;
  
  // Status
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  publishedBy?: string;
  archivedAt?: Date;
  
  // Usage metrics
  usageMetrics: IPromptTemplateUsageMetrics;
  
  // Creator
  createdBy: string;  // BA name/email
  createdAt: Date;
  updatedAt: Date;
}

const PromptTemplateVersionSchema = new Schema<IPromptTemplateVersion>(
  {
    version: { type: Number, required: true },
    promptTemplate: { type: String, required: true },
    qualityGuidelines: { type: String, required: true },
    createdBy: { type: String, required: true },
    description: { type: String },
    createdAt: { type: Date, default: Date.now },
  }
);

const UsageMetricsSchema = new Schema<IPromptTemplateUsageMetrics>(
  {
    totalUsageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    averageQualityScore: { type: Number },
    averageUserSatisfaction: { type: Number },
    successRate: { type: Number },
  }
);

const PromptTemplateSchema = new Schema<IPromptTemplate>(
  {
    applicationId: { type: String, required: true, index: true },
    templateName: { type: String, required: true },
    description: { type: String, required: true },
    
    promptTemplate: { type: String, required: true },
    qualityGuidelines: { type: String, required: true },
    
    category: { type: String },
    tags: [{ type: String }],
    
    matchingPatterns: [{ type: String }],
    autoApply: { type: Boolean, default: false },
    autoApplyThreshold: { type: Number, min: 0, max: 1 },
    
    expectedQualityScore: { type: Number },
    expectedUserSatisfaction: { type: Number },
    
    versions: [PromptTemplateVersionSchema],
    currentVersion: { type: Number, default: 1 },
    
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
    publishedAt: { type: Date },
    publishedBy: { type: String },
    archivedAt: { type: Date },
    
    usageMetrics: {
      type: UsageMetricsSchema,
      default: () => ({ totalUsageCount: 0 }),
    },
    
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

// Indexes for efficient querying
PromptTemplateSchema.index({ applicationId: 1, status: 1 });
PromptTemplateSchema.index({ applicationId: 1, tags: 1 });
PromptTemplateSchema.index({ applicationId: 1, 'usageMetrics.lastUsedAt': -1 });

export const PromptTemplate = mongoose.model<IPromptTemplate>('PromptTemplate', PromptTemplateSchema);
