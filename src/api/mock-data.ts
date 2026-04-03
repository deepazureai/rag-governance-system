import { DetailedEvaluationMetrics } from '@/src/types';

// Mock framework configurations
export const MOCK_FRAMEWORKS = {
  available: [
    {
      id: 'ragas',
      name: 'RAGAS',
      description: 'Open-source RAG Evaluation framework with comprehensive metrics',
      metrics: ['groundedness', 'relevance', 'coherence', 'fluency', 'factuality', 'harmfulness'],
      enabled: true,
      version: '0.1.0',
    },
    {
      id: 'microsoft',
      name: 'Microsoft Evaluation SDK',
      description: 'Microsoft Azure evaluation framework with safety and compliance focus',
      metrics: ['relevance', 'groundedness', 'fluency', 'coherence', 'factuality', 'safety', 'completeness'],
      enabled: true,
      version: '1.0.0',
    },
  ],
};

// Mock RAGAS evaluation results
export const generateRagasEvaluation = (query: string): DetailedEvaluationMetrics => ({
  groundedness: 92 + Math.random() * 8,
  relevance: 88 + Math.random() * 12,
  fluency: 89 + Math.random() * 11,
  safety: 98 + Math.random() * 2,
  coherence: 91 + Math.random() * 9,
  completeness: 85 + Math.random() * 15,
  factuality: 94 + Math.random() * 6,
  harmfulness: Math.random() * 1,
});

// Mock Microsoft SDK evaluation results
export const generateMicrosoftEvaluation = (query: string): DetailedEvaluationMetrics => ({
  groundedness: 90 + Math.random() * 10,
  relevance: 87 + Math.random() * 13,
  fluency: 91 + Math.random() * 9,
  safety: 99 + Math.random() * 1,
  coherence: 92 + Math.random() * 8,
  completeness: 88 + Math.random() * 12,
  factuality: 95 + Math.random() * 5,
  harmfulness: Math.random() * 0.5,
});

// Mock evaluation history
export const MOCK_EVALUATION_HISTORY = [
  {
    id: 'eval-1',
    appId: 'app-1',
    query: 'How to reset password?',
    response: 'To reset your password, click Forgot Password on the login page.',
    framework: 'ragas',
    metrics: {
      groundedness: 95,
      relevance: 92,
      fluency: 93,
      safety: 99,
      coherence: 94,
      completeness: 91,
      factuality: 96,
      harmfulness: 0,
    },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    tokensUsed: 450,
    costEstimate: 0.02,
  },
  {
    id: 'eval-2',
    appId: 'app-1',
    query: 'What are your business hours?',
    response: 'We are open Monday-Friday, 9 AM to 6 PM EST.',
    framework: 'microsoft',
    metrics: {
      groundedness: 98,
      relevance: 96,
      fluency: 95,
      safety: 100,
      coherence: 97,
      completeness: 96,
      factuality: 99,
      harmfulness: 0,
    },
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    tokensUsed: 380,
    costEstimate: 0.018,
  },
  {
    id: 'eval-3',
    appId: 'app-2',
    query: 'Explain authentication flow',
    response: 'Authentication uses OAuth 2.0 with JWT tokens for secure access.',
    framework: 'ragas',
    metrics: {
      groundedness: 88,
      relevance: 90,
      fluency: 87,
      safety: 98,
      coherence: 89,
      completeness: 85,
      factuality: 91,
      harmfulness: 0.2,
    },
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    tokensUsed: 520,
    costEstimate: 0.025,
  },
];

// Mock batch evaluation response
export const generateBatchEvaluationResponse = (count: number, framework: string) => {
  return {
    batchId: `batch-${Date.now()}`,
    framework,
    totalEvaluations: count,
    completedEvaluations: 0,
    failedEvaluations: 0,
    results: [],
    startedAt: new Date().toISOString(),
    estimatedCompletionTime: new Date(Date.now() + count * 1000).toISOString(),
  };
};
