# MongoDB Chat Storage Upgrade - Comprehensive Message Persistence

## Overview
This upgrade implements a complete data persistence layer for KB Chat conversations with full context tracking, token consumption, timing metrics, and audit trails. Every message is stored with complete context details against the composite key of `applicationId + threadId`.

## Data Model Updates

### ChatMessage Schema (Enhanced)
```typescript
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;                    // The actual message text
  timestamp: Date;                    // When message was created
  messageId: string;                  // UUID for unique identification
  
  // Context for responses
  contextRetrieved?: ContextDetail[]; // Sources used for AI response
  
  // Token tracking
  tokensUsed?: number;                // LLM tokens consumed
  
  // Performance metrics (milliseconds)
  embeddingTime?: number;             // Time to generate embeddings
  searchTime?: number;                // Time to search Chroma DB
  llmCallTime?: number;               // Time for full pipeline
  
  // Custom data
  metadata?: Record<string, unknown>; // App-specific fields
}
```

### ContextDetail Schema
```typescript
interface ContextDetail {
  source: string;                     // Filename of document
  documentId?: string;                // MongoDB document ID
  chunkId?: string;                   // Chunk within document
  relevanceScore: number;             // Similarity search score (0-1)
  content?: string;                   // Context snippet text
}
```

### RAGSession Collection (Extended)
The `RAGSession` collection stores:
- **sessionId**: UUID (unique)
- **applicationId**: Application reference (indexed)
- **sessionName**: User-friendly thread name ("Risk Bot", "Risk Audit", etc.)
- **chatHistory**: Array of ChatMessage objects (new enhanced schema)
- **totalTokensUsed**: Cumulative LLM tokens
- **totalQueries**: User message count
- **uploadedFileNames**: Documents in this session
- **totalChunks**: Embeddings stored
- **createdAt, updatedAt, lastAccessedAt**: Timestamps

**Composite Index**: `(applicationId, isActive)` for fast queries

## API Endpoints

### 1. POST /api/knowledge-base/chat
**Store new message in chat history**

Request:
```json
{
  "applicationId": "app_123",
  "threadId": "uuid-of-thread",
  "userMessage": "What is risk identification?",
  "temperature": 0.7,
  "maxTokens": 2000
}
```

Response (includes execution timing):
```json
{
  "success": true,
  "data": {
    "applicationId": "app_123",
    "threadId": "uuid-of-thread",
    "userMessage": "What is risk identification?",
    "assistantMessage": "Risk identification is...",
    "contextUsed": [
      {
        "source": "Context-Chunk.pdf",
        "documentId": "doc-xyz",
        "chunkId": "chunk-1",
        "relevanceScore": 0.92,
        "content": "Risk identification is the process..."
      }
    ],
    "tokensUsed": 245,
    "executionTimeMs": 3421,
    "timestamp": "2026-06-14T10:30:45.123Z"
  }
}
```

**Persistence Details:**
- User message saved with metadata (model config, temperature)
- Assistant response saved with:
  - Full context array from Chroma search
  - Token count for LLM call
  - Total pipeline execution time
  - Embedding model info
  - Context quality metrics

### 2. GET /api/knowledge-base/chat/:threadId/full
**Fetch complete chat history with all context details**

Request:
```
GET /api/knowledge-base/chat/thread-uuid/full?limit=50
```

Response (fully enriched):
```json
{
  "success": true,
  "data": {
    "threadId": "thread-uuid",
    "sessionName": "Risk Bot",
    "applicationId": "app_123",
    "createdAt": "2026-06-13T10:00:00Z",
    "lastAccessedAt": "2026-06-14T10:30:00Z",
    "statistics": {
      "totalMessages": 12,
      "totalTokensUsed": 3450,
      "totalQueries": 6,
      "uploadedFiles": ["Context-Chunk.pdf", "Risk-Framework.pdf"],
      "totalChunks": 24
    },
    "chatHistory": [
      {
        "id": "msg-uuid-1",
        "role": "user",
        "content": "What is risk identification?",
        "timestamp": "2026-06-14T10:30:00Z",
        "tokensUsed": 0,
        "contextRetrieved": [],
        "timing": {
          "embeddingTime": 0,
          "searchTime": 0,
          "llmCallTime": 0
        },
        "metadata": {
          "model": "gpt-4",
          "temperature": 0.7,
          "maxTokens": 2000
        }
      },
      {
        "id": "msg-uuid-2",
        "role": "assistant",
        "content": "Risk identification is the process of structured risk management...",
        "timestamp": "2026-06-14T10:30:03Z",
        "tokensUsed": 245,
        "contextRetrieved": [
          {
            "source": "Context-Chunk.pdf",
            "documentId": "doc-abc123",
            "chunkId": "chunk-1",
            "relevanceScore": 0.92,
            "contentPreview": "Risk identification is the process of structured..."
          }
        ],
        "timing": {
          "embeddingTime": 542,
          "searchTime": 230,
          "llmCallTime": 1650
        },
        "metadata": {
          "searchResultsCount": 3,
          "embeddingModel": "text-embedding-3-large",
          "contextQuality": "high"
        }
      }
    ],
    "count": 12
  }
}
```

### 3. GET /api/knowledge-base/chat/:threadId/history
**Fetch simplified message-only history**

Request:
```
GET /api/knowledge-base/chat/thread-uuid/history?limit=20
```

Response:
```json
{
  "success": true,
  "data": {
    "threadId": "thread-uuid",
    "chatHistory": [
      {
        "role": "user",
        "content": "What is risk?",
        "timestamp": "2026-06-14T10:30:00Z"
      },
      {
        "role": "assistant",
        "content": "Risk is...",
        "timestamp": "2026-06-14T10:30:03Z"
      }
    ],
    "count": 2
  }
}
```

### 4. GET /api/knowledge-base/chat/:threadId/stats
**Fetch session statistics only**

Response:
```json
{
  "success": true,
  "data": {
    "sessionId": "thread-uuid",
    "totalChunks": 24,
    "totalQueries": 6,
    "totalTokensUsed": 3450,
    "uploadedFilesCount": 2,
    "chatHistoryLength": 12,
    "createdAt": "2026-06-13T10:00:00Z",
    "updatedAt": "2026-06-14T10:30:00Z",
    "sessionAgeHours": 24
  }
}
```

## CRUD Operations in RAGSessionManager

### Create Session
```typescript
const session = await ragSessionManager.createSession({
  applicationId: 'app_123',
  sessionName: 'Risk Bot',
  description: 'Discussion about risk identification',
  embeddingModel: 'text-embedding-3-large',
  embeddingProvider: 'azure-openai',
  llmProvider: 'azure-openai',
  llmModel: 'gpt-4',
});
```

### Add Message with Full Context
```typescript
await ragSessionManager.addChatMessage(
  threadId,
  'assistant',
  'Risk identification is...',
  {
    contextRetrieved: [
      {
        source: 'Context-Chunk.pdf',
        documentId: 'doc-id',
        chunkId: 'chunk-1',
        relevanceScore: 0.92,
        content: 'Risk identification...'
      }
    ],
    tokensUsed: 245,
    embeddingTime: 542,
    searchTime: 230,
    llmCallTime: 1650,
    metadata: {
      searchResultsCount: 3,
      embeddingModel: 'text-embedding-3-large',
      contextQuality: 'high'
    }
  }
);
```

### Fetch Chat History
```typescript
const history = await ragSessionManager.getChatHistory(threadId, 50);
// Returns last 50 messages
```

### Get Session Details
```typescript
const session = await ragSessionManager.getSession(threadId);
// Full session with all metadata and complete chatHistory array
```

### Update Token Usage
```typescript
await ragSessionManager.updateTokenUsage(threadId, 245);
// Increments totalTokensUsed by 245
```

### Get Session Statistics
```typescript
const stats = await ragSessionManager.getSessionStats(threadId);
// Returns: totalChunks, totalQueries, totalTokensUsed, uploadedFilesCount, etc.
```

## Usage Flow - End-to-End

### User Opens Chat Thread
```typescript
// Frontend calls:
GET /api/knowledge-base/chat/thread-uuid/full?limit=50

// Backend:
1. Fetches RAGSession from MongoDB
2. Returns sessionName, statistics, and enriched chatHistory
3. Frontend displays conversation with all context
```

### User Sends New Message
```typescript
// Frontend calls:
POST /api/knowledge-base/chat {
  applicationId: 'app_123',
  threadId: 'thread-uuid',
  userMessage: 'Follow-up question?'
}

// Backend:
1. Embeds user message (user message saved with metadata)
2. Searches Chroma DB for context chunks
3. Calls LLM with context and prompt
4. Saves assistant response with:
   - Full context array (source, doc ID, chunk ID, relevance score)
   - Token count consumed
   - Execution timing (embedding, search, LLM call)
   - Model configuration metadata
5. Returns response + execution metrics
6. MongoDB updated with new messages
```

### User Continues Conversation
```typescript
// Repeat above - each message appends to chatHistory array
// Total tokens accumulate in totalTokensUsed
// All messages linked via composite key (applicationId + threadId)
```

## Data Integrity & Queries

### Key MongoDB Queries
```javascript
// Get all threads for an application
db.ragsessions.find({ 
  applicationId: 'app_123',
  isActive: true
}).sort({ lastAccessedAt: -1 })

// Get specific thread with all messages
db.ragsessions.findOne({ 
  sessionId: 'thread-uuid'
})

// Get thread messages for date range
db.ragsessions.findOne(
  { sessionId: 'thread-uuid' },
  { chatHistory: { $slice: [-20] } }  // Last 20 messages
)

// Calculate total tokens for billing
db.ragsessions.aggregate([
  { $match: { applicationId: 'app_123' } },
  { $group: { _id: null, totalTokens: { $sum: '$totalTokensUsed' } } }
])
```

### Indexes for Performance
- `(applicationId, isActive)` - Fetch active threads
- `(applicationId, lastAccessedAt)` - Recent threads
- `sessionId` - Direct thread lookup

## Benefits

1. **Complete Audit Trail**: Every interaction logged with timestamps and context
2. **Source Attribution**: Know exactly which documents informed each response
3. **Token Tracking**: Monitor Azure AI usage per session and user
4. **Performance Metrics**: Embedding, search, and LLM timings for optimization
5. **Session Persistence**: Full conversation history preserved indefinitely
6. **Flexible Metadata**: Extensible schema for custom application data
7. **Composite Keys**: Query by application+thread efficiently
8. **Soft Deletes**: Archive sessions without data loss

## Migration Notes

- Existing `RAGSession` records work with new schema
- New `chatHistory` entries will have full details
- `messageId` auto-generated for new messages
- Token tracking starts from this upgrade
- Timing metrics available from this upgrade forward
- Backward compatible with existing API calls
