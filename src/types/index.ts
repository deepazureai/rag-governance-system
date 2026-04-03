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
  ruleId: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  resolved: boolean;
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
