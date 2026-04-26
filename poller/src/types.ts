// Database Connection Types
export interface DatabaseConnection {
  connectionId: string;
  applicationId: string;
  connectionName: string;
  type: 'postgresql' | 'mysql' | 'mssql' | 'azure_sql';
  server: string;
  port: number;
  database: string;
  authType: 'username_password' | 'managed_identity' | 'connection_string';
  credentials: {
    keyVaultReference: string;
  };
  isConnected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Schema Mapping Types
export interface ColumnMappings {
  prompt: string;
  context?: string;
  response: string;
  userId?: string;
  timestamp?: string;
}

export interface DatabaseSchemaMapping {
  mappingId: string;
  applicationId: string;
  connectionId: string;
  tableName: string;
  columnMappings: ColumnMappings;
  columnTypes: Record<string, string>;
  pollingConfig: {
    isEnabled: boolean;
    intervalMinutes: number;
    lastPolledAt?: Date;
    nextPollAt?: Date;
    recordsPerPoll: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Polling State - tracks high-water mark
export interface PollingState {
  _id?: string;
  applicationId: string;
  connectionId: string;
  mappingId: string;
  lastSeenId: number;
  lastPolledAt: Date;
  recordsProcessed: number;
  status: 'active' | 'failed' | 'paused';
  lastError?: string;
  retryCount: number;
  nextRetryAt?: Date;
  updatedAt: Date;
}

// Raw Data Record - what we upsert into MongoDB
export interface RawDataRecord {
  _id?: string;
  applicationId: string;
  connectionId: string;
  mappingId: string;
  sourceId: number | string; // Original ID from source database
  userId?: string;
  sessionId?: string;
  
  // Core Data
  prompt: string;
  context?: string;
  response: string;
  userPrompt?: string;
  llmResponse?: string;

  // Timing Fields - for AI Activity Governance (ISO 8601 timestamps)
  promptTimestamp?: Date; // When the request was received
  contextRetrievalStartTime?: Date; // When context retrieval began
  contextRetrievalEndTime?: Date; // When context retrieval completed
  llmRequestStartTime?: Date; // When LLM request was sent
  llmResponseEndTime?: Date; // When LLM response was received

  // Calculated Latencies (in milliseconds)
  retrievalLatencyMs?: number; // contextRetrievalEndTime - contextRetrievalStartTime
  llmLatencyMs?: number; // llmResponseEndTime - llmRequestStartTime
  totalLatencyMs?: number; // llmResponseEndTime - promptTimestamp

  // Token & Content Metrics
  contextChunkCount?: number; // Number of retrieved context chunks
  contextTotalLengthWords?: number; // Total words in context
  promptLengthWords?: number; // Words in user prompt
  responseLengthWords?: number; // Words in response
  
  // Estimated Token Counts (for cost & governance tracking)
  promptTokenCount?: number; // Estimated request tokens (~ promptLengthWords / 0.75)
  responseTokenCount?: number; // Estimated response tokens (~ responseLengthWords / 0.75)
  totalTokenCount?: number; // Total tokens used

  // Status & Metadata
  status?: 'success' | 'error' | 'timeout' | 'partial';
  errorMessage?: string;
  
  timestamp?: Date;
  fetchedAt: Date;
  updatedAt: Date;
}

// Polling Config from environment
export interface PollingConfig {
  mongoDbUrl: string;
  postgresHost: string;
  postgresPort: number;
  postgresUser: string;
  postgresPassword: string;
  postgresDatabase: string;
  pollIntervalMinutes: number;
  batchSize: number;
  maxRetries: number;
  backoffMultiplier: number;
  initialBackoffMs: number;
  logLevel: string;
  filterApplicationId?: string;
  shutdownTimeoutSeconds: number;
  azureKeyVaultUrl?: string;
  azureTenantId?: string;
  azureClientId?: string;
  azureClientSecret?: string;
}

// Polling Result
export interface PollingResult {
  applicationId: string;
  recordsFetched: number;
  recordsUpserted: number;
  errors: string[];
  lastSeenId: number;
  durationMs: number;
  timestamp: Date;
}
