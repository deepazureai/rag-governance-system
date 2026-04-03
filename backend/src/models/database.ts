/**
 * Database Models
 * Type definitions for database persistence
 */

export interface EvaluationRecord {
  id: string;
  appId: string;
  query: string;
  response: string;
  frameworkUsed: string;
  frameworkVersion: string;
  metrics: Record<string, number>;
  overallScore: number;
  executionTime: number;
  documentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  rawData?: string; // JSON stringified
}

export interface BatchEvaluationRecord {
  id: string;
  appId: string;
  frameworkUsed: string;
  totalEvaluations: number;
  completedEvaluations: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrameworkConfigRecord {
  id: string;
  frameworkName: string;
  isEnabled: boolean;
  configuration: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
