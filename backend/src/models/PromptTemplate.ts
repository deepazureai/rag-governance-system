import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Template Source Reference
 */
export interface TemplateSource {
  sourceId: Types.ObjectId;
  sourceType: 'recommendation' | 'kb-prompt';
  title: string;
  snippet: string;
}

/**
 * Usage metrics for template tracking
 */
export interface IPromptTemplateUsageMetrics {
  totalUsageCount: number;
  lastUsedAt?: Date;
  averageQualityScore?: number;
  averageUserSatisfaction?: number;
  successRate?: number;
}

/**
 * Prompt Template Document
 * Combines learnings from recommendations and KB queries to create reusable templates
 * Can be refined by LLM and shared across users
 */
export interface IPromptTemplate extends Document {
  applicationId: string;
  
  // Template content
  name: string;
  description?: string;
  templateText: string;  // The reusable prompt pattern
  usageGuide?: string;   // Guidelines for using this template
  
  // Source tracking - linking to recommendations and KB outcomes
  sourceRecommendationIds: readonly Types.ObjectId[];
  sourceKBPromptIds: readonly Types.ObjectId[];
  sources: readonly TemplateSource[];  // Denormalized source info
  
  // LLM refinement tracking
  llmConfigUsedForRefinement: Types.ObjectId;  // Reference to LLMConfig
  rawUserInput?: string;    // Template before LLM refinement
  llmRefinedOutput?: string; // Template after LLM refinement
  
  // Template metadata
  category?: string;
  tags: readonly string[];
  
  // Versioning
  version: number;
  isPublic: boolean;  // Can be shared with other users
  
  // Quality metrics
  expectedQualityScore?: number;
  expectedUserSatisfaction?: number;
  usageMetrics: IPromptTemplateUsageMetrics;
  
  // Status
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  publishedBy?: string;
  archivedAt?: Date;
  
  // Creator
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const UsageMetricsSchema = new Schema<IPromptTemplateUsageMetrics>(
  {
    totalUsageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    averageQualityScore: { type: Number },
    averageUserSatisfaction: { type: Number },
    successRate: { type: Number },
  }
);

export const PromptTemplateSchema = new Schema<IPromptTemplate>(
  {
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: { type: String },
    templateText: {
      type: String,
      required: true,
    },
    usageGuide: { type: String },
    
    // Source tracking
    sourceRecommendationIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'RecommendationPrompt',
      },
    ],
    sourceKBPromptIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'KBPrompt',
      },
    ],
    sources: [
      {
        sourceId: {
          type: Schema.Types.ObjectId,
        },
        sourceType: {
          type: String,
          enum: ['recommendation', 'kb-prompt'],
        },
        title: { type: String },
        snippet: { type: String },
      },
    ],
    
    // LLM refinement
    llmConfigUsedForRefinement: {
      type: Schema.Types.ObjectId,
      ref: 'LLMConfig',
      required: true,
    },
    rawUserInput: { type: String },
    llmRefinedOutput: { type: String },
    
    // Metadata
    category: { type: String },
    tags: [{ type: String }],
    
    // Versioning
    version: {
      type: Number,
      default: 1,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    
    // Quality metrics
    expectedQualityScore: { type: Number },
    expectedUserSatisfaction: { type: Number },
    usageMetrics: {
      type: UsageMetricsSchema,
      default: () => ({ totalUsageCount: 0 }),
    },
    
    // Status
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    publishedAt: { type: Date },
    publishedBy: { type: String },
    archivedAt: { type: Date },
    
    // Creator
    createdBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Indexes for efficient querying
PromptTemplateSchema.index({ applicationId: 1, status: 1 });
PromptTemplateSchema.index({ applicationId: 1, tags: 1 });
PromptTemplateSchema.index({ applicationId: 1, 'usageMetrics.lastUsedAt': -1 });
PromptTemplateSchema.index({ applicationId: 1, isPublic: 1 });

export const PromptTemplate = mongoose.model<IPromptTemplate>(
  'PromptTemplate',
  PromptTemplateSchema
);
