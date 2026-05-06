import { DeepEvalClient } from '../DeepEvalClient';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DeepEvalClient', () => {
  let client: DeepEvalClient;
  const serviceUrl = 'http://localhost:8000';
  const apiKey = 'test-api-key-12345678901234567890';

  beforeEach(() => {
    client = new DeepEvalClient(serviceUrl, apiKey);
    jest.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return health status when service is available', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { status: 'healthy', version: '1.0.0' },
      });

      const health = await client.healthCheck();
      expect(health.status).toBe('healthy');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${serviceUrl}/health`,
        expect.objectContaining({ headers: expect.objectContaining({ 'x-api-key': apiKey }) })
      );
    });

    it('should return unhealthy status when service is down', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Connection refused'));

      const health = await client.healthCheck();
      expect(health.status).toBe('unhealthy');
    });
  });

  describe('evaluateRecord', () => {
    it('should return evaluation scores for a record', async () => {
      const mockScores = {
        faithfulness: 0.85,
        answer_relevancy: 0.9,
        contextual_relevancy: 0.88,
        toxicity_score: 0.02,
        bias_score: 0.05,
      };

      mockedAxios.post.mockResolvedValue({ data: mockScores });

      const result = await client.evaluateRecord({
        userPrompt: 'What is the capital of France?',
        context: 'France is in Western Europe...',
        llmResponse: 'The capital of France is Paris.',
      });

      expect(result.faithfulness).toBe(0.85);
      expect(result.answer_relevancy).toBe(0.9);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${serviceUrl}/evaluate`,
        expect.any(Object),
        expect.objectContaining({ headers: expect.objectContaining({ 'x-api-key': apiKey }) })
      );
    });

    it('should throw error when evaluation fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Evaluation service error'));

      await expect(
        client.evaluateRecord({
          userPrompt: 'Test',
          context: 'Test',
          llmResponse: 'Test',
        })
      ).rejects.toThrow('Evaluation service error');
    });
  });

  describe('batchEvaluate', () => {
    it('should evaluate multiple records in batch', async () => {
      const mockResults = [
        { id: '1', faithfulness: 0.85 },
        { id: '2', faithfulness: 0.92 },
      ];

      mockedAxios.post.mockResolvedValue({ data: mockResults });

      const result = await client.batchEvaluate([
        { userPrompt: 'Q1', context: 'C1', llmResponse: 'R1' },
        { userPrompt: 'Q2', context: 'C2', llmResponse: 'R2' },
      ]);

      expect(result).toHaveLength(2);
      expect(result[0].faithfulness).toBe(0.85);
    });
  });

  describe('getAvailableMetrics', () => {
    it('should return list of available evaluation metrics', async () => {
      const mockMetrics = {
        metrics: ['faithfulness', 'answer_relevancy', 'toxicity_score'],
      };

      mockedAxios.get.mockResolvedValue({ data: mockMetrics });

      const metrics = await client.getAvailableMetrics();
      expect(metrics).toContain('faithfulness');
      expect(metrics).toContain('toxicity_score');
    });
  });
});
