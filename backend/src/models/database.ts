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
}

/**
 * Database Connection Configuration
 * Stores credentials and connection details for database sources
 * Credentials are encrypted and referenced via KeyVault
 */
export interface DatabaseConnection {
  _id?: string;
  connectionId: string; // Unique identifier for this connection
  applicationId: string; // Linked to ApplicationMaster
  connectionName: string; // User-friendly name (e.g., "Production DB", "Analytics DB")
  
  // Connection Type
  type: 'postgresql' | 'mysql' | 'mssql' | 'azure_sql' | 'oracle' | 'dynamodb';
  
  // Connection Details (server info)
  server: string; // Database server hostname/IP
  port: number; // Database port
  database: string; // Database name
  
  // Authentication - stored as reference to KeyVault
  authType: 'username_password' | 'managed_identity' | 'connection_string';
  credentials: {
    keyVaultReference: string; // Reference to encrypted secret in KeyVault/environment
    credentialType: 'username_password' | 'managed_identity' | 'connection_string';
    encryptedAt?: Date;
  };
  
  // Connection Status
  isConnected: boolean;
  lastTestedAt?: Date;
  testStatus?: 'success' | 'failed';
  testError?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database Schema Mapping
 * Maps database table columns to standard evaluation record fields
 * Enables generic data fetching from any database
 */
export interface DatabaseSchemaMapping {
  _id?: string;
  mappingId: string; // Unique identifier
  applicationId: string; // Linked to ApplicationMaster
  connectionId: string; // References DatabaseConnection
  
  // Table Configuration
  tableName: string; // Name of the table to fetch from
  
  // Column Mappings (field name → column name)
  columnMappings: {
    prompt: string; // Column containing user prompt/query
    context?: string; // Column containing context/documents (optional)
    response: string; // Column containing LLM response
    userId?: string; // Column containing user identifier (optional)
    timestamp?: string; // Column containing record timestamp (optional)
  };
  
  // Column Type Information (auto-detected)
  columnTypes: {
    [columnName: string]: string; // e.g., { "prompt": "TEXT", "response": "VARCHAR", "user_id": "INT" }
  };
  
  // Polling Configuration (for data ingestion service)
  pollingConfig: {
    isEnabled: boolean;
    intervalMinutes: number; // How often to poll for new data (default: 60)
    lastPolledAt?: Date;
    nextPollAt?: Date;
    recordsPerPoll: number; // Max records to fetch per poll (default: 1000)
  };
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
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

/**
 * Application SLA Configuration - Per-application benchmark settings
 * Each application can have unique thresholds based on business requirements
 * Linked to ApplicationMaster via applicationId as partition key
 */
export interface ApplicationSLA {
  _id?: string;
  applicationId: string; // Partition key linking to ApplicationMaster
  applicationName: string;
  
  // Metric-specific thresholds (% values: 0-100)
  metrics: {
    faithfulness: {
      excellent: number; // >=this is excellent
      good: number;      // >=this is good, <excellent is yellow
      poor: number;      // <this is poor (red)
    };
    answer_relevancy: {
      excellent: number;
      good: number;
      poor: number;
    };
    context_relevancy: {
      excellent: number;
      good: number;
      poor: number;
    };
    context_precision: {
      excellent: number;
      good: number;
      poor: number;
    };
    context_recall: {
      excellent: number;
      good: number;
      poor: number;
    };
    correctness: {
      excellent: number;
      good: number;
      poor: number;
    };
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
