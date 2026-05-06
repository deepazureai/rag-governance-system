import { RawDataRecord } from '../../models/RawDataRecord';
import { BAReviewQueue } from '../../models/BAReviewQueue';
import { PromptTemplate } from '../../models/PromptTemplate';
import mongoose from 'mongoose';

describe('BA Review Workflow Integration Tests', () => {
  beforeAll(async () => {
    // Connect to test MongoDB
    const mongoUrl = process.env.MONGODB_TEST_URL || 'mongodb://localhost:27017/rag-evaluation-test';
    await mongoose.connect(mongoUrl);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear test data
    await RawDataRecord.deleteMany({});
    await BAReviewQueue.deleteMany({});
    await PromptTemplate.deleteMany({});
  });

  describe('Create and Review Raw Data Record', () => {
    it('should create a raw data record with user feedback and evaluation scores', async () => {
      const rawData = await RawDataRecord.create({
        applicationId: 'app_123',
        connectionId: 'conn_123',
        sourceType: 'local-folder',
        recordData: { id: 1, data: 'test' },
        lineNumber: 1,
        batchId: 'batch_123',
        fileName: 'test.csv',
        processedAt: new Date(),
        status: 'processed',
        userPromptEnteredAt: new Date(),
        llmResponseGeneratedAt: new Date(),
        totalLatency: 2500,
        userFeedback: {
          sentiment: 'negative',
          comment: 'Response was too brief',
          feedbackAt: new Date(),
        },
        evaluationScores: [
          {
            framework: 'RAGAS',
            scores: { faithfulness: 0.85, relevance: 0.78 },
            generatedAt: new Date(),
          },
        ],
      });

      expect(rawData._id).toBeDefined();
      expect(rawData.userFeedback?.sentiment).toBe('negative');
      expect(rawData.evaluationScores).toHaveLength(1);
    });

    it('should add non-destructive prompt improvements to a record', async () => {
      const rawData = await RawDataRecord.create({
        applicationId: 'app_123',
        connectionId: 'conn_123',
        sourceType: 'local-folder',
        recordData: { id: 1 },
        lineNumber: 1,
        batchId: 'batch_123',
        fileName: 'test.csv',
        processedAt: new Date(),
        status: 'processed',
        userPromptEnteredAt: new Date(),
        llmResponseGeneratedAt: new Date(),
        baReview: {
          promptImprovements: [],
          reviewStatus: 'pending',
        },
      });

      // Add improvement without overwriting original
      rawData.baReview?.promptImprovements.push({
        originalPrompt: 'What is AI?',
        improvedPrompt: 'What is Artificial Intelligence and how does it work?',
        reason: 'Expanded scope for better context',
        baName: 'John Doe',
        baEmail: 'john@example.com',
        estimatedScoreImpact: 0.08,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      rawData.baReview.reviewStatus = 'improved';
      await rawData.save();

      const updated = await RawDataRecord.findById(rawData._id);
      expect(updated?.baReview?.promptImprovements).toHaveLength(1);
      expect(updated?.baReview?.reviewStatus).toBe('improved');
    });

    it('should support multiple prompt improvements from different BAs', async () => {
      const rawData = await RawDataRecord.create({
        applicationId: 'app_123',
        connectionId: 'conn_123',
        sourceType: 'local-folder',
        recordData: { id: 1 },
        lineNumber: 1,
        batchId: 'batch_123',
        fileName: 'test.csv',
        processedAt: new Date(),
        status: 'processed',
        userPromptEnteredAt: new Date(),
        llmResponseGeneratedAt: new Date(),
        baReview: {
          promptImprovements: [
            {
              originalPrompt: 'What is AI?',
              improvedPrompt: 'What is Artificial Intelligence?',
              reason: 'Added specificity',
              baName: 'BA 1',
              baEmail: 'ba1@example.com',
              estimatedScoreImpact: 0.05,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            {
              originalPrompt: 'What is AI?',
              improvedPrompt: 'What is Artificial Intelligence and its current applications?',
              reason: 'Added context requirement',
              baName: 'BA 2',
              baEmail: 'ba2@example.com',
              estimatedScoreImpact: 0.08,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          reviewStatus: 'improved',
        },
      });

      const improvements = await RawDataRecord.findById(rawData._id).then(r => r?.baReview?.promptImprovements);
      expect(improvements).toHaveLength(2);
      expect(improvements?.[1].baName).toBe('BA 2');
    });
  });

  describe('Create Template from Similar Prompts', () => {
    it('should create a prompt template from grouped similar prompts', async () => {
      const template = await PromptTemplate.create({
        applicationId: 'app_123',
        templateName: 'Capital City Questions',
        description: 'Template for questions about capital cities',
        promptTemplate: 'What is the capital city of [COUNTRY] and what is its significance?',
        qualityGuidelines: 'Should include historical context and modern importance',
        category: 'Geography',
        tags: ['capital', 'geography', 'cities'],
        status: 'published',
        versions: [
          {
            version: 1,
            promptTemplate: 'What is the capital city of [COUNTRY]?',
            qualityGuidelines: 'Basic template',
            createdBy: 'ba_123',
            createdAt: new Date(),
          },
        ],
        currentVersion: 1,
        usageMetrics: {
          totalUsageCount: 0,
        },
        createdBy: 'ba_123',
      });

      expect(template._id).toBeDefined();
      expect(template.status).toBe('published');
      expect(template.versions).toHaveLength(1);
    });

    it('should track template usage metrics', async () => {
      const template = await PromptTemplate.create({
        applicationId: 'app_123',
        templateName: 'Test Template',
        description: 'Test',
        promptTemplate: 'Test template',
        qualityGuidelines: 'Test',
        status: 'published',
        versions: [
          {
            version: 1,
            promptTemplate: 'Test',
            qualityGuidelines: 'Test',
            createdBy: 'ba_123',
            createdAt: new Date(),
          },
        ],
        currentVersion: 1,
        usageMetrics: {
          totalUsageCount: 5,
          averageQualityScore: 0.87,
          averageUserSatisfaction: 0.85,
          successRate: 0.92,
        },
        createdBy: 'ba_123',
      });

      expect(template.usageMetrics.totalUsageCount).toBe(5);
      expect(template.usageMetrics.averageQualityScore).toBe(0.87);
    });
  });

  describe('BA Review Queue Management', () => {
    it('should create queue items with priority levels', async () => {
      const queueItem = await BAReviewQueue.create({
        applicationId: 'app_123',
        rawDataRecordId: 'record_123',
        priority: 'critical',
        priorityScore: 85,
        priorityReason: 'negative_feedback',
        userPrompt: 'Test prompt',
        llmResponse: 'Test response',
        status: 'pending',
      });

      expect(queueItem.priority).toBe('critical');
      expect(queueItem.priorityScore).toBe(85);
      expect(queueItem.status).toBe('pending');
    });

    it('should transition queue item through workflow states', async () => {
      const queueItem = await BAReviewQueue.create({
        applicationId: 'app_123',
        rawDataRecordId: 'record_123',
        priority: 'high',
        priorityScore: 65,
        priorityReason: 'low_score',
        userPrompt: 'Test',
        llmResponse: 'Test',
        status: 'pending',
      });

      // Transition to in_progress
      queueItem.status = 'in_progress';
      queueItem.assignedToBA = 'ba_123';
      queueItem.reviewStartedAt = new Date();
      await queueItem.save();

      let updated = await BAReviewQueue.findById(queueItem._id);
      expect(updated?.status).toBe('in_progress');

      // Transition to reviewed
      queueItem.status = 'reviewed';
      queueItem.reviewCompletedAt = new Date();
      await queueItem.save();

      updated = await BAReviewQueue.findById(queueItem._id);
      expect(updated?.status).toBe('reviewed');
    });
  });
});
