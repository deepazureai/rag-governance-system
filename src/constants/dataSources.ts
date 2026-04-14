import { DataSourceType } from '@/src/types/dataSource';

export const DATA_SOURCE_TYPES: Record<DataSourceType, { label: string; description: string }> = {
  database: {
    label: 'Database',
    description: 'Connect to PostgreSQL, MySQL, SQL Server, or other relational databases',
  },
  'azure-logs': {
    label: 'Azure Log Analytics',
    description: 'Azure Monitor Log Analytics workspace for storing evaluation metrics',
  },
  'azure-blob': {
    label: 'Azure Blob Storage',
    description: 'Azure Blob Storage container for log files and metric data',
  },
  splunk: {
    label: 'Splunk',
    description: 'Splunk Enterprise or Cloud for monitoring and analytics',
  },
  datadog: {
    label: 'Datadog',
    description: 'Datadog platform for monitoring, logging, and analytics',
  },
};

export const METRIC_FIELD_OPTIONS = [
  { value: 'prompt', label: 'Prompt' },
  { value: 'context', label: 'Context' },
  { value: 'response', label: 'Response' },
  { value: 'metadata', label: 'Metadata' },
];

export const SENSITIVE_FIELDS: Record<DataSourceType, string[]> = {
  database: ['password'],
  'azure-logs': ['primaryKey'],
  'azure-blob': ['accountKey'],
  splunk: ['password'],
  datadog: ['apiKey', 'appKey'],
};

export const DB_PORTS = {
  postgres: 5432,
  mysql: 3306,
  sqlserver: 1433,
  mariadb: 3306,
  oracle: 1521,
};

export const SPLUNK_PORTS = {
  default: 8089,
  https: 8089,
};

export const DATADOG_SITES = {
  US1: { label: 'US (US1)', value: 'US1' },
  US3: { label: 'US (US3)', value: 'US3' },
  EU1: { label: 'Europe (EU1)', value: 'EU1' },
  US1_FED: { label: 'US Government (US1-FED)', value: 'US1_FED' },
};
