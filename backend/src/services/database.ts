/**
 * Database Service
 * Handles persistence of evaluations and framework configurations
 */

import { EvaluationRecord, BatchEvaluationRecord, FrameworkConfigRecord } from '../models/database';
import { v4 as uuidv4 } from 'uuid';

export interface IDatabase {
  initialize(): Promise<void>;
  saveEvaluation(evaluation: Omit<EvaluationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<EvaluationRecord>;
  getEvaluation(id: string): Promise<EvaluationRecord | null>;
  getAppEvaluations(appId: string, limit?: number, offset?: number): Promise<EvaluationRecord[]>;
  getBatchEvaluation(id: string): Promise<BatchEvaluationRecord | null>;
  saveBatchEvaluation(batch: Omit<BatchEvaluationRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<BatchEvaluationRecord>;
  updateBatchEvaluation(id: string, updates: Partial<BatchEvaluationRecord>): Promise<BatchEvaluationRecord>;
  close(): Promise<void>;
}

export class InMemoryDatabase implements IDatabase {
  private evaluations: Map<string, EvaluationRecord> = new Map();
  private batches: Map<string, BatchEvaluationRecord> = new Map();

  async initialize(): Promise<void> {
    console.log('[Database] In-memory database initialized');
  }

  async saveEvaluation(
    evaluation: Omit<EvaluationRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<EvaluationRecord> {
    const id = uuidv4();
    const now = new Date();

    const record: EvaluationRecord = {
      ...evaluation,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.evaluations.set(id, record);
    console.log(`[Database] Evaluation ${id} saved`);

    return record;
  }

  async getEvaluation(id: string): Promise<EvaluationRecord | null> {
    return this.evaluations.get(id) || null;
  }

  async getAppEvaluations(
    appId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<EvaluationRecord[]> {
    const appEvals = Array.from(this.evaluations.values())
      .filter((evaluation) => evaluation.appId === appId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return appEvals;
  }

  async saveBatchEvaluation(
    batch: Omit<BatchEvaluationRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<BatchEvaluationRecord> {
    const id = uuidv4();
    const now = new Date();

    const record: BatchEvaluationRecord = {
      ...batch,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.batches.set(id, record);
    console.log(`[Database] Batch ${id} saved`);

    return record;
  }

  async getBatchEvaluation(id: string): Promise<BatchEvaluationRecord | null> {
    return this.batches.get(id) || null;
  }

  async updateBatchEvaluation(
    id: string,
    updates: Partial<BatchEvaluationRecord>
  ): Promise<BatchEvaluationRecord> {
    const batch = this.batches.get(id);
    if (!batch) {
      throw new Error(`Batch ${id} not found`);
    }

    const updated: BatchEvaluationRecord = {
      ...batch,
      ...updates,
      id: batch.id, // Preserve ID
      createdAt: batch.createdAt, // Preserve creation time
      updatedAt: new Date(),
    };

    this.batches.set(id, updated);
    return updated;
  }

  async close(): Promise<void> {
    console.log('[Database] In-memory database closed');
    this.evaluations.clear();
    this.batches.clear();
  }
}

export function createDatabase(): IDatabase {
  // In production, you would create a proper SQLite or PostgreSQL connection
  // For now, use in-memory storage
  return new InMemoryDatabase();
}
