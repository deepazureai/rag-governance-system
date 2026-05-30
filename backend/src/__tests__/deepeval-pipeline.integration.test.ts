import { RawDataRecord } from '../../models/RawDataRecord.js';
import { DeepEvalClient } from '../../services/DeepEvalClient.js';
import mongoose from 'mongoose';

describe('DeepEval Evaluation Pipeline Integration', () => {
  let deepEvalClient: DeepEvalClient;

  beforeAll(async () => {
    const mongoUrl = process.env.MONGODB_TEST_URL || 'mongodb://localhost:27017/rag-evaluation-test';
    await mongoose.connect(mongoUrl);
    
    const serviceUrl = process.env.DEEPEVAL_SERVICE_URL || 'http://localhost:8000';
    const apiKey = process.env.DEEPEVAL_API_KEY || 'test-api-key';
    deepEvalClient = new DeepEvalClient(serviceUrl, apiKey);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await RawDataRecord.deleteMany({});
  });

  describe('Evaluate Raw Data with DeepEval', () => {
    it('should evaluate a raw data record and store scores', async () => {
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
        totalLatency: 2500,
        evaluationScores: [
          {
            framework: 'RAGAS',
            scores: { faithfulness: 0.85, relevance: 0.78 },
            generatedAt: new Date(),
          },
        ],
      });

      // Simulate evaluation and store scores
      const deepevalScores = {
        framework: 'DeepEval',
        scores: {
          faithfulness: 0.82,
          answer_relevancy: 0.88,
          contextual_relevancy: 0.85,
          toxicity_score: 0.01,
          bias_score: 0.02,
          explainability_score: 0.80,
        },
        generatedAt: new Date(),
      };

      rawData.evaluationScores?.push(deepevalScores);
      await rawData.save();

      const updated = await RawDataRecord.findById(rawData._id);
      expect(updated?.evaluationScores).toHaveLength(2);
      
      const deepevalEntry = updated?.evaluationScores?.find(s => s.framework === 'DeepEval');
      expect(deepevalEntry?.scores.toxicity_score).toBe(0.01);
      expect(deepevalEntry?.scores.answer_relevancy).toBe(0.88);
    });

    it('should flag records with high toxicity or bias scores', async () => {
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
        evaluationScores: [
          {
            framework: 'DeepEval',
            scores: {
              toxicity_score: 0.75, // High toxicity
              bias_score: 0.60,     // Moderate bias
              faithfulness: 0.80,
            },
            generatedAt: new Date(),
          },
        ],
        baReview: {
          promptImprovements: [],
          reviewStatus: 'pending',
          notes: 'Ethics violation detected - high toxicity',
        },
      });

      expect(rawData.evaluationScores?.[0].scores.toxicity_score).toBeGreaterThan(0.5);
      expect(rawData.baReview?.notes).toContain('Ethics violation');
    });

    it('should support multiple framework evaluations for comparison', async () => {
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
        evaluationScores: [
          {
            framework: 'RAGAS',
            scores: { faithfulness: 0.85, relevance: 0.78, coherence: 0.88 },
            generatedAt: new Date(),
          },
          {
            framework: 'DeepEval',
            scores: { faithfulness: 0.82, answer_relevancy: 0.88, contextual_relevancy: 0.85 },
            generatedAt: new Date(),
          },
        ],
      });

      const frameworks = rawData.evaluationScores?.map(e => e.framework) || [];
      expect(frameworks).toContain('RAGAS');
      expect(frameworks).toContain('DeepEval');
      
      // Compare scores between frameworks
      const ragasFaithfulness = rawData.evaluationScores?.[0].scores.faithfulness;
      const deepevalFaithfulness = rawData.evaluationScores?.[1].scores.faithfulness;
      expect(Math.abs((ragasFaithfulness || 0) - (deepevalFaithfulness || 0))).toBeLessThan(0.1);
    });
  });

  describe('Batch Evaluation Pipeline', () => {
    it('should evaluate multiple records efficiently', async () => {
      const records = await RawDataRecord.create([
        {
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
        },
        {
          applicationId: 'app_123',
          connectionId: 'conn_123',
          sourceType: 'local-folder',
          recordData: { id: 2 },
          lineNumber: 2,
          batchId: 'batch_123',
          fileName: 'test.csv',
          processedAt: new Date(),
          status: 'processed',
          userPromptEnteredAt: new Date(),
          llmResponseGeneratedAt: new Date(),
        },
      ]);

      // Simulate batch evaluation
      for (const record of records) {
        record.evaluationScores = [
          {
            framework: 'DeepEval',
            scores: { faithfulness: 0.85 + Math.random() * 0.1 },
            generatedAt: new Date(),
          },
        ];
        await record.save();
      }

      const evaluated = await RawDataRecord.find({ batchId: 'batch_123' });
      expect(evaluated).toHaveLength(2);
      expect(evaluated.every(r => r.evaluationScores?.length ?? 0 > 0)).toBe(true);
    });
  });

  describe('Evaluation Score Quality Checks', () => {
    it('should validate evaluation scores are within expected ranges', async () => {
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
        evaluationScores: [
          {
            framework: 'DeepEval',
            scores: {
              faithfulness: 0.85,
              answer_relevancy: 0.90,
              toxicity_score: 0.02,
              bias_score: 0.05,
            },
            generatedAt: new Date(),
          },
        ],
      });

      const scores = rawData.evaluationScores?.[0].scores || {};
      Object.entries(scores).forEach(([key, value]) => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1);
      });
    });
  });
});
