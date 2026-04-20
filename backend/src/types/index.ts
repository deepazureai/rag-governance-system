// Shared types for backend services

export interface MetricThreshold {
  critical: number;
  warning: number;
  healthy?: number;
}

export interface AlertThresholdConfig {
  id: string;
  appId: string;
  groundedness: MetricThreshold;
  relevance: MetricThreshold;
  contextPrecision: MetricThreshold;
  contextRecall: MetricThreshold;
  answerRelevancy: MetricThreshold;
  coherence: MetricThreshold;
  faithfulness: MetricThreshold;
  successRate: MetricThreshold;
  latency: MetricThreshold;
  tokenEfficiency: MetricThreshold;
  errorRate: MetricThreshold;
  createdAt: string;
  updatedAt: string;
  isCustom: boolean;
}

export const INDUSTRY_STANDARD_THRESHOLDS: AlertThresholdConfig = {
  id: 'industry-default',
  appId: 'global-default',
  groundedness: { critical: 70, warning: 80, healthy: 85 },
  relevance: { critical: 75, warning: 85, healthy: 90 },
  contextPrecision: { critical: 70, warning: 80, healthy: 85 },
  contextRecall: { critical: 75, warning: 85, healthy: 90 },
  answerRelevancy: { critical: 70, warning: 80, healthy: 85 },
  coherence: { critical: 75, warning: 85, healthy: 90 },
  faithfulness: { critical: 70, warning: 80, healthy: 85 },
  successRate: { critical: 90, warning: 95, healthy: 98 },
  latency: { critical: 5000, warning: 3000, healthy: 2000 },
  tokenEfficiency: { critical: 2000, warning: 1500, healthy: 1000 },
  errorRate: { critical: 10, warning: 5, healthy: 2 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  isCustom: false,
};

export interface Alert {
  id: string;
  appId: string;
  ruleId?: string;
  metricName: string;
  message: string;
  severity: 'critical' | 'warning' | 'healthy';
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  metricValue: number;
  threshold: number;
}

export type NotificationChannelType = 'email' | 'webhook' | 'slack' | 'teams';

export interface NotificationChannel {
  id: string;
  name: string;
  type: NotificationChannelType;
  enabled: boolean;
  emailConfig?: {
    provider: 'smtp' | 'sendgrid' | 'mailgun';
    recipientEmails: string[];
    smtpHost?: string;
    smtpPort?: number;
    fromEmail: string;
  };
  webhookConfig?: {
    url: string;
    apiKey?: string;
    headers?: Record<string, string>;
    timeout: number;
  };
  slackConfig?: {
    webhookUrl: string;
    channel: string;
  };
  teamsConfig?: {
    webhookUrl: string;
  };
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
  testStatus?: 'success' | 'failed' | 'pending';
}

export interface NotificationRule {
  id: string;
  appId: string;
  name: string;
  enabled: boolean;
  triggerOn: 'critical' | 'warning' | 'both';
  metricNames?: string[];
  channelIds: string[];
  includeMetricValue: boolean;
  includeThreshold: boolean;
  includeRecommendation: boolean;
  customMessage?: string;
  maxNotificationsPerHour: number;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  alertId: string;
  appId: string;
  channelType: NotificationChannelType;
  channelId: string;
  message: string;
  subject?: string;
  status: 'sent' | 'failed' | 'pending' | 'retrying';
  attempts: number;
  lastAttemptAt: string;
  sentAt?: string;
  errorMessage?: string;
  errorCode?: string;
  webhookResponse?: {
    statusCode?: number;
    responseBody?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface NotificationPayload {
  alertId: string;
  appId: string;
  appName: string;
  metricName: string;
  severity: 'critical' | 'warning';
  metricValue: number;
  threshold: number;
  message: string;
  timestamp: string;
  dashboardLink: string;
}
