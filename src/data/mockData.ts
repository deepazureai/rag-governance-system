import {
  App,
  EvaluationMetric,
  QueryPerformance,
  RelevanceScore,
  Alert,
  Benchmark,
  GovernancePolicy,
} from '@/types';

export const mockApps: App[] = [
  {
    id: '1',
    name: 'Customer Support RAG',
    description: 'Retrieval-augmented generation system for automated customer support responses',
    status: 'active',
    deploymentDate: '2024-01-15',
    ragFramework: 'LangChain',
    dataSource: 'PostgreSQL',
    owner: 'Support Team',
  },
  {
    id: '2',
    name: 'Document Q&A',
    description: 'Question answering system for internal documentation and knowledge base',
    status: 'active',
    deploymentDate: '2024-02-01',
    ragFramework: 'Llamaindex',
    dataSource: 'Vector DB',
    owner: 'Knowledge Team',
  },
  {
    id: '3',
    name: 'Legal Document Analyzer',
    description: 'Analyzes and summarizes legal documents using RAG',
    status: 'inactive',
    deploymentDate: '2024-03-10',
    ragFramework: 'Semantic Router',
    dataSource: 'MongoDB',
    owner: 'Legal Team',
  },
];

export const mockMetrics: EvaluationMetric[] = [
  {
    id: '1',
    name: 'Retrieval Accuracy',
    description: 'Percentage of relevant documents retrieved',
    value: 92.5,
    trend: 'up',
    trendPercentage: 5.2,
    unit: '%',
  },
  {
    id: '2',
    name: 'Response Generation Quality',
    description: 'Average quality score of generated responses',
    value: 8.7,
    trend: 'up',
    trendPercentage: 2.1,
    unit: '/10',
  },
  {
    id: '3',
    name: 'Avg Response Latency',
    description: 'Average time to generate response',
    value: 245,
    trend: 'down',
    trendPercentage: 12.3,
    unit: 'ms',
  },
  {
    id: '4',
    name: 'Success Rate',
    description: 'Percentage of successful queries',
    value: 98.2,
    trend: 'stable',
    trendPercentage: 0.5,
    unit: '%',
  },
];

export const mockQueryPerformance: QueryPerformance[] = [
  {
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    queryCount: 1250,
    averageLatency: 380,
    successRate: 94.2,
    errorRate: 5.8,
  },
  {
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    queryCount: 1420,
    averageLatency: 320,
    successRate: 95.1,
    errorRate: 4.9,
  },
  {
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    queryCount: 1580,
    averageLatency: 290,
    successRate: 96.0,
    errorRate: 4.0,
  },
  {
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    queryCount: 1640,
    averageLatency: 265,
    successRate: 97.2,
    errorRate: 2.8,
  },
  {
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    queryCount: 1720,
    averageLatency: 245,
    successRate: 98.0,
    errorRate: 2.0,
  },
  {
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    queryCount: 1890,
    averageLatency: 235,
    successRate: 98.2,
    errorRate: 1.8,
  },
  {
    timestamp: new Date().toISOString(),
    queryCount: 2050,
    averageLatency: 220,
    successRate: 98.5,
    errorRate: 1.5,
  },
];

export const mockRelevanceScores: RelevanceScore[] = [
  {
    timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    retrieval: 88,
    generation: 85,
    overall: 86.5,
  },
  {
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    retrieval: 89,
    generation: 86,
    overall: 87.5,
  },
  {
    timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    retrieval: 90,
    generation: 88,
    overall: 89,
  },
  {
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    retrieval: 91,
    generation: 89,
    overall: 90,
  },
  {
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    retrieval: 92,
    generation: 90,
    overall: 91,
  },
  {
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    retrieval: 92.5,
    generation: 91,
    overall: 91.75,
  },
];

export const mockAlerts: Alert[] = [
  {
    id: '1',
    appId: '1',
    ruleId: 'rule-1',
    message: 'Retrieval accuracy dropped below 90%',
    severity: 'warning',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    resolved: false,
  },
  {
    id: '2',
    appId: '2',
    ruleId: 'rule-2',
    message: 'Response latency exceeded threshold (500ms)',
    severity: 'critical',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    resolved: false,
  },
  {
    id: '3',
    appId: '1',
    ruleId: 'rule-3',
    message: 'High error rate detected',
    severity: 'warning',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    resolved: true,
  },
];

export const mockBenchmarks: Benchmark[] = [
  {
    id: '1',
    name: 'Q1 Performance Baseline',
    description: 'Q1 2024 performance benchmark across all RAG applications',
    appIds: ['1', '2', '3'],
    metrics: [
      {
        appId: '1',
        appName: 'Customer Support RAG',
        retrieval: 92,
        generation: 89,
        overall: 90.5,
        queryCount: 15000,
      },
      {
        appId: '2',
        appName: 'Document Q&A',
        retrieval: 88,
        generation: 85,
        overall: 86.5,
        queryCount: 8000,
      },
      {
        appId: '3',
        appName: 'Legal Document Analyzer',
        retrieval: 95,
        generation: 92,
        overall: 93.5,
        queryCount: 3500,
      },
    ],
    createdAt: '2024-01-01',
    updatedAt: '2024-03-31',
  },
];

export const mockPolicies: GovernancePolicy[] = [
  {
    id: '1',
    name: 'Data Privacy Policy',
    description: 'Ensures compliance with GDPR and data protection regulations',
    type: 'privacy',
    rules: [
      {
        id: 'rule-1',
        name: 'PII Detection',
        condition: 'Detect personally identifiable information',
        action: 'Redact or reject response',
      },
      {
        id: 'rule-2',
        name: 'Consent Check',
        condition: 'Verify user consent for data processing',
        action: 'Block processing if no consent',
      },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Quality Standards',
    description: 'Maintains minimum quality thresholds for all responses',
    type: 'quality',
    rules: [
      {
        id: 'rule-3',
        name: 'Relevance Threshold',
        condition: 'Response relevance score < 80%',
        action: 'Flag for manual review',
      },
    ],
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];
