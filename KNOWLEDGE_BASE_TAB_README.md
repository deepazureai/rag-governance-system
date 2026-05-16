# Knowledge Base Tab - Dashboard Feature

## Overview

The Knowledge Base tab is a new dashboard feature that allows testers and developers to upload documents and connect to PostgreSQL databases for semantic + text search. This enables validation of prompt performance by comparing monitoring data with external sources.

## Location

**Dashboard** → Select an application → **Knowledge Base** tab

## Features

### 1. Upload Documents Tab

#### Upload Documents Section
- **Supported Formats**: PDF, TXT, JSON, CSV
- **Max File Size**: 100MB per file
- **Process**: Upload → Extract text → Generate embeddings → Index in ChromaDB
- **Visual Feedback**: Progress bar showing embedding generation status
- **Multiple Files**: Support for batch uploads

#### Connect PostgreSQL Database Section
- **Purpose**: Index specific database tables for semantic search
- **Setup**: Click "Configure PostgreSQL Connection" button
- **Configuration**: 
  - Provide host, port, database, username, password
  - Select specific tables or columns
  - Set optional auto-refresh schedule (daily/weekly)
- **Data Sync**: Manual "Sync Now" button available

#### Active Data Sources
- **Display**: List of all configured document uploads and database connections
- **Metadata Shown**:
  - Source name (filename or table name)
  - Item count (extracted text chunks or rows)
  - Last sync time
  - Current status (Active, Syncing, Failed)
- **Status Indicators**:
  - 🟢 **Active** - Ready to search
  - 🟡 **Syncing** - Currently generating embeddings
  - 🔴 **Failed** - Error during sync, retry available

### 2. Search Knowledge Base Tab

#### Hybrid Search Bar
- **Search Query**: Natural language or keyword search
- **Scope**: Searches across all uploaded documents and connected databases
- **Real-time**: Results appear as you type (with Enter to submit)
- **Combined**: Semantic + full-text search results merged by relevance

#### Search Results Display
- **Result Card Shows**:
  - Result title
  - Excerpt of matching content (line-clamped)
  - Relevance score (0-100%)
  - Source badge (Document, Database, External)
  - File name or table name
  
- **Sorting**: Results ordered by relevance score (highest first)

- **Interaction**:
  - Click a result to see full content
  - Compare with dashboard monitoring data
  - View source file/table reference

#### Search Tips Card
- Best practices for effective searching
- Guidance on natural language queries
- How to combine with debug analysis
- Tips for validation workflows

## Use Cases

### Validation Against Dashboard Data
1. Prompt scores low on "groundedness" in dashboard
2. Click "Knowledge Base" tab
3. Search "groundedness best practices" or "source citations"
4. Compare results with your prompt
5. Identify missing elements or improvements

### Finding Similar Prompts
1. Search for keywords from your prompt
2. Find similar prompts that scored well
3. Compare approach and structure
4. Apply patterns to improve your prompt

### Knowledge Organization
1. Upload company guidelines and best practices
2. Upload sample prompts and their scores
3. Upload customer feedback and issues
4. Use as reference library for testers

## Data Flow

```
User Upload / Database Connection
           ↓
    Parse & Extract
           ↓
   Generate Embeddings (via ChromaDB)
           ↓
    ChromaDB Storage (indexed by app)
           ↓
    Available for Hybrid Search
           ↓
  Results with Relevance Scores
           ↓
Compare with Dashboard & Debug Analysis
```

## Technical Details

### Component Location
- **File**: `/src/components/dashboard/knowledge-base-tab.tsx`
- **Export**: `KnowledgeBaseTab` component
- **Props**: `{ applicationId: string }`

### Dependencies
- `KnowledgeBaseTab` component
- `Card`, `Button`, `Input` UI components
- `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` components
- `Badge` component
- Icons: `Upload`, `Database`, `Search`, `AlertCircle`, `CheckCircle2`, `Loader2`

### State Management
```typescript
// Document sources
const [sources, setSources] = useState<DocumentSource[]>()

// Search
const [searchQuery, setSearchQuery] = useState<string>()
const [searchResults, setSearchResults] = useState<SearchResult[]>()
const [isSearching, setIsSearching] = useState<boolean>()

// Upload
const [uploadProgress, setUploadProgress] = useState<number>()
```

### API Endpoints (To Be Implemented)
- `POST /api/sources/{appId}/upload` - Handle file upload
- `POST /api/sources/{appId}/postgresql` - Configure database connection
- `POST /api/search/{appId}/hybrid` - Hybrid search query
- `GET /api/sources/{appId}` - List configured sources
- `POST /api/sources/{appId}/sync` - Manual sync

## Future Enhancements

- Real-time embedding progress with WebSockets
- Advanced filtering (by date, source type, score range)
- Side-by-side comparison view (search result vs dashboard data)
- Export search results as CSV/PDF
- Search result history and bookmarks
- Custom search operators (e.g., "source:document", "score:>80")
- Full-text search operators (AND, OR, NOT)

## Integration with Other Features

### With Prompt Debugger Service
- When root cause is identified, search knowledge base for solutions
- Compare recommendations with best practices stored in knowledge base

### With Tester Guidance Service
- Knowledge base provides context for real-time suggestions
- Testers see relevant best practices as they type

### With DeepEval Integration
- LLM-As-Judge can reference knowledge base documents
- Scoring criteria can be based on knowledge base standards

