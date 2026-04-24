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
  
  // User & Session Information (REQUIRED for user distribution metrics)
  userId: string; // User identifier - REQUIRED for recordsPerUser calculation
  sessionId?: string; // Session identifier for grouping related queries
  
  // Raw Input Data (REQUIRED for latency calculation)
  userPrompt: string; // User's original query/prompt
  context?: string; // Retrieved documents/context provided to LLM
  llmResponse: string; // LLM's response
  
  // Timestamps (REQUIRED for latency & throughput)
  promptTimestamp: Date; // When user submitted prompt
  contextRetrievalStartTime?: Date; // When context retrieval started
  contextRetrievalEndTime?: Date; // When context retrieval ended
  llmRequestStartTime: Date; // When LLM request was sent
  llmResponseEndTime: Date; // When LLM response was received (includes streaming)
  recordCreatedTime: Date; // When record was created in system
  
  // RAGA Framework Metrics (All 5 core metrics - REQUIRED)
  ragaMetrics: {
    // 1. Faithfulness: Is the response grounded in the provided context?
    // Range: 0-100 (%)
    // Calculation: (Number of statements in response grounded in context) / (Total statements in response) * 100
    faithfulness: number; // 0-100: % of response grounded in context
    
    // 2. Answer Relevancy: How relevant is the answer to the user's question?
    // Range: 0-100 (%)
    // Calculation: Cosine similarity between answer and question embeddings
    answerRelevancy: number; // 0-100: % of relevance to user question
    
    // 3. Context Precision: Is the retrieved context relevant to the question?
    // Range: 0-100 (%)
    // Calculation: (Number of relevant context chunks) / (Total context chunks) * 100
    contextPrecision: number; // 0-100: % of context relevant to question
    
    // 4. Context Recall: Did we retrieve all relevant information?
    // Range: 0-100 (%)
    // Calculation: (Number of retrieved relevant chunks) / (Total relevant chunks in corpus) * 100
    contextRecall: number; // 0-100: % of relevant context retrieved
    
    // 5. Correctness: Is the answer factually correct?
    // Range: 0-100 (%)
    // Calculation: Manual or LLM-based evaluation against ground truth
    correctness: number; // 0-100: % factual correctness
  };
  
  // Additional Evaluation Metrics
  otherMetrics?: {
    coherenceScore?: number; // 0-100: Response coherence
    similarityScore?: number; // 0-100: Similarity to ground truth
    summaryScore?: number; // 0-100: Summarization quality if applicable
    [key: string]: number | undefined;
  };
  
  // Latency Metrics (CALCULATED from timestamps)
  latencyMetrics: {
    // Total end-to-end latency (ms) from prompt submission to response completion
    totalLatencyMs: number; // promptTimestamp → llmResponseEndTime
    
    // Context retrieval latency (ms)
    contextRetrievalLatencyMs?: number; // contextRetrievalStartTime → contextRetrievalEndTime
    
    // LLM processing latency (ms)
    llmProcessingLatencyMs: number; // llmRequestStartTime → llmResponseEndTime
    
    // Time-to-first-token (ms) - important for streaming responses
    timeToFirstTokenMs?: number; // llmRequestStartTime → first token received
  };
  
  // Throughput Supporting Data
  contextChunkCount: number; // Number of context chunks/documents used
  contextTotalLengthWords: number; // Total words in all context chunks
  promptLengthWords: number; // Number of words in prompt
  responseLengthWords: number; // Number of words in response
  
  // Token Information (for token counting)
  estimatedPromptTokens?: number; // Approximate tokens in prompt (words / 0.75)
  estimatedContextTokens?: number; // Approximate tokens in context
  estimatedResponseTokens?: number; // Approximate tokens in response
  
  // Processing Status & Quality
  rawData: Record<string, unknown>; // Original unprocessed data
  processedMetrics: {
    [key: string]: unknown;
  };
  
  dataQuality: {
    completeFields: string[];
    missingFields: string[];
    validationStatus: 'valid' | 'partial' | 'invalid';
    allRagaMetricsAvailable: boolean; // TRUE only if ALL 5 RAGA metrics are captured
  };
  
  // Metadata
  metadata: {
    ingestionDate: Date;
    processingDate?: Date;
    sourceType: 'local_folder' | 'azure_blob' | 'database' | 'splunk' | 'datadog' | 'api';
    checksum?: string;
    isDuplicate: boolean;
    evaluationFramework?: string; // e.g., "ragas", "custom", "manual"
    evaluationFrameworkVersion?: string;
  };
  
  ingestionJobId?: string;
  sourceFile?: string;
  
  // Audit Trail
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

/**
 * Alert Record - Tracks SLA deviations at row and aggregated level
 * Supports full lifecycle: open → acknowledged → dismissed
 * Includes audit trail with user comments
 */
export interface Alert {
  _id?: string;
  alertId: string;
  applicationId: string;
  
  // Alert Level (row-level or app-level aggregation)
  alertLevel: 'row' | 'aggregated';
  sourceRecordId?: string; // If row-level, reference to rawdatarecords
  
  // Alert Details
  metricName: string; // e.g., "faithfulness", "answer_relevancy"
  actualValue: number; // e.g., 65 (percentage)
  slaThreshold: number; // e.g., 70 (the "good" threshold for this app)
  deviation: number; // % by which actual falls below threshold
  
  // Status Management
  status: 'open' | 'acknowledged' | 'dismissed';
  acknowledgedAt?: Date;
  dismissedAt?: Date;
  acknowledgedBy?: string; // User who acknowledged
  dismissedBy?: string; // User who dismissed
  userComment?: string; // Comment when closing alert
  
  // Audit & Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Governance Metrics - Calculated metrics per application
 * Aggregated daily/weekly/monthly for trend analysis
 * Includes all calculable metrics from available data
 */
export interface GovernanceMetrics {
  _id?: string;
  applicationId: string;
  applicationName: string;
  
  // Period Configuration
  period: 'daily' | 'weekly' | 'monthly';
  periodDate: Date; // Date of the period (e.g., 2024-01-15 for daily)
  
  // Calculable Metrics from Raw Data
  totalTokensUsed: number; // Approximated: (prompt_words + response_words) / 0.75
  avgResponseLatency: number; // milliseconds (from timestamps if available)
  throughputQueriesPerMin: number; // Records processed per minute
  p95Latency: number; // 95th percentile latency in ms
  errorRate: number; // % of failed/invalid records
  
  // SLA Compliance Metrics
  complianceRate: number; // % of records meeting all SLA thresholds
  slaDeviationRate: number; // % of records deviating from SLA
  
  // Content Metrics
  avgPromptLength: number; // Average words in prompt
  avgContextLength: number; // Average words in context
  avgResponseLength: number; // Average words in response
  
  // User Distribution
  uniqueUsers: number; // Count of distinct userIds
  recordsPerUser: number; // Average records per user
  
  // Per-Metric Compliance
  metricCompliance: {
    [metricName: string]: number; // e.g., "faithfulness": 78.5 (% of records meeting threshold)
  };
  
  // Trend Analysis
  previousPeriodMetrics?: {
    complianceRate?: number;
    throughputQueriesPerMin?: number;
    avgResponseLatency?: number;
    errorRate?: number;
  };
  
  trend: {
    complianceRateTrend: 'up' | 'down' | 'stable'; // Up=improving, Down=degrading
    latencyTrend: 'up' | 'down' | 'stable'; // Down=improving (lower latency better)
    errorRateTrend: 'up' | 'down' | 'stable'; // Down=improving (lower error rate better)
  };
  
  // Metadata
  calculatedAt: Date;
  createdAt: Date;
}
