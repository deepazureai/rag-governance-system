// RAG Evaluation Types

export interface App {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'archived';
  deploymentDate: string;
  ragFramework: string;
  dataSource: string;
  owner: string;
}

export interface EvaluationMetric {
  id: string;
  name: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  unit?: string;
  category?: 'quality' | 'safety' | 'relevance' | 'performance';
}

export interface GovernanceMetric {
  id: string;
  name: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  unit?: string;
  threshold?: number;
  status: 'healthy' | 'warning' | 'critical';
  category: 'tokens' | 'performance' | 'throughput' | 'latency' | 'cost';
}

export interface DetailedEvaluationMetrics {
  groundedness: number;
  relevance: number;
  fluency: number;
  safety: number;
  coherence: number;
  completeness: number;
  factuality: number;
  harmfulness: number;
}

export interface QueryPerformance {
  timestamp: string;
  queryCount: number;
  averageLatency: number;
  successRate: number;
  errorRate: number;
}

export interface RelevanceScore {
  timestamp: string;
  retrieval: number;
  generation: number;
  overall: number;
}

/**
 * Threshold Configuration for Alert System
 * Defines industry-standard thresholds for each metric
 * Supports per-app customization with global defaults
 */
export interface MetricThreshold {
  critical: number;  // Value below this is CRITICAL
  warning: number;   // Value below this is WARNING
  healthy?: number;  // Value at or above this is HEALTHY
}

export interface AlertThresholdConfig {
  id: string;
  appId: string;
  // Quality Metrics
  groundedness: MetricThreshold;
  relevance: MetricThreshold;
  contextPrecision: MetricThreshold;
  contextRecall: MetricThreshold;
  answerRelevancy: MetricThreshold;
  coherence: MetricThreshold;
  faithfulness: MetricThreshold;
  // Performance Metrics
  successRate: MetricThreshold;
  latency: MetricThreshold;        // ms - lower is better
  tokenEfficiency: MetricThreshold; // tokens per query - lower is better
  errorRate: MetricThreshold;      // percentage - lower is better
  // Timestamps
  createdAt: string;
  updatedAt: string;
  isCustom: boolean;  // Whether this is customized from defaults
}

/**
 * Industry Standard Default Thresholds (2026 RAG Evaluation Standards)
 * Based on RAGAS, TREC, and enterprise RAG benchmarks
 */
export const INDUSTRY_STANDARD_THRESHOLDS: AlertThresholdConfig = {
  id: 'industry-default',
  appId: 'global-default',
  // Quality Metrics (0-100 scale)
  groundedness: { critical: 70, warning: 80, healthy: 85 },
  relevance: { critical: 75, warning: 85, healthy: 90 },
  contextPrecision: { critical: 70, warning: 80, healthy: 85 },
  contextRecall: { critical: 75, warning: 85, healthy: 90 },
  answerRelevancy: { critical: 70, warning: 80, healthy: 85 },
  coherence: { critical: 75, warning: 85, healthy: 90 },
  faithfulness: { critical: 70, warning: 80, healthy: 85 },
  // Performance Metrics
  successRate: { critical: 90, warning: 95, healthy: 98 },     // percentage
  latency: { critical: 5000, warning: 3000, healthy: 2000 },   // milliseconds
  tokenEfficiency: { critical: 2000, warning: 1500, healthy: 1000 }, // tokens
  errorRate: { critical: 10, warning: 5, healthy: 2 },         // percentage
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: false,
};

export interface AlertRule {
  id: string;
  name: string;
  appId: string;
  condition: string;
  threshold: number;
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  createdAt: string;
}

export interface Alert {
  id: string;
  appId: string;
  ruleId?: string;
  metricName: string;           // Which metric triggered it
  message: string;
  severity: 'critical' | 'warning' | 'healthy';
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metricValue: number;          // The actual value that triggered alert
  threshold: number;            // The threshold that was exceeded
}

export interface QueryLog {
  id: string;
  appId: string;
  query: string;
  response: string;
  retrievedDocuments: Document[];
  relevanceScore: number;
  latency: number;
  timestamp: string;
  evaluationMetrics?: DetailedEvaluationMetrics;
  tokensUsed: number;
  costEstimate: number;
}

export interface Document {
  id: string;
  content: string;
  source: string;
  relevance: number;
}

export interface Benchmark {
  id: string;
  name: string;
  description: string;
  appIds: string[];
  metrics: BenchmarkMetric[];
  createdAt: string;
  updatedAt: string;
}

export interface BenchmarkMetric {
  appId: string;
  appName: string;
  retrieval: number;
  generation: number;
  overall: number;
  queryCount: number;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  type: 'compliance' | 'security' | 'quality' | 'privacy';
  rules: PolicyRule[];
  enabled: boolean;
  createdAt: string;
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: string;
  action: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'analyst' | 'viewer';
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  emailAlerts: boolean;
  refreshInterval: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
