import mongoose, { Schema, Document } from 'mongoose';

export interface IBAPromptImprovement {
  originalPrompt: string;
  improvedPrompt: string;
  reason: string;
  baName: string;
  baEmail: string;
  estimatedScoreImpact?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IContextRetrieved {
  source: string;
  relevanceScore: number;
  content: string;
}

export interface IRawDataRecord extends Document {
  applicationId: string;
  connectionId: string;
  sourceType: 'local-folder' | 'azure-blob' | 'database';
  recordData: Record<string, any>;
  lineNumber: number;
  batchId: string;
  fileName: string;
  processedAt: Date;
  status: 'pending' | 'processed' | 'failed';
  error?: string;
  
  // Authentic data representation - User interaction timestamps
  userPromptEnteredAt: Date;  // When end user submitted the prompt
  llmResponseGeneratedAt: Date;  // When LLM generated the response
  
  // Performance metrics
  contextRetrievalTime?: number;  // milliseconds
  llmGenerationTime?: number;  // milliseconds
  totalLatency?: number;  // milliseconds (from prompt entry to response generated)
  tokensUsed?: number;
  
  // User feedback (thumbs up/down)
  userFeedback?: {
    sentiment: 'positive' | 'negative' | 'neutral';  // 1 for thumbs up, 0 for thumbs down
    comment?: string;
    feedbackAt?: Date;
  };
  
  // Context retrieved by RAG system
  contextRetrieved?: IContextRetrieved[];
  
  // Framework evaluation scores (RAGAS, DeepEval, etc.)
  evaluationScores?: {
    framework: string;  // 'RAGAS', 'DeepEval', etc.
    scores: Record<string, number>;
    generatedAt: Date;
  }[];
  
  // BA Review and Improvement
  baReview?: {
    promptImprovements: IBAPromptImprovement[];
    reviewStatus: 'pending' | 'reviewed' | 'improved' | 'approved';
    reviewedAt?: Date;
    approvedAt?: Date;
    approvedBy?: string;
    notes?: string;
  };
  
  // Template usage
  templateId?: string;  // If response was generated using a prompt template
  templateVersion?: number;  // Version of template used
  
  createdAt: Date;
  updatedAt: Date;
}

const BAPromptImprovementSchema = new Schema<IBAPromptImprovement>(
  {
    originalPrompt: { type: String, required: true },
    improvedPrompt: { type: String, required: true },
    reason: { type: String, required: true },
    baName: { type: String, required: true },
    baEmail: { type: String, required: true },
    estimatedScoreImpact: { type: Number },
  },
  { timestamps: true }
);

const ContextRetrievedSchema = new Schema<IContextRetrieved>(
  {
    source: { type: String, required: true },
    relevanceScore: { type: Number, required: true },
    content: { type: String, required: true },
  }
);

const RawDataRecordSchema = new Schema<IRawDataRecord>(
  {
    applicationId: { type: String, required: true, index: true },
    connectionId: { type: String, required: true, index: true },
    sourceType: { type: String, enum: ['local-folder', 'azure-blob', 'database'], required: true },
    recordData: { type: Schema.Types.Mixed, required: true },
    lineNumber: { type: Number, required: true },
    batchId: { type: String, required: true, index: true },
    fileName: { type: String, required: true },
    processedAt: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'processed', 'failed'], default: 'pending' },
    error: { type: String },
    
    // Authentic data timestamps
    userPromptEnteredAt: { type: Date, required: true },
    llmResponseGeneratedAt: { type: Date, required: true },
    
    // Performance metrics
    contextRetrievalTime: { type: Number },
    llmGenerationTime: { type: Number },
    totalLatency: { type: Number },
    tokensUsed: { type: Number },
    
    // User feedback
    userFeedback: {
      sentiment: { type: String, enum: ['positive', 'negative', 'neutral'] },
      comment: { type: String },
      feedbackAt: { type: Date },
    },
    
    // Context retrieved
    contextRetrieved: [ContextRetrievedSchema],
    
    // Framework scores
    evaluationScores: [
      {
        framework: { type: String },
        scores: { type: Schema.Types.Mixed },
        generatedAt: { type: Date },
      },
    ],
    
    // BA Review
    baReview: {
      promptImprovements: [BAPromptImprovementSchema],
      reviewStatus: { type: String, enum: ['pending', 'reviewed', 'improved', 'approved'], default: 'pending' },
      reviewedAt: { type: Date },
      approvedAt: { type: Date },
      approvedBy: { type: String },
      notes: { type: String },
    },
    
    // Template usage
    templateId: { type: String },
    templateVersion: { type: Number },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
RawDataRecordSchema.index({ applicationId: 1, batchId: 1 });
RawDataRecordSchema.index({ applicationId: 1, 'baReview.reviewStatus': 1 });
RawDataRecordSchema.index({ applicationId: 1, 'userFeedback.sentiment': 1 });
RawDataRecordSchema.index({ applicationId: 1, userPromptEnteredAt: -1 });

export const RawDataRecord = mongoose.model<IRawDataRecord>('RawDataRecord', RawDataRecordSchema);
