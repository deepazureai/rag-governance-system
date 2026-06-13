# Chat Message Persistence & KB Prompts Implementation

## Overview

Implemented complete chat message persistence and properly integrated KB Prompts storage for the Knowledge Base Chat feature.

## Problems Fixed

### 1. Chat Messages Not Persisted
**Issue**: Chat threads were created with names, but individual chat messages were not being stored in MongoDB.
- Users couldn't retrieve conversation history
- Each chat session lost message context on page refresh
- No way to audit what was discussed in each KB Chat thread

**Root Cause**: The TODO comment on line 789-792 of knowledgeBaseRoutes.ts indicated the feature was not implemented, even though all the infrastructure (RAGSession model and RAGSessionManager service) existed.

### 2. KB Prompts Storage Incomplete
**Issue**: When users clicked "Confirm Badge" in KB Chat, the prompt was shown as being transferred to BA Review Queue, but full integration was missing.

**Infrastructure Status**:
- ✅ KBPrompt MongoDB model existed
- ✅ KBPromptService with full CRUD operations existed
- ✅ Badge endpoint was saving to kbprompts collection
- ⚠️ Not fully utilizing KBPromptService abstraction
- ⚠️ Missing error handling refinement

## Implementation

### Data Model

**RAGSession Collection** (parent-child relationship):
```
{
  _id: ObjectId,
  applicationId: string,          // app-{appId}
  sessionId: string,              // UUID for this thread
  sessionName: string,            // "Risk Bot 2", "Risk Audit", etc.
  
  // Chat History (the key addition)
  chatHistory: [
    {
      role: 'user' | 'assistant',
      content: string,
      timestamp: Date
    },
    ...
  ],
  
  // Statistics
  totalQueries: number,           // count of user messages
  totalTokensUsed: number,        // cumulative LLM tokens
  totalChunks: number,            // from embeddings
  
  // File References
  uploadedFileNames: [string],
  vectorStoreId: string,
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastAccessedAt: Date,
  isActive: boolean
}
```

**KBPrompt Collection** (separate collection):
```
{
  _id: ObjectId,
  applicationId: string,
  ragSessionId: string,           // reference to RAGSession
  
  // Query & Response
  userQuery: string,
  llmGeneratedResponse: string,
  contextRetrieved: [
    { source, content, relevanceScore },
    ...
  ],
  
  // Badge Status
  badgeStatus: 'approved' | 'pending' | 'rejected',
  badgedAt: Date,
  badgedBy: string,
  badgeNotes: string,
  
  // Metadata
  embeddingModelUsed: string,
  rating: number,                 // 1-5
  userNotes: string,
  
  createdAt: Date,
  updatedAt: Date
}
```

### Backend Endpoints

#### Chat with Persistence
**POST** `/api/knowledge-base/chat`
```json
Request:
{
  "applicationId": "app_1781185720214_c2m6vhq5e",
  "threadId": "uuid-for-thread",
  "userMessage": "What is risk identification?",
  "temperature": 0.7,
  "maxTokens": 500
}

Response:
{
  "success": true,
  "data": {
    "userMessage": "...",
    "assistantMessage": "...",
    "contextUsed": [...],
    "tokensUsed": 250,
    "timestamp": "2026-06-13T17:33:42Z"
  }
}
```

**Key Changes**:
- Line 789-812: Now saves user and assistant messages to RAGSession.chatHistory
- Non-fatal error handling: if session save fails, response still returned to user
- Updates token usage statistics for analytics

#### Retrieve Chat History
**GET** `/api/knowledge-base/chat/:threadId/history?limit=50`

```json
Response:
{
  "success": true,
  "data": {
    "threadId": "uuid-for-thread",
    "chatHistory": [
      {
        "role": "user",
        "content": "What is risk identification?",
        "timestamp": "2026-06-13T17:33:42Z"
      },
      {
        "role": "assistant",
        "content": "Risk identification is...",
        "timestamp": "2026-06-13T17:33:44Z"
      },
      ...
    ],
    "count": 15
  }
}
```

#### Session Statistics
**GET** `/api/knowledge-base/chat/:threadId/stats`

```json
Response:
{
  "success": true,
  "data": {
    "sessionId": "uuid-for-thread",
    "totalChunks": 45,
    "totalQueries": 12,
    "totalTokensUsed": 3450,
    "uploadedFilesCount": 3,
    "chatHistoryLength": 12,
    "sessionAgeHours": 2,
    "createdAt": "2026-06-13T15:33:42Z",
    "updatedAt": "2026-06-13T17:33:44Z"
  }
}
```

#### Badge KB Prompt
**POST** `/api/knowledge-base/prompts/badge`

```json
Request:
{
  "applicationId": "app_1781185720214_c2m6vhq5e",
  "userQuery": "What is risk identification?",
  "llmGeneratedResponse": "Risk identification is...",
  "contextRetrieved": [
    {
      "source": "Context Chunk.pdf",
      "content": "...",
      "relevanceScore": 0.92
    }
  ],
  "embeddingModelUsed": "text-embedding-3-large",
  "ragSessionId": "uuid-for-session",
  "badgeNotes": "High quality response",
  "badgedBy": "analyst@company.com"
}

Response:
{
  "success": true,
  "data": {
    "_id": "ObjectId",
    "applicationId": "app_...",
    "badgeStatus": "approved",
    "badgedAt": "2026-06-13T17:33:42Z",
    ...
  }
}
```

### Services Updated

**RAGSessionManager** (already existed, now used):
- `addChatMessage(sessionId, role, content)` - Appends message to chatHistory
- `getChatHistory(sessionId, limit)` - Retrieves last N messages
- `updateTokenUsage(sessionId, tokensUsed)` - Increments totalTokensUsed
- `getSessionStats(sessionId)` - Computes statistics

**KBPromptService** (already existed, properly integrated):
- `saveKBPrompt()` - Creates new KB prompt record
- `listKBPrompts()` - Lists all prompts for application
- `badgeKBPrompt()` - Updates badge status
- `getQualityStats()` - Computes quality metrics

## Frontend Integration Points

### In Knowledge Base Chat Component

1. **When creating a new chat**:
   - Create a new RAGSession with a UUID `threadId`
   - Store thread name in UI state

2. **When sending a message**:
   - POST to `/chat` with `threadId`
   - Response includes assistant message
   - Messages automatically persisted by backend

3. **When viewing chat history** (future feature):
   - GET `/chat/:threadId/history`
   - Render all messages from chatHistory array

4. **When confirming badge**:
   - POST to `/prompts/badge` with all context
   - System stores to `kbprompts` collection
   - Available in BA Review Queue

## Data Flow

### Save Flow
```
User sends message in KB Chat
    ↓
Frontend: POST /chat { applicationId, threadId, userMessage }
    ↓
Backend: Execute RAG query pipeline
    ↓
Backend: Save user message to RAGSession.chatHistory
    ↓
Backend: Save assistant response to RAGSession.chatHistory
    ↓
Backend: Increment RAGSession.totalQueries & totalTokensUsed
    ↓
Return response with message + context to frontend
```

### Retrieve Flow
```
Frontend: GET /chat/:threadId/history
    ↓
Backend: Query RAGSession by sessionId
    ↓
Return chatHistory array (last N messages)
    ↓
Frontend: Render conversation in chronological order
```

### Badge Flow
```
User clicks "Confirm Badge" in KB Chat
    ↓
Frontend: POST /prompts/badge { applicationId, userQuery, response, context, ... }
    ↓
Backend: Validate all required fields
    ↓
Backend: Lookup KB/LLM config ObjectId
    ↓
Backend: Insert record into kbprompts collection
    ↓
Backend: Return prompt ID
    ↓
Frontend: Show confirmation with BA Review Queue link
    ↓
BA Dashboard: GET /kb-prompts/approved → displays in BA Review Queue tab
```

## Testing Scenarios

### Test 1: Chat Persistence
1. Open KB Chat, start new thread "Test Thread"
2. Send message: "What is risk identification?"
3. Receive response with context
4. Refresh page
5. Verify: GET `/chat/:threadId/history` shows both messages
6. ✅ Chat history survives page refresh

### Test 2: Multiple Documents
1. Upload 3 documents to knowledge base
2. Start new thread
3. Send 5 different questions
4. Verify: Each response retrieves different context
5. Verify: chatHistory shows all 5 exchanges
6. ✅ Multiple uploads maintain separate embeddings

### Test 3: Badge Prompt
1. Get quality response in KB Chat
2. Click "Confirm Badge"
3. Submit to BA Review Queue
4. Verify: POST `/prompts/badge` succeeds
5. Check BA Dashboard → Review Queue → KB Prompts tab
6. ✅ Prompt appears in BA Review Queue

### Test 4: Session Statistics
1. Create thread, send 10 messages
2. GET `/chat/:threadId/stats`
3. Verify: totalQueries = 10, chatHistoryLength = 10
4. ✅ Statistics accurately reflect session activity

## Migration Notes

- Existing chat threads: Create RAGSession records for each thread found in application
- Existing badged prompts: Already in `kbprompts` collection from previous implementation
- Chat messages: Initialize empty chatHistory array for existing sessions

## Future Enhancements

1. **Export Chat**: Download conversation as PDF/JSON
2. **Chat Search**: Full-text search within thread history
3. **Session Replay**: Replay conversation with same context
4. **Analytics**: Dashboard of most common questions per app
5. **Chat Versioning**: Track LLM model changes across session

## Architecture Summary

```
Knowledge Base Chat (Frontend)
    ↓
POST /chat, GET /history, GET /stats (Backend APIs)
    ↓
RAGSessionManager (Service Layer)
    ↓
RAGSession Collection (MongoDB - chat history)
    ↓
KBPromptService (Service Layer)
    ↓
KBPrompt Collection (MongoDB - badged prompts)
```

**Separation of Concerns**:
- **RAGSession**: Stores conversation flow for a thread (many messages per session)
- **KBPrompt**: Stores quality-reviewed responses for BA analysis (many sessions → few prompts to badge)
- Each prompt can reference multiple messages from a session via `ragSessionId`
