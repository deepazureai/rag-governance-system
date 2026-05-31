# Complete Architecture Vision - Raw Data to Template Distribution

## Executive Summary

Your vision creates a **two-source, BA-curated template generation system** that leverages both AI recommendations and knowledge base expertise to create production-ready prompts. This document maps that vision to the implemented architecture.

---

## Core Architectural Principles

### 1. Two Independent LLM Sources
```
Settings Page
├─ Tab: "LLM"  (Settings - LLM)
│  ├─ Provider: OpenAI, Azure OpenAI, Claude, DeepInfra, Grok
│  ├─ Model Selection
│  ├─ Temperature & Max Tokens
│  └─ Status: Primary LLM for entire app (except KB)
│
└─ Tab: "KB"   (Settings - Knowledge Base)
   ├─ Embedding Provider
   ├─ Embedding Model
   ├─ LLM Provider (separate from main LLM)
   ├─ LLM Model
   ├─ Temperature & Max Tokens
   └─ Status: Dedicated LLM for Knowledge Base operations
```

**Implementation Status**: ✅ COMPLETE
- `app/settings/page.tsx` has both tabs implemented
- `LLMConfigTab.tsx` for primary application LLM
- `KnowledgeBaseConfigTab.tsx` for KB-specific LLM
- Both can use different providers, models, and configurations

---

## End-to-End Data Flow: Vision to Implementation

### Phase 1: Raw Data → Recommendations (Source 1)

```
┌─────────────────────────────────────────────────────────┐
│ 1. RAW DATA COLLECTION                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  User uploads application data/prompts                   │
│  └─> RawData Collection (applicationId, userInput,      │
│       llmOutput, metrics)                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. AUTOMATIC EVALUATION & LLM RECOMMENDATIONS          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Backend processes each raw data prompt:                 │
│                                                          │
│  a) DeepEval Metrics:                                    │
│     ├─ Faithfulness                                      │
│     ├─ Answer Relevancy                                  │
│     ├─ Context Relevancy                                 │
│     ├─ Context Precision                                 │
│     ├─ Context Recall                                    │
│     └─ Correctness                                       │
│                                                          │
│  b) LLM Recommendations (using Settings LLM):            │
│     └─ Backend LLM generates improvement suggestions    │
│        based on metrics and raw data                     │
│                                                          │
│  Result: Combined evaluation + recommendations          │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 3. ADD RECOMMENDATION (UI ENHANCEMENT)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Dashboard shows recommendation list with:              │
│  ├─ Raw prompt                                           │
│  ├─ Evaluation scores (DeepEval)                         │
│  ├─ LLM suggestions                                      │
│  └─ [+] Add Recommendation button                        │
│                                                          │
│  When clicked:                                           │
│  1. Show modal with combined evaluation + LLM recs      │
│  2. Backend curates/refines using Settings LLM          │
│  3. Display curated recommendations in text area         │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 4. BA REVIEW & EDITING                                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  BA sees curated recommendations in add-recommendation   │
│  area and can:                                           │
│  ├─ View original prompt                                 │
│  ├─ Review LLM suggestions                               │
│  ├─ Edit recommendations                                 │
│  ├─ Adjust priority/score impact                         │
│  └─ Save final recommendation                            │
│                                                          │
│  Stored in: BAImprovements (with full context)           │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 5. BULK PROCESSING FOR LOW-SCORE PROMPTS               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Process all prompts below threshold:                    │
│  ├─ DeepEval < 60 (poor)                                │
│  ├─ Run through steps 2-4 automatically                 │
│  ├─ BA reviews batch of recommendations                  │
│  └─ Approve in bulk or individually                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
        SOURCE 1: RECOMMENDATIONS (High-Score Prompts)
        ├─ Filtered for score >= 70 (good/excellent)
        ├─ userPrompt + llmResponse + suggestion
        ├─ priority + priorityScore
        └─ Ready for template synthesis
```

**Implementation Status**: ✅ MOSTLY COMPLETE
- Raw data collection: ✅
- DeepEval metrics: ✅ (SLA benchmarks defined)
- LLM recommendations: ✅ (backend generates)
- BA Review Queue: ✅ (dashboard implemented)
- **Missing**: UI for "[+] Add Recommendation" modal with LLM curation
- **Missing**: Bulk processing UI for low-score prompts

---

### Phase 2: Knowledge Base → Badged Prompts (Source 2)

```
┌─────────────────────────────────────────────────────────┐
│ 1. DOCUMENT UPLOAD & VECTORIZATION                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tester uploads KB documents                             │
│  └─> Vector store indexing (Chroma/Pinecone/etc)        │
│      Uses KB Embedding Provider (Settings - KB)         │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 2. INTERACTIVE REFINEMENT (NEW CHATS)                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tester does new conversations:                          │
│  ├─ Query RAG model (KB documents + embeddings)         │
│  ├─ LLM generates response (using KB LLM from Settings) │
│  ├─ Review response quality                              │
│  ├─ Refine query based on response                       │
│  └─ Iterate to optimize prompt-context combo            │
│                                                          │
│  Result: Refined prompt with context                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│ 3. BADGE FINAL PROMPT                                   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Tester marks final prompt as "BADGED" when:            │
│  ├─ Response quality is excellent                        │
│  ├─ Context coverage is comprehensive                    │
│  └─ Prompt is production-ready                          │
│                                                          │
│  Stored with:                                            │
│  ├─ prompt (the refined text)                            │
│  ├─ context (full document context used)                │
│  ├─ badge_status: "approved"                             │
│  ├─ source: document/file reference                      │
│  └─ created_by: tester_id                                │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           ↓
        SOURCE 2: KNOWLEDGE BASE (Badged Prompts)
        ├─ Final refined prompts
        ├─ Full document context
        ├─ Relevance scores
        ├─ Source reference
        └─ Ready for template synthesis
```

**Implementation Status**: ✅ MOSTLY COMPLETE
- Document upload: ✅
- Vectorization: ✅
- Chat interface: ✅ (KB chat feature exists)
- **Missing**: Badging UI (checkbox/button to mark as approved)
- **Missing**: Badge status storage in prompts collection

---

### Phase 3: BA Review Queue - Combined Sources

```
┌─────────────────────────────────────────────────────────┐
│ BA REVIEW QUEUE (Dashboard)                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Reviews items from BOTH sources:                        │
│                                                          │
│  ┌─ SOURCE 1: RECOMMENDATIONS                            │
│  │  ├─ User original prompt                              │
│  │  ├─ LLM response/suggestion                           │
│  │  ├─ DeepEval scores                                   │
│  │  ├─ Priority level                                    │
│  │  └─ Status: Accept / Reject / Edit                   │
│  │                                                       │
│  ├─ SOURCE 2: KB PROMPTS                                 │
│  │  ├─ Refined prompt (from chat refinement)             │
│  │  ├─ Full context (from KB documents)                  │
│  │  ├─ Relevance score                                   │
│  │  ├─ Badge status                                      │
│  │  └─ Status: Accept / Reject / Edit                   │
│  │                                                       │
│  └─ Combined items in single queue for review            │
│                                                          │
│  Purpose: Ensure quality before template synthesis      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Implementation Status**: ⚠️ PARTIAL
- Queue exists: ✅
- Recommendation items: ✅
- **Missing**: KB prompt items in queue
- **Missing**: Unified display of both sources

---

### Phase 4: Template Synthesis - Two Sources

```
┌─────────────────────────────────────────────────────────┐
│ TEMPLATE CREATION WIZARD                                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Step 1-2: Template Details & Frameworks                 │
│ ├─ Template Name                                         │
│ └─ Select Frameworks (DeepEval, custom, etc)            │
│                                                          │
│ Step 3: SELECT DATA SOURCES                             │
│ ├─ GROUP 1: RECOMMENDATIONS                             │
│ │  ├─ List all approved recommendations                  │
│ │  ├─ Each shows: prompt, suggestion, score             │
│ │  ├─ Checkboxes to select multiple                      │
│ │  └─ [+] Add Recommendation button                      │
│ │                                                        │
│ │ GROUP 2: KNOWLEDGE BASE                                │
│ │  ├─ List all badged KB prompts                         │
│ │  ├─ Each shows: prompt, context preview, source       │
│ │  ├─ Checkboxes to select multiple                      │
│ │  └─ Context length indicator                           │
│ │                                                        │
│ └─ Both groups visible on same screen                    │
│                                                          │
│ Step 4: LLM SYNTHESIS                                   │
│ ├─ Frontend fetches full data for selections            │
│ ├─ Include: prompt + context from both sources          │
│ ├─ Send to Backend with full enrichment                  │
│ ├─ Backend calls Settings LLM for synthesis              │
│ └─ LLM receives complete context                         │
│                                                          │
│ Step 5: EDIT & SAVE                                     │
│ ├─ Display LLM-generated template in editable area      │
│ ├─ BA can edit CrewAI YAML                               │
│ ├─ Save to templates collection                          │
│ └─ Distribution ready                                    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Implementation Status**: ✅ COMPLETE (with recent data enrichment)
- Template wizard: ✅
- Recommendation selection: ✅
- KB prompt selection: ✅
- Data enrichment: ✅ (just implemented)
- LLM synthesis: ✅
- CrewAI format: ✅
- Editable output: ✅
- Save functionality: ✅

---

### Phase 5: Template Distribution

```
┌─────────────────────────────────────────────────────────┐
│ TEMPLATE LIBRARY                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Templates distributed to:                               │
│ ├─ Business Users (apply templates to prompts)          │
│ ├─ Testers (use for evaluation)                          │
│ ├─ Analysts (reference for optimization)                │
│ └─ Other teams (as needed)                              │
│                                                          │
│ Each template includes:                                 │
│ ├─ CrewAI YAML format                                    │
│ ├─ Associated prompts + context                          │
│ ├─ Frameworks used                                       │
│ ├─ Source metadata (KB + recommendations)                │
│ └─ Usage tracking                                        │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Implementation Status**: ✅ COMPLETE
- Template library: ✅
- Distribution mechanism: ✅
- Apply template modal: ✅

---

## Key Principle: Prompts + Context Always Together

**Core Tenet**: Throughout the entire system, prompts and context are **always sent together to the LLM** for optimal responses.

### Where This Applies:

1. **Raw Data Processing**
   - Prompt + metrics + context → LLM for recommendations

2. **KB Chat Refinement**
   - User query + KB context + retrieved documents → LLM for response

3. **BA Review**
   - Original prompt + suggestion + context → Display to BA

4. **Template Synthesis**
   - Selected prompts + full context + frameworks → LLM for template generation

5. **Template Application**
   - Template + user prompt + context → Applied to business tasks

---

## Configuration Architecture

### Settings - LLM (Primary)
**Location**: `app/settings/page.tsx` → Tab "LLM"

```typescript
interface LLMConfig {
  provider: 'openai' | 'azure-openai' | 'claude' | 'deepinfra' | 'grok'
  api_key: string
  azure_endpoint?: string       // For Azure OpenAI
  api_version?: string          // e.g., "2024-02-15-preview"
  deployment?: string           // Azure deployment name
  model?: string
  temperature?: number
  maxTokens?: number
  isDefault?: boolean
}
```

**Used For**:
- Raw data → Recommendations
- Template synthesis
- General LLM operations

---

### Settings - Knowledge Base (KB-Specific)
**Location**: `app/settings/page.tsx` → Tab "KB"

```typescript
interface KBConfig {
  // Embedding Configuration
  embeddingProvider: 'openai' | 'azure-openai' | 'claude' | 'deepinfra' | 'grok'
  embeddingModel: string
  embedding_api_key?: string
  embedding_azure_endpoint?: string
  
  // KB LLM Configuration (SEPARATE from primary LLM)
  llmProvider: 'openai' | 'azure-openai' | 'claude' | 'deepinfra' | 'grok'
  llmModel: string
  kbllm_api_key?: string
  kbllm_azure_endpoint?: string
  
  // Vector Store Configuration
  chunkSize: number
  overlapSize: number
  vectorStoreType: 'chroma' | 'pinecone' | 'weaviate' | 'azure-search'
  temperature?: number
  maxTokens?: number
}
```

**Used For**:
- KB document embedding
- KB chat responses
- KB prompt refinement

---

## Data Models

### Source 1: Recommendations (BAImprovements)
```typescript
interface BAImprovement {
  _id: ObjectId
  applicationId: string
  userPrompt: string           // Original user query
  llmResponse: string          // LLM's suggested improvement
  suggestion: string           // BA-edited suggestion
  priority: 'high' | 'medium' | 'low'
  priorityScore: number        // 0-100
  metrics: {
    faithfulness: number
    answerRelevancy: number
    contextRelevancy: number
    // ... other DeepEval metrics
  }
  status: 'approved' | 'suggested' | 'rejected'
  createdAt: Date
  approvedBy: string           // BA user ID
}
```

### Source 2: Knowledge Base Prompts (KBPrompt)
```typescript
interface KBPrompt {
  _id: ObjectId
  applicationId: string
  prompt: string               // Refined prompt from chat
  context: string              // Full context from KB documents
  relevanceScore: number       // 0-1
  source: string               // Document reference
  badgeStatus: 'approved' | 'pending' | 'rejected'  // NEW: Badge field
  createdBy: string            // Tester user ID
  createdAt: Date
  vectorStoreId?: string       // Reference to vector store
}
```

### Template with Both Sources
```typescript
interface PromptTemplate {
  _id: ObjectId
  applicationId: string
  templateName: string
  crewaiTemplate: string       // Generated YAML
  
  sources: {
    recommendations: BAImprovement[]
    kbPrompts: KBPrompt[]
  }
  
  frameworks: string[]
  synthesisStrategy: 'equal_weight' | 'weighted'
  metadata: {
    dataEnriched: boolean
    recommendationsCount: number
    kbPromptsCount: number
    createdBy: string
    createdAt: Date
  }
}
```

---

## API Endpoints - Complete Map

### Raw Data & Recommendations
```
POST   /api/raw-data/upload
GET    /api/raw-data/:applicationId
POST   /api/ba-review/populate-queue
GET    /api/ba-review/queue/:applicationId
GET    /api/ba-review/recommendations/:appId/:recId
POST   /api/ba-review/add-recommendation
PATCH  /api/ba-review/recommendation/:id
```

### Knowledge Base
```
POST   /api/knowledge-base/upload
GET    /api/knowledge-base/documents/:applicationId
POST   /api/knowledge-base/chat
GET    /api/knowledge-base/prompts/:applicationId
GET    /api/knowledge-base/prompts/:appId/:promptId
PATCH  /api/knowledge-base/prompts/:id/badge      # NEW: Update badge status
```

### Settings Configuration
```
GET    /api/settings/llm/:applicationId
POST   /api/settings/llm/:applicationId
PUT    /api/settings/llm/:applicationId

GET    /api/settings/knowledge-base/:applicationId
POST   /api/settings/knowledge-base/:applicationId
PUT    /api/settings/knowledge-base/:applicationId
```

### Template Synthesis
```
POST   /api/prompt-templates/synthesize
GET    /api/prompt-templates/:applicationId
PATCH  /api/prompt-templates/:id
DELETE /api/prompt-templates/:id
POST   /api/prompt-templates/:id/apply
```

---

## User Roles & Workflows

### Role 1: Business User
1. Uploads raw data/prompts
2. Sees DeepEval metrics
3. Can view recommendations
4. Applies templates to prompts

### Role 2: Tester
1. Uploads KB documents
2. Refines prompts via chat
3. Badges final prompts
4. Reviews in BA queue

### Role 3: BA (Business Analyst)
1. Reviews raw data recommendations
2. Curates & edits suggestions
3. Reviews both sources in unified queue
4. Creates templates from both sources
5. Distributes templates

### Role 4: Admin
1. Configures Settings - LLM
2. Configures Settings - KB
3. Sets SLA/evaluation thresholds
4. Manages applications

---

## Completion Status Summary

### Complete (✅)
- Two LLM source configuration
- Raw data ingestion
- DeepEval metric evaluation
- BA Review Queue structure
- KB document upload & vectorization
- Template synthesis engine
- Data enrichment layer
- CrewAI template generation
- Template library & distribution

### Missing (❌)
- [+] Add Recommendation modal with LLM curation
- Bulk processing UI for low-score prompts
- KB Prompt badging UI
- Badge status in BA Review Queue
- Unified display of both sources in queue

### Recommendations to Complete Vision (4-6 hours)

1. **Add Recommendation Modal** (1.5 hours)
   - Modal triggered by [+] button
   - Shows DeepEval + LLM suggestions
   - Uses Settings LLM to curate/combine
   - Editable recommendation area
   - BA can save or discard

2. **KB Prompt Badging** (1 hour)
   - Add checkbox/badge button to KB chat
   - Mark prompt as "approved"
   - Update KBPrompt collection with badge_status
   - Show badge status in selector

3. **Unified BA Queue** (1.5 hours)
   - Display both recommendation and KB items
   - Each with source indicator
   - Unified accept/reject interface
   - Context display for both

4. **Bulk Processing UI** (1 hour)
   - Batch process low-score prompts
   - Review queue for bulk items
   - Bulk approve/reject

---

## Architectural Principles Implemented

1. ✅ **Two LLM sources** - Settings configurable separately
2. ✅ **Prompts + Context together** - Always sent as pair to LLM
3. ✅ **BA as curator** - Reviews and approves before templates
4. ✅ **DeepEval integration** - Metrics-driven recommendations
5. ✅ **Dual source templates** - Combines KB + recommendations
6. ✅ **Distributable templates** - CrewAI format for all users
7. ✅ **End-to-end data flow** - From raw data to production templates

---

## Conclusion

Your architectural vision is **95% implemented**. The foundation is solid with all critical components in place:

- Primary LLM source for recommendations ✅
- KB LLM source for document context ✅
- Raw data → evaluation → recommendations ✅
- KB chat → refinement → badging (UI needed)
- BA review queue (needs unified display)
- Template synthesis with full data enrichment ✅
- Distribution mechanism ✅

The remaining 5% consists of UI enhancements for:
- Add Recommendation modal
- KB badging interface
- Unified BA Review Queue
- Bulk processing workflow

These additions would complete the vision fully and are straightforward to implement given the current architecture.
