import { Schema, Document } from 'mongoose';

/**
 * LLM Configuration Document
 * Stores provider credentials and settings for recommendations and prompt refinement
 */
export interface ILLMConfig extends Document {
  applicationId: string;
  provider: 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';
  
  // Azure OpenAI
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  
  // Claude
  claudeApiKey?: string;
  claudeModel?: string;
  
  // AWS Bedrock
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  bedrockModelId?: string;
  
  // OpenAI
  openaiApiKey?: string;
  openaiModel?: string;
  
  // Common settings
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  isDefault?: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export const llmConfigSchema = new Schema<ILLMConfig>(
  {
    applicationId: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['azure-openai', 'claude', 'aws-bedrock', 'openai'],
      required: true,
    },
    azureEndpoint: { type: String },
    azureApiKey: { type: String },
    azureDeploymentName: { type: String },
    azureApiVersion: { type: String },
    claudeApiKey: { type: String },
    claudeModel: { type: String },
    awsRegion: { type: String },
    awsAccessKeyId: { type: String },
    awsSecretAccessKey: { type: String },
    bedrockModelId: { type: String },
    openaiApiKey: { type: String },
    openaiModel: { type: String },
    temperature: {
      type: Number,
      min: 0,
      max: 2,
      default: 0.7,
    },
    maxTokens: {
      type: Number,
      default: 2048,
    },
    topP: {
      type: Number,
      min: 0,
      max: 1,
      default: 1,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default llmConfigSchema;
