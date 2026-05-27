import { Schema, Document, Types } from 'mongoose';

/**
 * Recommendation Prompt Document
 * Stores outcomes from raw data recommendations with user ratings and notes
 */
export interface RecommendationSuggestion {
  issue: string;
  suggestion: string;
  expectedImprovement: string;
}

export interface IRecommendationPrompt extends Document {
  applicationId: string;
  recordId: string;
  
  // Original data
  originalPrompt: string;
  originalResponse: string;
  context?: string;
  
  // Suggestions from LLM
  suggestions: readonly RecommendationSuggestion[];
  
  // Metadata
  llmConfigUsed: Types.ObjectId;
  rating?: number;
  userNotes?: string;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export const recommendationPromptSchema = new Schema<IRecommendationPrompt>(
  {
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    recordId: {
      type: String,
      required: true,
      index: true,
    },
    originalPrompt: {
      type: String,
      required: true,
    },
    originalResponse: {
      type: String,
      required: true,
    },
    context: { type: String },
    suggestions: [
      {
        issue: { type: String, required: true },
        suggestion: { type: String, required: true },
        expectedImprovement: { type: String, required: true },
      },
    ],
    llmConfigUsed: {
      type: Schema.Types.ObjectId,
      ref: 'LLMConfig',
      required: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    userNotes: { type: String },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

export default recommendationPromptSchema;
