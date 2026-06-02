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
 * CrewAI Template Structure
 */
export interface ICrewAITemplate {
  actor: string;              // Role/persona (e.g., "QA Analyst", "Data Quality Engineer")
  objective: string;          // High-level goal
  task: string;              // Detailed task description
  context: string;           // Background/constraints/system context
  expectedOutput: string;    // Success criteria and output format
  crewAIVersion?: string;    // Target CrewAI version
  toolsRequired?: readonly string[];  // Tools/integrations needed
}

/**
 * Role-based Distribution Target
 */
export interface IDistributionTarget {
  type: 'role' | 'group' | 'individual';
  roleId?: string;           // 'analyst', 'qa_tester', 'business_user', 'ba', 'admin'
  groupId?: string;          // Team/department ID
  userId?: string;           // Individual user ID
  canEdit: boolean;          // Can user modify template
  canShare: boolean;         // Can user share/distribute template
  notifyOnUpdate: boolean;   // Notify on template updates
  distributedAt: Date;
}

/**
 * LLM Synthesis Metadata
 */
export interface ISynthesisMetadata {
  synthesisRequestId: string;
  inputPromptCount: number;
  synthesisMetrics: {
    faithfulness: number;
    answer_relevancy: number;
    context_precision: number;
    context_recall: number;
    correctness: number;
    overall_score: number;
  };
  synthesisNotes?: string;
  synthesizedAt: Date;
  synthesizedBy: string;
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
 * Supports CrewAI format with role-based distribution
 */
export interface IPromptTemplate extends Document {
  applicationId: string;
  
  // Template content
  name: string;
  description?: string;
  templateText: string;  // The reusable prompt pattern
  usageGuide?: string;   // Guidelines for using this template
  
  // CrewAI Structure
  crewAITemplate: ICrewAITemplate;
  
  // Source tracking - linking to recommendations and KB outcomes
  sourceRecommendationIds: readonly Types.ObjectId[];
  sourceKBPromptIds: readonly Types.ObjectId[];
  sources: readonly TemplateSource[];  // Denormalized source info
  
  // LLM refinement and synthesis tracking
  llmConfigUsedForRefinement?: Types.ObjectId;  // Reference to LLMConfig (optional)
  rawUserInput?: string;    // Template before LLM refinement
  llmRefinedOutput?: string; // Template after LLM refinement
  synthesisMetadata?: ISynthesisMetadata;  // Synthesis details when created via LLM
  
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
  
  // Role-based Distribution
  distributionTargets: readonly IDistributionTarget[];
  
  // Status
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  publishedBy?: string;
  archivedAt?: Date;
  
  // Creator and Audit
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

const CrewAITemplateSchema = new Schema<ICrewAITemplate>(
  {
    actor: { type: String, required: true },
    objective: { type: String, required: true },
    task: { type: String, required: true },
    context: { type: String, required: true },
    expectedOutput: { type: String, required: true },
    crewAIVersion: { type: String },
    toolsRequired: [{ type: String }],
  },
  { _id: false }
);

const SynthesisMetadataSchema = new Schema<ISynthesisMetadata>(
  {
    synthesisRequestId: { type: String, required: true },
    inputPromptCount: { type: Number, required: true },
    synthesisMetrics: {
      faithfulness: { type: Number, required: true },
      answer_relevancy: { type: Number, required: true },
      context_precision: { type: Number, required: true },
      context_recall: { type: Number, required: true },
      correctness: { type: Number, required: true },
      overall_score: { type: Number, required: true },
    },
    synthesisNotes: { type: String },
    synthesizedAt: { type: Date, required: true },
    synthesizedBy: { type: String, required: true },
  },
  { _id: false }
);

const DistributionTargetSchema = new Schema<IDistributionTarget>(
  {
    type: { type: String, enum: ['role', 'group', 'individual'], required: true },
    roleId: { type: String },
    groupId: { type: String },
    userId: { type: String },
    canEdit: { type: Boolean, default: false },
    canShare: { type: Boolean, default: false },
    notifyOnUpdate: { type: Boolean, default: true },
    distributedAt: { type: Date, default: Date.now },
  },
  { _id: false }
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
    
    // CrewAI Structure
    crewAITemplate: {
      type: CrewAITemplateSchema,
      required: true,
    },
    
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
      // Optional - will be filled later during refinement or left empty
    },
    rawUserInput: { type: String },
    llmRefinedOutput: { type: String },
    synthesisMetadata: {
      type: SynthesisMetadataSchema,
    },
    
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
    
    // Role-based Distribution
    distributionTargets: [
      {
        type: DistributionTargetSchema,
        default: [],
      },
    ],
    
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
PromptTemplateSchema.index({ 'distributionTargets.roleId': 1, status: 1 });  // For role-based queries

export const PromptTemplate = mongoose.model<IPromptTemplate>(
  'PromptTemplate',
  PromptTemplateSchema
);
