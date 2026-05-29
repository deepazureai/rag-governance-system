import { z } from 'zod';

/**
 * Zod Validation Schemas for Templates & BA Review
 * Strict runtime validation for all API requests and responses
 */

// CrewAI Template Schema
export const CrewAITemplateSchema = z.object({
  actor: z.string().min(1, 'Actor is required').max(500),
  objective: z.string().min(1, 'Objective is required').max(1000),
  task: z.string().min(1, 'Task is required').min(20, 'Task must be at least 20 characters').max(5000),
  context: z.string().min(1, 'Context is required').max(3000),
  expectedOutput: z.string().min(1, 'Expected output is required').max(2000),
  crewAIVersion: z.string().optional(),
  toolsRequired: z.array(z.string()).default([]),
});

// Distribution Target Schema
export const DistributionTargetSchema = z.object({
  type: z.enum(['role', 'group', 'individual']),
  roleId: z.string().optional(),
  groupId: z.string().optional(),
  userId: z.string().optional(),
  canEdit: z.boolean().default(false),
  canShare: z.boolean().default(false),
  notifyOnUpdate: z.boolean().default(true),
});

// Synthesis Request Schema
export const PromptSynthesisRequestSchema = z.object({
  applicationId: z.string().min(1),
  sourceKBThreadIds: z.array(z.string()).min(0),
  sourceRecommendationIds: z.array(z.string()).min(0),
  metricsThreshold: z.number().min(0).max(100).default(70),
});

// Synthesis Response Schema
export const PromptSynthesisResponseSchema = z.object({
  synthesisRequestId: z.string(),
  synthesizedPrompt: z.string(),
  crewAITemplate: CrewAITemplateSchema,
  synthesisMetrics: z.object({
    faithfulness: z.number().min(0).max(100),
    answer_relevancy: z.number().min(0).max(100),
    context_precision: z.number().min(0).max(100),
    context_recall: z.number().min(0).max(100),
    correctness: z.number().min(0).max(100),
    overall_score: z.number().min(0).max(100),
  }),
  synthesisNotes: z.string().optional(),
  inputPromptCount: z.number(),
  synthesizedAt: z.date(),
  synthesizedBy: z.string(),
});

// Create Template Request Schema
export const CreateTemplateRequestSchema = z.object({
  applicationId: z.string().min(1),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  templateText: z.string().min(1),
  crewAITemplate: CrewAITemplateSchema,
  sourceKBThreadIds: z.array(z.string()).default([]),
  sourceRecommendationIds: z.array(z.string()).default([]),
  synthesisMetadata: z.object({
    synthesisRequestId: z.string(),
    inputPromptCount: z.number(),
    synthesisMetrics: z.object({
      faithfulness: z.number().min(0).max(100),
      answer_relevancy: z.number().min(0).max(100),
      context_precision: z.number().min(0).max(100),
      context_recall: z.number().min(0).max(100),
      correctness: z.number().min(0).max(100),
      overall_score: z.number().min(0).max(100),
    }),
    synthesisNotes: z.string().optional(),
    synthesizedAt: z.date(),
    synthesizedBy: z.string(),
  }).optional(),
  distributionTargets: z.array(DistributionTargetSchema).default([]),
});

// Update Template Request Schema
export const UpdateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  templateText: z.string().min(1).optional(),
  crewAITemplate: CrewAITemplateSchema.partial().optional(),
  distributionTargets: z.array(DistributionTargetSchema).optional(),
});

// Distribute Template Request Schema
export const DistributeTemplateRequestSchema = z.object({
  templateId: z.string().min(1),
  distributionTargets: z.array(DistributionTargetSchema).min(1, 'At least one distribution target required'),
});

// BA Review Queue Approval Schema
export const BAReviewApprovalSchema = z.object({
  reviewId: z.string().min(1),
  status: z.enum(['approved', 'rejected', 'needs_revision']),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  revisionNotes: z.string().optional(),
  metricsValidation: z.boolean().optional(),
});

// BA Review Queue Request Revision Schema
export const BAReviewRequestRevisionSchema = z.object({
  reviewId: z.string().min(1),
  revisionNotes: z.string().min(1),
});

// List Templates Query Schema
export const ListTemplatesQuerySchema = z.object({
  applicationId: z.string().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  roleId: z.string().optional(),  // For role-based filtering
  groupId: z.string().optional(),
  userId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

// List BA Review Queue Query Schema
export const ListBAReviewQueueQuerySchema = z.object({
  applicationId: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'reviewed', 'approved', 'rejected', 'needs_revision']).optional(),
  assignedToBA: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
});

// Export types inferred from schemas
export type CrewAITemplate = z.infer<typeof CrewAITemplateSchema>;
export type DistributionTarget = z.infer<typeof DistributionTargetSchema>;
export type PromptSynthesisRequest = z.infer<typeof PromptSynthesisRequestSchema>;
export type PromptSynthesisResponse = z.infer<typeof PromptSynthesisResponseSchema>;
export type CreateTemplateRequest = z.infer<typeof CreateTemplateRequestSchema>;
export type UpdateTemplateRequest = z.infer<typeof UpdateTemplateRequestSchema>;
export type DistributeTemplateRequest = z.infer<typeof DistributeTemplateRequestSchema>;
export type BAReviewApproval = z.infer<typeof BAReviewApprovalSchema>;
export type BAReviewRequestRevision = z.infer<typeof BAReviewRequestRevisionSchema>;
export type ListTemplatesQuery = z.infer<typeof ListTemplatesQuerySchema>;
export type ListBAReviewQueueQuery = z.infer<typeof ListBAReviewQueueQuerySchema>;
