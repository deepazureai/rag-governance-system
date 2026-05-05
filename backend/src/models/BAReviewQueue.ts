import mongoose, { Schema, Document } from 'mongoose';

export interface IBAReviewQueueItem extends Document {
  applicationId: string;
  rawDataRecordId: string;
  
  // Prioritization
  priority: 'critical' | 'high' | 'medium' | 'low';
  priorityScore: number;  // Calculated score for sorting
  priorityReason: 'low_score' | 'negative_feedback' | 'high_latency' | 'manual_flag' | 'template_candidate';
  
  // Original data snapshot
  userPrompt: string;
  llmResponse: string;
  context?: string;
  
  // Metrics that triggered review
  averageScore?: number;
  userFeedback?: 'positive' | 'negative' | 'neutral';
  latency?: number;
  
  // Review status
  status: 'pending' | 'in_progress' | 'reviewed' | 'approved' | 'archived';
  assignedToBA?: string;  // BA email/name
  
  // Timeline
  queuedAt: Date;
  reviewStartedAt?: Date;
  reviewCompletedAt?: Date;
  
  // Similarity grouping (for template creation)
  similarRecordIds?: string[];  // Other raw data records with similar prompts
  similarityScore?: number;  // Average similarity with grouped records
  groupId?: string;  // ID of the group for template creation
  
  createdAt: Date;
  updatedAt: Date;
}

const BAReviewQueueSchema = new Schema<IBAReviewQueueItem>(
  {
    applicationId: { type: String, required: true, index: true },
    rawDataRecordId: { type: String, required: true, index: true },
    
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
    priorityScore: { type: Number, default: 0, index: -1 },  // Descending index for sorting
    priorityReason: { 
      type: String, 
      enum: ['low_score', 'negative_feedback', 'high_latency', 'manual_flag', 'template_candidate'],
      required: true 
    },
    
    userPrompt: { type: String, required: true },
    llmResponse: { type: String, required: true },
    context: { type: String },
    
    averageScore: { type: Number },
    userFeedback: { type: String, enum: ['positive', 'negative', 'neutral'] },
    latency: { type: Number },
    
    status: { type: String, enum: ['pending', 'in_progress', 'reviewed', 'approved', 'archived'], default: 'pending', index: true },
    assignedToBA: { type: String },
    
    queuedAt: { type: Date, default: Date.now },
    reviewStartedAt: { type: Date },
    reviewCompletedAt: { type: Date },
    
    similarRecordIds: [{ type: String }],
    similarityScore: { type: Number },
    groupId: { type: String },
  },
  { timestamps: true }
);

// Indexes for efficient BA workflow queries
BAReviewQueueSchema.index({ applicationId: 1, status: 1, priorityScore: -1 });  // Get high-priority pending items
BAReviewQueueSchema.index({ applicationId: 1, assignedToBA: 1, status: 1 });  // BA's assigned items
BAReviewQueueSchema.index({ applicationId: 1, groupId: 1 });  // Items grouped for template creation
BAReviewQueueSchema.index({ applicationId: 1, queuedAt: -1 });  // Items by queue time

export const BAReviewQueue = mongoose.model<IBAReviewQueueItem>('BAReviewQueue', BAReviewQueueSchema);
