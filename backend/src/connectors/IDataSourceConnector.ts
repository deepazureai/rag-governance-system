export interface RawDataRecord {
  // User & Session Information
  userId?: string;
  sessionId?: string;

  // Core Data
  query: string;
  response: string;
  context?: string;
  userPrompt?: string;
  llmResponse?: string;
  retrievedDocuments?: Array<{
    content: string;
    source?: string;
    relevance?: number;
  }>;

  // Timing Fields - for AI Activity Governance (milliseconds or ISO timestamps)
  promptTimestamp?: string; // When the request was received (ISO 8601)
  contextRetrievalStartTime?: string; // When context retrieval began
  contextRetrievalEndTime?: string; // When context retrieval completed
  llmRequestStartTime?: string; // When LLM request was sent
  llmResponseEndTime?: string; // When LLM response was received

  // Calculated Latencies (in milliseconds)
  retrievalLatencyMs?: number;
  llmLatencyMs?: number;
  totalLatencyMs?: number;

  // Token & Content Metrics
  contextChunkCount?: number; // Number of retrieved context chunks
  contextTotalLengthWords?: number; // Total words in context
  promptLengthWords?: number; // Words in user prompt
  responseLengthWords?: number; // Words in response
  
  // Estimated Token Counts (for cost & governance tracking)
  promptTokenCount?: number; // Estimated request tokens
  responseTokenCount?: number; // Estimated response tokens
  totalTokenCount?: number; // Total tokens used

  // Status & Metadata
  status?: 'success' | 'error' | 'timeout' | 'partial';
  errorMessage?: string;
  timestamp?: string;
  
  // Generic catch-all for additional fields
  [key: string]: any;
}

export interface IDataSourceConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  fetchRawData(): Promise<RawDataRecord[]>;
  testConnection(): Promise<boolean>;
  getMetadata(): Promise<{
    recordCount?: number;
    lastModified?: Date;
    sourceInfo: string;
  }>;
}
