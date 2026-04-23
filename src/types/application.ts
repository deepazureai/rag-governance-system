/**
 * Application and SLA Configuration Types
 * Defines interfaces for application management and per-app SLA settings
 */

export interface ApplicationSLA {
  _id?: string;
  applicationId: string;
  applicationName: string;
  
  // Metric-specific thresholds (% values: 0-100)
  metrics: {
    faithfulness: MetricThresholds;
    answer_relevancy: MetricThresholds;
    context_relevancy: MetricThresholds;
    context_precision: MetricThresholds;
    context_recall: MetricThresholds;
    correctness: MetricThresholds;
  };
  
  // Overall health thresholds
  overallScoreThresholds: {
    excellent: number;
    good: number;
  };
  
  // Metadata
  usesCustomThresholds: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MetricThresholds {
  excellent: number; // >=this is excellent (green)
  good: number;      // >=this is good (yellow)
  poor: number;      // <this is poor (red)
}

export interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  label: string;
  color: 'green' | 'yellow' | 'red';
  percentage: number;
}
