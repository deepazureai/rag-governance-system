# RAG + Hallucination Detection System Guide

## Overview

This system provides a complete RAG (Retrieval-Augmented Generation) pipeline combined with Azure OpenAI-powered LLM-as-Judge hallucination detection. It enables:

1. **Document Vectorization & Storage** - Upload PDFs, CSVs, JSON, TXT files
2. **Hybrid Search** - Semantic + metadata-filtered retrieval
3. **Response Validation** - Check LLM responses against knowledge base
4. **Hallucination Detection** - Identify missing prompts elements causing false claims
5. **Prompt Improvement** - Get concrete suggestions to improve groundedness from 40% to 80%

## Architecture

### Backend Services

**VectorStoreService** (`src/services/VectorStoreService.ts`)
- Manages ChromaDB vector database
- Performs similarity search with relevance scoring
- Hybrid search with metadata filtering
- Batch operations support

**DocumentProcessorService** (`src/services/DocumentProcessorService.ts`)
- Parses PDF, TXT, JSON, CSV files
- Smart paragraph-aware chunking (respects boundaries)
- Text cleaning and normalization
- Key term extraction for metadata

**HallucinationDetectionService** (`src/services/HallucinationDetectionService.ts`)
- Azure OpenAI LLM-as-Judge integration
- Analyzes hallucinations with root cause reasoning
- Identifies missing prompt contexts
- Suggests concrete prompt improvements
- Estimates groundedness score increases

**KnowledgeBase Routes** (`src/api/knowledgeBaseRoutes.ts`)
- 4 RESTful endpoints for RAG operations
- File upload with vectorization
- Search and validation APIs
- Statistics and monitoring

## API Endpoints

### 1. Upload & Vectorize Documents

**POST** `/api/knowledge-base/upload`

Upload and vectorize documents for a specific application.

**Request:**
```bash
curl -X POST http://localhost:5001/api/knowledge-base/upload \
  -F "files=@document1.pdf" \
  -F "files=@document2.txt" \
  -F "applicationId=app-123" \
  -F "namespace=default"
```

**Response:**
```json
{
  "uploadedAt": "2024-01-15T10:30:00Z",
  "applicationId": "app-123",
  "namespace": "default",
  "totalChunksCreated": 145,
  "results": [
    {
      "filename": "document1.pdf",
      "status": "success",
      "chunksCreated": 95,
      "keyTerms": ["groundedness", "validation", "evaluation", "quality", "scoring"]
    },
    {
      "filename": "document2.txt",
      "status": "success",
      "chunksCreated": 50,
      "keyTerms": ["retrieval", "context", "semantic", "search"]
    }
  ]
}
```

### 2. Search Knowledge Base

**POST** `/api/knowledge-base/search`

Perform hybrid search across uploaded documents.

**Request:**
```json
{
  "applicationId": "app-123",
  "query": "How to improve groundedness in RAG systems?",
  "k": 5,
  "filters": {
    "namespace": "default"
  }
}
```

**Response:**
```json
{
  "query": "How to improve groundedness in RAG systems?",
  "applicationId": "app-123",
  "resultsCount": 5,
  "results": [
    {
      "id": 0,
      "content": "Groundedness is a key metric for evaluating RAG systems...",
      "relevanceScore": 0.94,
      "source": "groundedness-guide.pdf",
      "keyTerms": ["metric", "evaluation", "rag"],
      "chunkIndex": 2
    }
  ]
}
```

### 3. Validate Response Against Knowledge Base

**POST** `/api/knowledge-base/validate-response`

Check if an LLM response is grounded in the knowledge base.

**Request:**
```json
{
  "applicationId": "app-123",
  "userPrompt": "What are best practices for RAG evaluation?",
  "llmResponse": "RAG systems should focus on groundedness, relevance, and factuality metrics. Always cite source documents.",
  "topK": 3
}
```

**Response:**
```json
{
  "applicationId": "app-123",
  "validationResults": {
    "timestamp": "2024-01-15T10:35:00Z",
    "groundednessScore": 82,
    "llmTerms": ["rag", "systems", "groundedness", "relevance"],
    "matchedTerms": ["rag", "groundedness", "relevance"],
    "interpretation": "Response is well-grounded in knowledge base",
    "supportingDocuments": [
      {
        "id": 0,
        "preview": "RAG evaluation focuses on three main dimensions: groundedness, relevance, and factuality...",
        "relevance": 94,
        "source": "rag-evaluation.pdf"
      }
    ]
  }
}
```

### 4. Knowledge Base Statistics

**GET** `/api/knowledge-base/stats/:applicationId`

Get KB statistics for an application.

**Response:**
```json
{
  "applicationId": "app-123",
  "collectionName": "app-app-123",
  "documentCount": 2,
  "timestamp": "2024-01-15T10:40:00Z"
}
```

## Hallucination Detection Endpoints

### 1. End-to-End Evaluation Pipeline

**POST** `/api/evaluation/end-to-end`

Complete analysis: hallucination detection → prompt analysis → improvement suggestions.

**Request:**
```json
{
  "sourceDocuments": [
    "Company policy on data handling: All customer data must be encrypted at rest and in transit.",
    "Security guidelines: Multi-factor authentication is required for all admin accounts."
  ],
  "userPrompt": "What are our company's security requirements?",
  "llmResponse": "Your company requires all employees to use VPNs on all devices.",
  "targetGroundedness": 80
}
```

**Response:**
```json
{
  "hallucinationDetectionResult": {
    "groundednessScore": 35,
    "hallucinationDetected": true,
    "hallucinatedClaims": [
      {
        "claim": "All employees must use VPNs on all devices",
        "isGrounded": false,
        "reasoning": "Not mentioned in provided source documents. This appears to be a fabrication."
      }
    ]
  },
  "promptAnalysis": {
    "missingContexts": [
      "No instruction to cite specific policies",
      "No guidance on what constitutes security requirements"
    ],
    "incompleteElements": [
      "Prompt doesn't specify which security domains to cover",
      "No output format defined for compliance"
    ]
  },
  "improvementSuggestions": [
    {
      "priority": "CRITICAL",
      "issue": "Prompt doesn't mandate source citation",
      "currentGroundedness": 35,
      "suggestedGroundedness": 60,
      "suggestion": "Add explicit instruction to cite policies"
    },
    {
      "priority": "HIGH",
      "issue": "No specification of covered topics",
      "currentGroundedness": 60,
      "suggestedGroundedness": 80,
      "suggestion": "List specific security domains: authentication, encryption, data handling"
    }
  ],
  "improvedPrompt": "Based on the following company policies, describe our security requirements. You MUST cite the specific policy for each requirement:\n\n[Policies listed]\n\nCover these areas: authentication, encryption, data handling, access control."
}
```

## Chunking Strategy

### Smart Paragraph-Aware Chunking

The system respects document structure:

1. **Split by Paragraphs First** - Preserves semantic boundaries
2. **Configurable Chunk Size** - Default 1000 characters
3. **Overlap Window** - Default 200 characters for context preservation
4. **Metadata Attachment** - Each chunk includes source, chunk index, position

**Example:**
- Document: 5000 characters
- Chunk Size: 1000 characters
- Overlap: 200 characters
- Result: ~6 chunks with overlapping context

## Embedding & Vectorization

### Azure OpenAI Embeddings

- **Model**: text-embedding-ada-002 (configurable)
- **Dimension**: 1536
- **Cost**: Economical for large-scale document processing

### Hybrid Search

Combines:
1. **Semantic Similarity** - Vector similarity with cosine distance
2. **Metadata Filtering** - Filters by source, namespace, tags
3. **Relevance Scoring** - Combined score from both approaches

**Relevance Score Calculation:**
```
combined_score = (vector_similarity * 0.7) + (metadata_match_bonus * 0.3)
```

## Configuration

### Environment Variables

```bash
# Azure OpenAI for LLM-as-Judge and Embeddings
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_ID=gpt-4
AZURE_OPENAI_API_VERSION=2024-02-15-preview

# MongoDB for metrics storage
MONGODB_URI=mongodb://admin:password@mongodb:27017/rag-evaluation

# Feature Flags
DEEPEVAL_ENABLED=true
HALLUCINATION_DETECTION_ENABLED=true
```

### VectorStore Persistence

- **Location**: `./data/vectorstore/` (relative to project root)
- **Storage**: Local ChromaDB with persistent file storage
- **Collections**: Organized by application ID (e.g., `app-123`)

## Usage Example: Complete Workflow

### 1. Create Application

```bash
curl -X POST http://localhost:5001/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Support Bot",
    "description": "AI assistant for customer support"
  }'
# Returns: { applicationId: "app-456" }
```

### 2. Upload Knowledge Base

```bash
# Upload company policies, FAQs, guides
curl -X POST http://localhost:5001/api/knowledge-base/upload \
  -F "files=@company-policies.pdf" \
  -F "files=@faq.txt" \
  -F "files=@guides.json" \
  -F "applicationId=app-456"
```

### 3. Test Prompt & Response

```bash
curl -X POST http://localhost:5001/api/knowledge-base/validate-response \
  -H "Content-Type: application/json" \
  -d '{
    "applicationId": "app-456",
    "userPrompt": "What should I do if I forget my password?",
    "llmResponse": "Contact our support team at support@company.com or visit https://help.company.com/password-reset",
    "topK": 3
  }'
```

### 4. Detect Hallucinations & Get Suggestions

```bash
curl -X POST http://localhost:5001/api/evaluation/end-to-end \
  -H "Content-Type: application/json" \
  -d '{
    "sourceDocuments": ["docs from KB"],
    "userPrompt": "What is our refund policy?",
    "llmResponse": "We offer full refunds within 30 days",
    "targetGroundedness": 80
  }'
```

### 5. Monitor Results

- Dashboard shows groundedness scores
- Knowledge Base tab displays validation results
- Prompt Template page shows improvement suggestions

## Performance Considerations

### Chunking Performance

- **Small documents** (<10KB): Single chunk
- **Medium documents** (10-100KB): 5-50 chunks  
- **Large documents** (>100KB): 50+ chunks
- **Chunk overlap**: Increases storage ~20% but improves retrieval quality

### Search Performance

- **First search**: ~500ms (includes ChromaDB initialization)
- **Subsequent searches**: ~100-200ms
- **Batch searches** (10 queries): ~1-2 seconds

### Embedding Performance

- **Text embedding**: ~50ms per 1000 tokens
- **Batch embeddings**: ~5-10ms per document
- **Cache hits**: Significant performance improvement for repeated queries

## Best Practices

### 1. Document Preparation

- **Format**: PDF > TXT > JSON > CSV (preference order)
- **Size**: Ideal chunk size 500-2000 characters
- **Clarity**: Well-structured documents with clear sections improve retrieval

### 2. Prompt Engineering

- **Specificity**: Detailed prompts get better groundedness
- **Source Citation**: Explicitly require citations
- **Format Definition**: Specify expected output format
- **Error Handling**: Include fallback responses for OOB queries

### 3. Validation

- Use Knowledge Base validation before deploying prompts
- Aim for 80%+ groundedness score
- Review hallucinatedClaims to identify prompt gaps
- Implement suggested improvements and re-test

### 4. Monitoring

- Track groundedness scores over time
- Monitor hallucination detection results
- Adjust prompts based on system recommendations
- Archive KB changes for audit trail

## Troubleshooting

### Issue: No Results from Search

**Causes:**
- Knowledge base is empty
- Query terms don't match document content
- Collection not initialized

**Solution:**
- Verify documents uploaded successfully
- Try broader search terms
- Check `/api/knowledge-base/stats/:appId` for document count

### Issue: Low Groundedness Scores

**Causes:**
- Prompt lacks citation requirements
- Missing relevant context in knowledge base
- Output format not specified

**Solution:**
- Use improvement suggestions from hallucination detection
- Upload more comprehensive KB documents
- Update prompts based on system recommendations

### Issue: Slow Search Performance

**Causes:**
- Large document collection
- Complex metadata filters
- Network latency

**Solution:**
- Use namespace filtering to reduce search scope
- Increase chunk overlap sparingly
- Consider embedding cache for repeated queries

## Next Steps

1. **Configure Azure OpenAI** with your API key and deployment
2. **Upload sample knowledge base documents** via file upload
3. **Test hallucination detection** with sample prompts
4. **Integrate into prompt validation workflow** in UI
5. **Monitor metrics** in governance dashboard
6. **Iterate prompt improvements** based on system feedback
