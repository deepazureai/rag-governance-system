export type DataSourceType = 'database' | 'azure-logs' | 'azure-blob' | 'splunk' | 'datadog';

export interface BaseDataSourceConfig {
  id: string;
  appId: string;
  name: string;
  type: DataSourceType;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseConfig extends BaseDataSourceConfig {
  type: 'database';
  config: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string; // encrypted server-side
    sslEnabled: boolean;
    connectionTimeout?: number;
  };
}

export interface AzureLogsConfig extends BaseDataSourceConfig {
  type: 'azure-logs';
  config: {
    workspaceId: string;
    primaryKey: string; // encrypted server-side
    tableName: string;
    query?: string;
  };
}

export interface AzureBlobConfig extends BaseDataSourceConfig {
  type: 'azure-blob';
  config: {
    storageAccountName: string;
    containerName: string;
    accountKey: string; // encrypted server-side
    folderPath?: string;
    filePattern?: string;
  };
}

export interface SplunkConfig extends BaseDataSourceConfig {
  type: 'splunk';
  config: {
    host: string;
    port: number;
    username: string;
    password: string; // encrypted server-side
    index: string;
    searchQuery?: string;
    sslEnabled: boolean;
  };
}

export interface DatadogConfig extends BaseDataSourceConfig {
  type: 'datadog';
  config: {
    apiKey: string; // encrypted server-side
    appKey: string; // encrypted server-side
    datadogSite: 'US1' | 'US3' | 'EU1' | 'US1_FED';
    query?: string;
  };
}

export type DataSourceConfig =
  | DatabaseConfig
  | AzureLogsConfig
  | AzureBlobConfig
  | SplunkConfig
  | DatadogConfig;

export interface DataSourceTestResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface DataSourceMetrics {
  prompt: string;
  context: string;
  response: string;
  metadata: string;
}

export interface DataSourceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
