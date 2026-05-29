import { z } from 'zod';

/**
 * Frontend Zod Validation Schemas
 * Runtime validation for API requests and form submissions
 */

// CrewAI Template Validation
export const CrewAITemplateValidation = z.object({
  actor: z.string().min(1, 'Actor is required').max(500),
  objective: z.string().min(1, 'Objective is required').max(1000),
  task: z.string().min(1, 'Task is required').min(20, 'Task must be at least 20 characters').max(5000),
  context: z.string().min(1, 'Context is required').max(3000),
  expectedOutput: z.string().min(1, 'Expected output is required').max(2000),
  crewAIVersion: z.string().optional(),
  toolsRequired: z.array(z.string()).optional(),
});

// Distribution Target Validation
export const DistributionTargetValidation = z.object({
  type: z.enum(['role', 'group', 'individual']),
  roleId: z.string().optional(),
  groupId: z.string().optional(),
  userId: z.string().optional(),
  canEdit: z.boolean().default(false),
  canShare: z.boolean().default(false),
  notifyOnUpdate: z.boolean().default(true),
});

// Synthesis Request Validation
export const SynthesisRequestValidation = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  sourceKBThreadIds: z.array(z.string()).min(0),
  sourceRecommendationIds: z.array(z.string()).min(0),
  metricsThreshold: z.number().min(0).max(100).default(70),
}).refine(
  (data) => data.sourceKBThreadIds.length > 0 || data.sourceRecommendationIds.length > 0,
  { message: 'At least one source prompt is required' }
);

// Create Template Validation
export const CreateTemplateValidation = z.object({
  applicationId: z.string().min(1, 'Application ID is required'),
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  templateText: z.string().min(1, 'Template text is required'),
  crewAITemplate: CrewAITemplateValidation,
  sourceKBThreadIds: z.array(z.string()).default([]),
  sourceRecommendationIds: z.array(z.string()).default([]),
  distributionTargets: z.array(DistributionTargetValidation).default([]),
});

// Update Template Validation
export const UpdateTemplateValidation = z.object({
  name: z.string().min(1, 'Name is required').max(200).optional(),
  description: z.string().max(1000).optional(),
  templateText: z.string().min(1, 'Template text is required').optional(),
  crewAITemplate: CrewAITemplateValidation.partial().optional(),
  distributionTargets: z.array(DistributionTargetValidation).optional(),
});

// Distribute Template Validation
export const DistributeTemplateValidation = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  distributionTargets: z.array(DistributionTargetValidation).min(1, 'At least one distribution target required'),
});

// BA Review Approval Validation
export const BAReviewApprovalValidation = z.object({
  reviewId: z.string().min(1, 'Review ID is required'),
  status: z.enum(['approved', 'rejected', 'needs_revision']),
  reviewNotes: z.string().optional(),
  rejectionReason: z.string().optional(),
  revisionNotes: z.string().optional(),
  metricsValidation: z.boolean().optional(),
}).refine(
  (data) => {
    if (data.status === 'rejected' && !data.rejectionReason) {
      return false;
    }
    if (data.status === 'needs_revision' && !data.revisionNotes) {
      return false;
    }
    return true;
  },
  { message: 'Rejection reason or revision notes required for this status' }
);

// Export inferred types
export type CrewAITemplateForm = z.infer<typeof CrewAITemplateValidation>;
export type DistributionTargetForm = z.infer<typeof DistributionTargetValidation>;
export type SynthesisRequestForm = z.infer<typeof SynthesisRequestValidation>;
export type CreateTemplateForm = z.infer<typeof CreateTemplateValidation>;
export type UpdateTemplateForm = z.infer<typeof UpdateTemplateValidation>;
export type DistributeTemplateForm = z.infer<typeof DistributeTemplateValidation>;
export type BAReviewApprovalForm = z.infer<typeof BAReviewApprovalValidation>;
