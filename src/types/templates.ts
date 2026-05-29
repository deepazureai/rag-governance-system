/**
 * Frontend Types & Interfaces for Templates & BA Review
 * Strictly typed with full TypeScript support
 */

// CrewAI Template Structure
export interface CrewAITemplate {
  actor: string;
  objective: string;
  task: string;
  context: string;
  expectedOutput: string;
  crewAIVersion?: string;
  toolsRequired?: string[];
}

// Distribution Target
export interface DistributionTarget {
  type: 'role' | 'group' | 'individual';
  roleId?: string;
  groupId?: string;
  userId?: string;
  canEdit: boolean;
  canShare: boolean;
  notifyOnUpdate: boolean;
  distributedAt: Date;
}

// Synthesis Metrics
export interface SynthesisMetrics {
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
  correctness: number;
  overall_score: number;
}

// Synthesis Metadata
export interface SynthesisMetadata {
  synthesisRequestId: string;
  inputPromptCount: number;
  synthesisMetrics: SynthesisMetrics;
  synthesisNotes?: string;
  synthesizedAt: Date;
  synthesizedBy: string;
}

// Prompt Template
export interface PromptTemplate {
  _id: string;
  applicationId: string;
  name: string;
  description?: string;
  templateText: string;
  crewAITemplate: CrewAITemplate;
  sourceKBPromptIds: string[];
  sourceRecommendationIds: string[];
  synthesisMetadata?: SynthesisMetadata;
  distributionTargets: DistributionTarget[];
  status: 'draft' | 'published' | 'archived';
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageMetrics?: {
    totalUsageCount: number;
    lastUsedAt?: Date;
    averageQualityScore?: number;
    averageUserSatisfaction?: number;
    successRate?: number;
  };
}

// Template Source (KB or Recommendation)
export interface TemplateSource {
  id: string;
  type: 'kb' | 'recommendation';
  title: string;
  snippet: string;
  metrics?: SynthesisMetrics;
  approvalDate?: Date;
  sourceContext?: string;
}

// BA Review Item
export interface BAReviewQueueItem {
  _id: string;
  applicationId: string;
  rawDataRecordId: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityScore: number;
  priorityReason: 'low_score' | 'negative_feedback' | 'high_latency' | 'manual_flag' | 'template_candidate';
  userPrompt: string;
  llmResponse: string;
  context?: string;
  averageScore?: number;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  latency?: number;
  status: 'pending' | 'in_progress' | 'reviewed' | 'approved' | 'rejected' | 'needs_revision' | 'archived';
  assignedToBA?: string;
  queuedAt: Date;
  reviewStartedAt?: Date;
  reviewCompletedAt?: Date;
  approvalMetadata?: {
    approvedBy: string;
    approvedAt: Date;
    reviewNotes?: string;
    metricsValidation?: boolean;
  };
  rejectionReason?: string;
  revisionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Synthesis Request
export interface PromptSynthesisRequest {
  applicationId: string;
  sourceKBThreadIds: string[];
  sourceRecommendationIds: string[];
  metricsThreshold?: number;
}

// Synthesis Response
export interface PromptSynthesisResponse {
  synthesisRequestId: string;
  synthesizedPrompt: string;
  crewAITemplate: CrewAITemplate;
  synthesisMetrics: SynthesisMetrics;
  synthesisNotes?: string;
  inputPromptCount: number;
  synthesizedAt: Date;
  synthesizedBy: string;
}

// Create Template Request
export interface CreateTemplateRequest {
  applicationId: string;
  name: string;
  description?: string;
  templateText: string;
  crewAITemplate: CrewAITemplate;
  sourceKBThreadIds?: string[];
  sourceRecommendationIds?: string[];
  synthesisMetadata?: SynthesisMetadata;
  distributionTargets?: DistributionTarget[];
}

// Update Template Request
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  templateText?: string;
  crewAITemplate?: Partial<CrewAITemplate>;
  distributionTargets?: DistributionTarget[];
}

// Distribute Template Request
export interface DistributeTemplateRequest {
  templateId: string;
  distributionTargets: DistributionTarget[];
}

// BA Review Approval Request
export interface BAReviewApprovalRequest {
  reviewId: string;
  status: 'approved' | 'rejected' | 'needs_revision';
  reviewNotes?: string;
  rejectionReason?: string;
  revisionNotes?: string;
  metricsValidation?: boolean;
}

// System Roles
export const SYSTEM_ROLES = {
  ADMIN: 'admin',
  BA: 'ba',
  ANALYST: 'analyst',
  QA_TESTER: 'qa_tester',
  BUSINESS_USER: 'business_user',
} as const;

export type SystemRole = typeof SYSTEM_ROLES[keyof typeof SYSTEM_ROLES];

// Permissions Matrix
export const ROLE_PERMISSIONS: Record<SystemRole, {
  canCreate: boolean;
  canReview: boolean;
  canApprove: boolean;
  canUse: boolean;
  canDistribute: boolean;
}> = {
  [SYSTEM_ROLES.ADMIN]: {
    canCreate: true,
    canReview: true,
    canApprove: true,
    canUse: true,
    canDistribute: true,
  },
  [SYSTEM_ROLES.BA]: {
    canCreate: true,
    canReview: true,
    canApprove: true,
    canUse: true,
    canDistribute: true,
  },
  [SYSTEM_ROLES.ANALYST]: {
    canCreate: true,
    canReview: false,
    canApprove: false,
    canUse: true,
    canDistribute: false,
  },
  [SYSTEM_ROLES.QA_TESTER]: {
    canCreate: false,
    canReview: false,
    canApprove: false,
    canUse: true,
    canDistribute: false,
  },
  [SYSTEM_ROLES.BUSINESS_USER]: {
    canCreate: false,
    canReview: false,
    canApprove: false,
    canUse: true,
    canDistribute: false,
  },
};
