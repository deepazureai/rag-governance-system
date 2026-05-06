import { RawDataRecord } from '../models/RawDataRecord';
import { BAReviewQueue } from '../models/BAReviewQueue';
import { PromptTemplate } from '../models/PromptTemplate';

export class TestDataFactory {
  static createRawDataRecord(overrides = {}) {
    return {
      applicationId: 'test_app_123',
      connectionId: 'test_conn_123',
      sourceType: 'local-folder' as const,
      recordData: { id: 1, test: true },
      lineNumber: 1,
      batchId: 'test_batch_123',
      fileName: 'test_data.csv',
      processedAt: new Date(),
      status: 'processed' as const,
      userPromptEnteredAt: new Date(Date.now() - 5 * 60000),
      llmResponseGeneratedAt: new Date(),
      totalLatency: 2500,
      tokensUsed: 250,
      contextRetrievalTime: 500,
      llmGenerationTime: 2000,
      userFeedback: {
        sentiment: 'neutral' as const,
        feedbackAt: new Date(),
      },
      evaluationScores: [
        {
          framework: 'RAGAS',
          scores: {
            faithfulness: 0.85,
            relevance: 0.80,
            coherence: 0.88,
          },
          generatedAt: new Date(),
        },
      ],
      baReview: {
        promptImprovements: [],
        reviewStatus: 'pending' as const,
      },
      ...overrides,
    };
  }

  static createBAReviewQueueItem(overrides = {}) {
    return {
      applicationId: 'test_app_123',
      rawDataRecordId: 'test_record_123',
      priority: 'medium' as const,
      priorityScore: 45,
      priorityReason: 'low_score' as const,
      userPrompt: 'What is the capital of France?',
      llmResponse: 'The capital of France is Paris.',
      status: 'pending' as const,
      averageScore: 0.75,
      queuedAt: new Date(),
      ...overrides,
    };
  }

  static createPromptTemplate(overrides = {}) {
    return {
      applicationId: 'test_app_123',
      templateName: 'Test Template',
      description: 'A test template',
      promptTemplate: 'What is the [TOPIC]?',
      qualityGuidelines: 'Should be comprehensive and factual',
      category: 'General Knowledge',
      tags: ['test', 'demo'],
      status: 'published' as const,
      versions: [
        {
          version: 1,
          promptTemplate: 'What is the [TOPIC]?',
          qualityGuidelines: 'Should be comprehensive',
          createdBy: 'test_ba_123',
          createdAt: new Date(),
        },
      ],
      currentVersion: 1,
      usageMetrics: {
        totalUsageCount: 0,
      },
      createdBy: 'test_ba_123',
      ...overrides,
    };
  }
}

export class TestDatabaseHelper {
  static async clearAllData() {
    try {
      await RawDataRecord.deleteMany({});
      await BAReviewQueue.deleteMany({});
      await PromptTemplate.deleteMany({});
    } catch (error) {
      console.error('Error clearing test data:', error);
    }
  }

  static async seedRawData(count: number, overrides = {}) {
    const records = Array.from({ length: count }, (_, i) =>
      TestDataFactory.createRawDataRecord({
        lineNumber: i + 1,
        recordData: { id: i + 1 },
        ...overrides,
      })
    );
    return RawDataRecord.create(records);
  }

  static async seedQueueItems(count: number, overrides = {}) {
    const items = Array.from({ length: count }, (_, i) =>
      TestDataFactory.createBAReviewQueueItem({
        rawDataRecordId: `record_${i}`,
        priorityScore: 30 + Math.random() * 70,
        ...overrides,
      })
    );
    return BAReviewQueue.create(items);
  }
}

export class MockDeepEvalService {
  static createMockScores() {
    return {
      faithfulness: 0.85 + Math.random() * 0.1,
      answer_relevancy: 0.88 + Math.random() * 0.1,
      contextual_relevancy: 0.83 + Math.random() * 0.1,
      toxicity_score: Math.random() * 0.1,
      bias_score: Math.random() * 0.1,
      explainability_score: 0.80 + Math.random() * 0.1,
    };
  }

  static createMockHealthResponse() {
    return {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date(),
    };
  }

  static createMockErrorResponse() {
    return {
      status: 'unhealthy',
      error: 'Service temporarily unavailable',
      timestamp: new Date(),
    };
  }
}
