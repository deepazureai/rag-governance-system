# Phase 4: PostgreSQL Connector Service Implementation

## Overview
Phase 4 implements a **scalable, asynchronous PostgreSQL Connector Service** that fetches data from external PostgreSQL databases and inserts it into the MongoDB `rawdatarecords` collection. The architecture is designed to handle **millions of records** efficiently.

## Architecture & Key Features

### 1. **Connection Pooling**
- Uses `pg` library with connection pool (max 20 connections, min 2)
- Connection timeout: 30 seconds
- Query timeout: 60 seconds per query
- Prevents connection exhaustion for large datasets

### 2. **Pagination for Scalability**
- Fetches records in pages of 500 rows (configurable `FETCH_PAGE_SIZE`)
- Total record count is calculated upfront with `COUNT(*)`
- Each page is processed independently, allowing for graceful handling of failures

### 3. **Batch Insertion to MongoDB**
- Inserts 1000 records at a time (configurable `BATCH_SIZE`)
- Uses `insertMany` with `ordered: false` to continue on errors
- Maintains insertion statistics: total, inserted, failed records

### 4. **Column Mapping**
Automatically maps PostgreSQL table columns to evaluation data fields using the `columnMapping` stored in `dbconnections` collection:
- `userIdColumn` → `userId`
- `promptColumn` → `userPrompt` and `query`
- `contextColumn` → `context`
- `responseColumn` → `llmResponse` and `response`
- Timestamp columns map to: `promptTimestamp`, `contextRetrievalStartTime`, `contextRetrievalEndTime`, `llmRequestStartTime`, `llmResponseEndTime`
- Metric columns: `contextChunkCount`, `contextTotalLengthWords`, `promptLengthWords`, `responseLengthWords`

### 5. **Error Handling & Logging**
- Comprehensive try-catch blocks at each phase
- Logging at connection, fetch, batch insert, and completion levels
- Graceful degradation: errors in one batch don't stop the entire process
- Detailed statistics on failed records

### 6. **Asynchronous Processing**
- Non-blocking execution with `setImmediate()` between pages
- Allows event loop to process other tasks
- Returns immediately from endpoint; processing happens in background

## Implementation Files

### Backend Services
1. **`/backend/src/services/PostgreSQLConnectorService.ts`** (334 lines)
   - `fetchAndInsertData()` - Main method for scalable data fetching and insertion
   - `testConnection()` - Test database connectivity before batch processing
   - `getTableSchema()` - Retrieve table metadata
   - `normalizePostgreSQLRow()` - Transform PostgreSQL rows using column mapping

### Backend Routes
2. **`/backend/src/api/batchProcessingRoutes.ts`** (Enhanced)
   - `POST /api/batch/database/execute` - Trigger database batch processing
   - `POST /api/batch/database/test-connection` - Test database connection

### Backend Services (Enhanced)
3. **`/backend/src/services/BatchProcessingService.ts`** (Enhanced)
   - `triggerEvaluationPipeline()` - New method to trigger evaluation for already-inserted raw data
   - Reuses evaluation, governance, and alert generation logic

### Frontend Client
4. **`/src/api/batchClient.ts`** (Enhanced)
   - `executeDatabaseBatch()` - Call database batch endpoint
   - `testDatabaseConnection()` - Test connection before batch

### Frontend UI (Enhanced)
5. **`/src/components/settings/batch-processing-tab.tsx`** (Enhanced)
   - Filters applications to show only `dataSourceType: 'database'`
   - Calls `executeDatabaseBatch()` with `applicationId` and `dataSourceId`
   - Displays batch statistics: total, inserted, failed records, success rate

## Data Flow

```
1. UI (Phase 6) → User selects database-connected app and clicks "Execute"
                   ↓
2. Frontend → POST /api/batch/database/execute with applicationId & dataSourceId
                   ↓
3. Backend API → Fetch dbconnection config from MongoDB
                   ↓
4. PostgreSQL Connector Service
   ├─ Create connection pool
   ├─ Get total record count
   ├─ Fetch pages of records (500 at a time)
   ├─ Normalize each record using column mapping
   ├─ Batch insert to MongoDB rawdatarecords (1000 at a time)
   └─ Return statistics
                   ↓
5. Backend API → Trigger triggerEvaluationPipeline()
                   ├─ Fetch raw data from MongoDB
                   ├─ Evaluate using MultiFrameworkEvaluator
                   ├─ Calculate governance metrics
                   ├─ Generate alerts
                   └─ Update application master
                   ↓
6. Frontend → Display batch statistics and success message
```

## Database Connection Configuration

Data stored in MongoDB `dbconnections` collection:
```javascript
{
  id: "dbconn_1234567890_abc123",
  applicationId: "app_xyz",
  connectionName: "postgresql - localhost:5432/mydb",
  sourceType: "postgresql",
  config: {
    host: "localhost",
    port: 5432,
    database: "mydb",
    tableName: "evaluation_records",
    username: "dbuser",
    password: "encrypted_password",
    ssl: false
  },
  columnMapping: {
    userIdColumn: "user_id",
    promptColumn: "user_prompt",
    contextColumn: "context",
    responseColumn: "llm_response",
    promptTimestampColumn: "prompt_timestamp",
    contextRetrievalStartTimeColumn: "context_retrieval_start_time",
    contextRetrievalEndTimeColumn: "context_retrieval_end_time",
    llmRequestStartTimeColumn: "llm_request_start_time",
    llmResponseEndTimeColumn: "llm_response_end_time",
    contextChunkCountColumn: "context_chunk_count",
    contextTotalLengthWordsColumn: "context_total_length_words",
    promptLengthWordsColumn: "prompt_length_words",
    responseLengthWordsColumn: "response_length_words",
    statusColumn: "status"
  },
  isActive: true,
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Connection Pool Size | 20 max, 2 min | Balanced for concurrent requests |
| Page Size | 500 rows | Memory-efficient |
| Batch Insert Size | 1000 records | MongoDB optimal batch size |
| Query Timeout | 60s | Per-query timeout for safety |
| Connection Timeout | 30s | Initial connection timeout |

### Scalability Examples
- **100K records**: ~200 queries + 100 batch inserts = ~2-3 minutes
- **1M records**: ~2000 queries + 1000 batch inserts = ~20-30 minutes
- **10M records**: ~20000 queries + 10000 batch inserts = ~3-5 hours

*Times vary based on network latency and row size*

## Error Handling Strategy

1. **Connection Errors**: Return error immediately, no retry
2. **Page Fetch Errors**: Log, skip page, continue to next
3. **Row Transformation Errors**: Count as failed record, continue
4. **Batch Insert Errors**: Log individual failures, continue
5. **Evaluation Pipeline Errors**: Log, don't fail batch process

## Security Considerations

1. **Password Encryption**: Passwords should be encrypted before storage (TODO in code)
2. **Connection Pooling**: Prevents connection exhaustion attacks
3. **Timeout Protection**: Query and connection timeouts prevent hung requests
4. **Input Validation**: Column names are used directly in SQL (TODO: parameterize table/column names)

## Future Enhancements

1. **Resume Capability**: Track processed records, allow resume on failure
2. **Incremental Sync**: Only fetch new records since last sync
3. **Data Validation**: Pre-check column names and types
4. **Compression**: Compress data between PostgreSQL and MongoDB
5. **Distributed Processing**: Multiple workers for different page ranges
6. **Database Support**: Extend to MySQL, SQL Server, etc.

## Testing the Connector

### Test Connection
```bash
POST /api/batch/database/test-connection
{
  "dataSourceId": "dbconn_1234567890_abc123"
}
```

### Execute Batch
```bash
POST /api/batch/database/execute
{
  "applicationId": "app_xyz",
  "dataSourceId": "dbconn_1234567890_abc123",
  "sourceType": "database"
}
```

### Response
```javascript
{
  "success": true,
  "message": "Database batch processing started",
  "batchId": "batch_uuid_12345",
  "stats": {
    "totalRecords": 1000000,
    "insertedRecords": 999800,
    "failedRecords": 200,
    "successRate": "99.98%"
  }
}
```

## Integration with Phase 5

Phase 5 will integrate this PostgreSQL Connector Service into the **Batch Processing Service Update**, enabling:
- Scheduled database batch jobs (via ScheduledBatchJobService)
- Automatic triggering of evaluation pipelines
- Monitoring and alerting on batch completion

