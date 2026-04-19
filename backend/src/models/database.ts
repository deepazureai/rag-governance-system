/**
 * Database Models
 * Type definitions for database persistence
 */

export interface EvaluationRecord {
  id: string;
  appId: string;
  query: string;
  response: string;
  frameworkUsed: string;
  frameworkVersion: string;
  metrics: Record<string, number>;
  overallScore: number;
  executionTime: number;
  documentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  rawData?: string; // JSON stringified
}

export interface BatchEvaluationRecord {
  id: string;
  appId: string;
  frameworkUsed: string;
  totalEvaluations: number;
  completedEvaluations: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FrameworkConfigRecord {
  id: string;
  frameworkName: string;
  isEnabled: boolean;
  configuration: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// ============ ENHANCED APPLICATION & METRICS MODELS ============

export interface ApplicationMaster {
  _id?: string;
  id: string;
  name: string;
  description: string;
  owner: string;
  framework: string;
  status: 'active' | 'inactive' | 'archived';
  dataSource: {
    type: 'local_folder' | 'azure_blob' | 'database' | 'splunk' | 'datadog';
    config: LocalFolderConfig | AzureBlobConfig | DatabaseConfig | Record<string, unknown>;
  };
  initialDataProcessingStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  initialDataProcessingError?: string;
  lastDataIngestionDate?: Date;
  metricsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalFolderConfig {
  folderPath: string;
  fileName?: string;
  fileFormat: 'csv' | 'json' | 'semicolon_delimited';
}

export interface AzureBlobConfig {
  storageAccount: string;
  containerName: string;
  blobName?: string;
  connectionString: string; // encrypted
}

export interface DatabaseConfig {
  type: 'sql_server' | 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  table: string;
  username: string;
  password: string; // encrypted
  query?: string; // optional custom query
}

export interface ApplicationMetric {
  _id?: string;
  id: string;
  applicationId: string;
  applicationName: string;
  batchId?: string;
  recordIndex: number;
  rawData: Record<string, unknown>;
  processedMetrics: {
    userPrompt?: string;
    context?: string;
    response?: string;
    userId?: string;
    relevanceScore?: number;
    coherenceScore?: number;
    similarityScore?: number;
    summaryScore?: number;
    customScores?: Record<string, number>;
    [key: string]: unknown;
  };
  evaluationResults?: {
    overallScore: number;
    framework: string;
    frameworkVersion?: string;
    executionTime?: number;
  };
  ingestionJobId?: string;
  sourceFile?: string;
  dataQuality: {
    completeFields: string[];
    missingFields: string[];
    validationStatus: 'valid' | 'partial' | 'invalid';
  };
  metadata: {
    ingestionDate: Date;
    processingDate?: Date;
    sourceType: 'local_folder' | 'azure_blob' | 'database' | 'splunk' | 'datadog';
    checksum?: string;
    isDuplicate: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface DataIngestionJob {
  _id?: string;
  id: string;
  applicationId: string;
  applicationName: string;
  dataSourceType: 'local_folder' | 'azure_blob' | 'database' | 'splunk' | 'datadog';
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'partial';
  startedAt: Date;
  completedAt?: Date;
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  duplicateRecords: number;
  sourceFile?: string;
  sourceQuery?: string;
  errors: Array<{
    recordIndex: number;
    error: string;
    rawData?: unknown;
    timestamp: Date;
  }>;
  processingMetadata: {
    fileSize?: number;
    processingTime?: number;
    averageRecordProcessingTime?: number;
    dataQualityScore?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
