import { apiClient } from './client';
import {
  App,
  EvaluationMetric,
  QueryPerformance,
  RelevanceScore,
  AlertRule,
  Alert,
  QueryLog,
  Benchmark,
  GovernancePolicy,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

// Apps API
export const appsApi = {
  getAll: (params?: any) => apiClient.get<PaginatedResponse<App>>('/apps', { params }),
  getById: (id: string) => apiClient.get<App>(`/apps/${id}`),
  create: (data: Partial<App>) => apiClient.post<App>('/apps', data),
  update: (id: string, data: Partial<App>) => apiClient.put<App>(`/apps/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/apps/${id}`),
};

// Evaluation Metrics API
export const metricsApi = {
  getByApp: (appId: string) => apiClient.get<EvaluationMetric[]>(`/apps/${appId}/metrics`),
  getQueryPerformance: (appId: string, params?: any) =>
    apiClient.get<QueryPerformance[]>(`/apps/${appId}/performance`, { params }),
  getRelevanceScores: (appId: string, params?: any) =>
    apiClient.get<RelevanceScore[]>(`/apps/${appId}/relevance`, { params }),
};

// Alerts API
export const alertsApi = {
  getAll: (params?: any) => apiClient.get<PaginatedResponse<Alert>>('/alerts', { params }),
  getByApp: (appId: string, params?: any) =>
    apiClient.get<PaginatedResponse<Alert>>(`/apps/${appId}/alerts`, { params }),
  create: (data: Partial<Alert>) => apiClient.post<Alert>('/alerts', data),
  resolve: (id: string) => apiClient.patch<Alert>(`/alerts/${id}/resolve`, {}),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/alerts/${id}`),
};

// Alert Rules API
export const alertRulesApi = {
  getAll: (params?: any) => apiClient.get<PaginatedResponse<AlertRule>>('/alert-rules', { params }),
  getByApp: (appId: string) => apiClient.get<AlertRule[]>(`/apps/${appId}/alert-rules`),
  create: (data: Partial<AlertRule>) => apiClient.post<AlertRule>('/alert-rules', data),
  update: (id: string, data: Partial<AlertRule>) =>
    apiClient.put<AlertRule>(`/alert-rules/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/alert-rules/${id}`),
};

// Query Logs API
export const queryLogsApi = {
  getByApp: (appId: string, params?: any) =>
    apiClient.get<PaginatedResponse<QueryLog>>(`/apps/${appId}/query-logs`, { params }),
  getById: (appId: string, queryId: string) =>
    apiClient.get<QueryLog>(`/apps/${appId}/query-logs/${queryId}`),
};

// Benchmarks API
export const benchmarksApi = {
  getAll: (params?: any) => apiClient.get<PaginatedResponse<Benchmark>>('/benchmarks', { params }),
  getById: (id: string) => apiClient.get<Benchmark>(`/benchmarks/${id}`),
  create: (data: Partial<Benchmark>) => apiClient.post<Benchmark>('/benchmarks', data),
  update: (id: string, data: Partial<Benchmark>) =>
    apiClient.put<Benchmark>(`/benchmarks/${id}`, data),
  delete: (id: string) => apiClient.delete<{ success: boolean }>(`/benchmarks/${id}`),
  compare: (appIds: string[]) =>
    apiClient.post<Benchmark[]>('/benchmarks/compare', { appIds }),
};

// Governance API
export const governanceApi = {
  getPolicies: (params?: any) =>
    apiClient.get<PaginatedResponse<GovernancePolicy>>('/governance/policies', { params }),
  getPolicyById: (id: string) => apiClient.get<GovernancePolicy>(`/governance/policies/${id}`),
  createPolicy: (data: Partial<GovernancePolicy>) =>
    apiClient.post<GovernancePolicy>('/governance/policies', data),
  updatePolicy: (id: string, data: Partial<GovernancePolicy>) =>
    apiClient.put<GovernancePolicy>(`/governance/policies/${id}`, data),
  deletePolicy: (id: string) =>
    apiClient.delete<{ success: boolean }>(`/governance/policies/${id}`),
};

// Health Check API
export const healthApi = {
  check: () => apiClient.get<{ status: string }>('/health'),
};
