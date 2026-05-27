# Comprehensive Implementation Plan: LLM Configuration + Recommendations + KB + Prompt Templates

## Executive Summary
This document outlines the complete system architecture for linking LLM configurations, recommendation generation, knowledge base responses, and prompt template creation into a cohesive workflow where each component feeds data to the next.

**Key Principle:** One unified LLM configuration system shared across three services, with outcomes flowing through a pipeline to create prompt templates.

---

## Part 1: Data Flow Architecture

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Application Onboarding                                   │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Settings Tab 1: "LLM Providers" (for Recommendations)         │ │
│ │  - Default: Azure OpenAI (Endpoint, API Key, Deployment)      │ │
│ │  - Alternative: Claude (API Key, Model)                       │ │
│ │  - Alternative: AWS Bedrock (Region, Model)                   │ │
│ │  → Stored in MongoDB: llmconfigs collection                    │ │
│ │                                                                 │ │
│ │ Settings Tab 2: "Embedding & KB LLM" (for Knowledge Base)     │ │
│ │  - Embedding: Azure OpenAI / OpenAI / AWS                      │ │
│ │  - KB-NLP LLM: Azure OpenAI / Claude / AWS (for responses)     │ │
│ │  → Stored in MongoDB: knowledgebaseconfigs collection          │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 2: Raw Data & Recommendations Flow                           │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Dashboard: Raw Data Tab → Click Record → Detail Modal        │ │
│ │  - Fetches LLM config for this app from llmconfigs            │ │
│ │  - User clicks "Get LLM Recommendations"                      │ │
│ │  - POST /api/evaluation/end-to-end with:                      │ │
│ │    * userPrompt, llmResponse, contextRetrieved                │ │
│ │    * llmConfigId (from settings)                              │ │
│ │  - Receives: Improved prompt suggestions                      │ │
│ │  → Stored in: recommendationPrompts collection                │ │
│ │    * Includes: original, suggestions, timestamp, appId        │ │
│ │                                                                 │ │
│ │ User can save this recommendation for later use                │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 3: Knowledge Base Flow                                       │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ User uploads documents to RAG session                         │ │
│ │  - KB Service fetches knowledgebaseconfigs for this app       │ │
│ │  - Uses configured Embedding model to vectorize docs         │ │
│ │  - Stores vectors in vector DB (Chroma/Pinecone)              │ │
│ │                                                                 │ │
│ │ User performs RAG query:                                       │ │
│ │  - Hybrid search returns context                              │ │
│ │  - KB-NLP LLM (from config) generates response                │ │
│ │  - Response includes: query, context, generated answer        │ │
│ │  → Stored in: kbPrompts collection                            │ │
│ │    * Includes: query, context, llmResponse, rating, appId    │ │
│ │                                                                 │ │
│ │ User can save this outcome for prompt template creation       │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STEP 4: Prompt Template Creation (THE LINKING POINT)             │
│ ┌──────────────────────────────────────────────────────────────┐ │
│ │ Settings Tab 3: "Prompt Template Builder"                    │ │
│ │                                                                 │ │
│ │ Source 1: List recommendationPrompts (from raw data)          │ │
│ │  - Shows: Original prompt, Suggestions, Context               │ │
│ │  - User selects 1+ recommendations (checkbox)                 │ │
│ │                                                                 │ │
│ │ Source 2: List kbPrompts (from knowledge base)                │ │
│ │  - Shows: Query, Context, Generated response                  │ │
│ │  - User selects 1+ KB outcomes (checkbox)                     │ │
│ │                                                                 │ │
│ │ Template Refinement:                                           │ │
│ │  - User sees side-by-side view of selected prompts            │ │
│ │  - Writes custom prompt template text                         │ │
│ │  - Clicks "Refine with LLM"                                   │ │
│ │  - POST /api/prompt-templates/refine with:                    │ │
│ │    * Selected recommendations & KB prompts                    │ │
│ │    * Custom template text                                     │ │
│ │    * llmConfigId (from settings)                              │ │
│ │  - LLM generates refined version:                             │ │
│ │    * Consolidates learnings from both sources                 │ │
│ │    * Improves clarity and structure                           │ │
│ │    * Returns: Refined template + usage guide                  │ │
│ │                                                                 │ │
│ │ Template Registration:                                         │ │
│ │  - User reviews refined template                              │ │
│ │  - Saves to promptTemplates collection                        │ │
│ │  → Fields: name, template, sources[], llmConfigUsed, appId    │ │
│ │  - Can download/share with other users                        │ │
│ └──────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 2: Database Schema & Collections

### New/Modified Collections

#### 1. **llmconfigs** (For Recommendations & Prompt Refinement)
```typescript
interface LLMConfig {
  _id?: ObjectId;
  applicationId: string;
  provider: 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';
  
  // Azure OpenAI fields
  azureEndpoint?: string;
  azureApiKey?: string;
  azureDeploymentName?: string;
  azureApiVersion?: string;
  
  // Claude fields
  claudeApiKey?: string;
  claudeModel?: string;
  
  // AWS Bedrock fields
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  bedrockModelId?: string;
  
  // OpenAI fields
  openaiApiKey?: string;
  openaiModel?: string;
  
  // Common fields
  temperature?: number;  // 0-2, default 0.7
  maxTokens?: number;
  topP?: number;
  isDefault?: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 2. **knowledgebaseconfigs** (For KB Embeddings & NLP Response)
```typescript
interface KnowledgeBaseConfig {
  _id?: ObjectId;
  applicationId: string;
  
  // Embedding provider
  embeddingProvider: 'azure-openai' | 'openai' | 'aws-bedrock';
  embeddingAzureEndpoint?: string;
  embeddingAzureApiKey?: string;
  embeddingAzureDeploymentName?: string;
  embeddingOpenaiApiKey?: string;
  embeddingAwsRegion?: string;
  
  // KB NLP LLM (for generating responses from retrieved context)
  kbLlmProvider: 'azure-openai' | 'claude' | 'aws-bedrock' | 'openai';
  kbLlmAzureEndpoint?: string;
  kbLlmAzureApiKey?: string;
  kbLlmAzureDeploymentName?: string;
  kbLlmClaudeApiKey?: string;
  kbLlmAwsRegion?: string;
  kbLlmOpenaiApiKey?: string;
  
  // Vector store config
  vectorStoreType: 'chroma' | 'pinecone' | 'weaviate';
  vectorStoreUrl?: string;
  vectorStoreApiKey?: string;
  
  // Chunking
  chunkSize: number;
  overlapSize: number;
  
  // Processing
  temperature?: number;
  maxTokens?: number;
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 3. **recommendationPrompts** (Outcomes from Raw Data Recommendations)
```typescript
interface RecommendationPrompt {
  _id?: ObjectId;
  applicationId: string;
  recordId: string;  // Link to raw data record
  
  // Original
  originalPrompt: string;
  originalResponse: string;
  context?: string;
  
  // Suggestions from LLM
  suggestions: Array<{
    issue: string;
    suggestion: string;
    expectedImprovement: string;
  }>;
  
  // Metadata
  llmConfigUsed: string;  // ObjectId of llmconfigs
  rating?: number;  // User rating (1-5)
  userNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 4. **kbPrompts** (Outcomes from Knowledge Base Queries)
```typescript
interface KBPrompt {
  _id?: ObjectId;
  applicationId: string;
  ragSessionId: string;  // Link to RAG session
  
  // Query & Response
  userQuery: string;
  contextRetrieved: Array<{
    source: string;
    content: string;
    relevanceScore: number;
  }>;
  llmGeneratedResponse: string;
  
  // Metadata
  embeddingModelUsed: string;
  kbLlmConfigUsed: string;  // ObjectId of knowledgebaseconfigs
  rating?: number;
  userNotes?: string;
  
  createdAt: Date;
  updatedAt: Date;
}
```

#### 5. **promptTemplates** (Final saved templates)
```typescript
interface PromptTemplate {
  _id?: ObjectId;
  applicationId: string;
  
  // Template content
  name: string;
  description?: string;
  templateText: string;
  usageGuide?: string;
  
  // Source tracking
  sourceRecommendationIds: ObjectId[];  // IDs from recommendationPrompts
  sourceKBPromptIds: ObjectId[];  // IDs from kbPrompts
  
  // Refinement info
  llmConfigUsedForRefinement: string;  // ObjectId of llmconfigs
  rawUserInput?: string;  // Before LLM refinement
  llmRefinedOutput?: string;  // After LLM refinement
  
  // Sharing & versioning
  version: number;
  isPublic: boolean;
  tags: string[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;  // userId
}
```

---

## Part 3: API Endpoints (Complete List)

### Settings Management (Backend)

#### LLM Provider Configuration
```
POST /api/llm-config/app/{appId}
  - Save LLM provider config
  - Input: llmconfigs document
  - Output: { success, data: LLMConfig }

GET /api/llm-config/app/{appId}
  - Retrieve current LLM config for app
  - Output: { success, data: LLMConfig }

GET /api/llm-config/providers
  - List available providers and their required fields
  - Output: { success, data: ProviderSchema[] }
```

#### Knowledge Base Configuration
```
POST /api/kb-config/app/{appId}
  - Save KB embedding & LLM config
  - Input: knowledgebaseconfigs document
  - Output: { success, data: KnowledgeBaseConfig }

GET /api/kb-config/app/{appId}
  - Retrieve KB config
  - Output: { success, data: KnowledgeBaseConfig }
```

### Recommendations Management (Backend)

```
POST /api/recommendation-prompts/save
  - Save a recommendation to registry
  - Input: { recordId, rating, userNotes }
  - Output: { success, data: RecommendationPrompt }

GET /api/recommendation-prompts/app/{appId}
  - List all saved recommendations for app
  - Query params: limit, skip, sort
  - Output: { success, data: RecommendationPrompt[], total: number }

GET /api/recommendation-prompts/{id}
  - Get single recommendation
  - Output: { success, data: RecommendationPrompt }

DELETE /api/recommendation-prompts/{id}
  - Delete recommendation
  - Output: { success }
```

### Knowledge Base Prompts Management (Backend)

```
POST /api/kb-prompts/save
  - Save KB query outcome to registry
  - Input: { ragSessionId, rating, userNotes }
  - Output: { success, data: KBPrompt }

GET /api/kb-prompts/app/{appId}
  - List all saved KB prompts
  - Query params: limit, skip, sort
  - Output: { success, data: KBPrompt[], total: number }

GET /api/kb-prompts/{id}
  - Get single KB prompt
  - Output: { success, data: KBPrompt }

DELETE /api/kb-prompts/{id}
  - Delete KB prompt
  - Output: { success }
```

### Prompt Template Management (Backend)

```
POST /api/prompt-templates/refine
  - Refine prompt template using LLM
  - Input: {
      recommendationIds: string[],
      kbPromptIds: string[],
      customTemplateText: string,
      appId: string
    }
  - Output: {
      success,
      data: {
        refinedTemplate: string,
        usageGuide: string,
        recommendations: string[]
      }
    }

POST /api/prompt-templates/save
  - Save refined template
  - Input: {
      name, description, templateText, usageGuide,
      sourceRecommendationIds, sourceKBPromptIds,
      llmConfigUsedForRefinement, rawUserInput, llmRefinedOutput,
      tags, isPublic, appId
    }
  - Output: { success, data: PromptTemplate }

GET /api/prompt-templates/app/{appId}
  - List templates for app
  - Output: { success, data: PromptTemplate[], total: number }

GET /api/prompt-templates/{id}
  - Get single template
  - Output: { success, data: PromptTemplate }

PUT /api/prompt-templates/{id}
  - Update template
  - Output: { success, data: PromptTemplate }

DELETE /api/prompt-templates/{id}
  - Delete template
  - Output: { success }

GET /api/prompt-templates/download/{id}
  - Download template as JSON
  - Output: PromptTemplate (as file)
```

---

## Part 4: Frontend Components (Complete List)

### Settings UI Components

#### 1. LLMProviderSettings.tsx (Settings Tab)
- Provider selector dropdown (Azure OpenAI, Claude, AWS, OpenAI)
- Conditional form fields based on selected provider
- Test connection button
- Save configuration
- Display current config status

#### 2. KBLLMSettings.tsx (Settings Tab)
- Embedding provider selector
- KB NLP LLM provider selector
- Vector store configuration
- Conditional fields based on selections
- Save configuration

### Raw Data Integration

#### 3. RecommendationDetailModal.tsx (Enhanced)
- Fetch selected LLM config at modal open
- Show LLM provider being used
- Link to "Configure LLM" in settings
- Pass llmConfigId to recommendation API

### Prompt Template Builder

#### 4. PromptTemplateBuilder.tsx (New Page/Settings Tab)
- Vertical split layout:
  - Left: Source selection panel
  - Right: Template preview panel

#### 5. SourceSelector.tsx (Child Component)
- Tab 1: Select from Recommendations
  - List all recommendationPrompts
  - Checkbox selection
  - Show: original prompt, suggestions, context
  
- Tab 2: Select from KB Prompts
  - List all kbPrompts
  - Checkbox selection
  - Show: query, context, response

#### 6. TemplateEditor.tsx (Child Component)
- Show selected prompts side-by-side
- Text editor for custom template
- Syntax highlighting (optional)
- Character count

#### 7. TemplateRefinementPanel.tsx (Child Component)
- "Refine with LLM" button
- Show selected LLM config
- Display refinement result
- Accept/reject refined version
- Add usage guide

#### 8. TemplateSavePanel.tsx (Child Component)
- Template name & description
- Tags
- Public/Private toggle
- Version tracking
- Save button

---

## Part 5: Implementation Phases

### Phase 1: Database & Backend Setup (2-3 hours)
- [ ] Create database schema for 5 new collections
- [ ] Create TypeScript interfaces for all schemas
- [ ] Set up Zod validation schemas for all inputs
- [ ] Create MongoDB operations (CRUD) for each collection
- [ ] Create error handling utilities

### Phase 2: Settings UI (1.5 hours)
- [ ] Create LLMProviderSettings component
- [ ] Create KBLLMSettings component
- [ ] Add both to Settings page tabs
- [ ] Create LLM provider metadata schema
- [ ] Add "Configure LLM" navigation links

### Phase 3: LLM Config Retrieval & Usage (2 hours)
- [ ] Create LLMConfigService (backend) to fetch & validate configs
- [ ] Create LLMClientFactory to instantiate correct LLM provider
- [ ] Update HallucinationDetectionService to use config from DB
- [ ] Update KB Service to use embedding config from DB
- [ ] Update recommendation endpoint to accept llmConfigId

### Phase 4: Recommendations Registry (1.5 hours)
- [ ] Create recommendationPrompts API endpoints
- [ ] Create "Save Recommendation" button in detail modal
- [ ] Add recommendation list viewer
- [ ] Create recommendations list display component

### Phase 5: KB Prompts Registry (1.5 hours)
- [ ] Create kbPrompts API endpoints
- [ ] Create "Save to Registry" button in KB service
- [ ] Add KB prompts list viewer
- [ ] Create KB prompts list display component

### Phase 6: Prompt Template Builder (3-4 hours)
- [ ] Create main PromptTemplateBuilder page
- [ ] Create SourceSelector (tabs + lists)
- [ ] Create TemplateEditor with side-by-side preview
- [ ] Create TemplateRefinementPanel with LLM refinement endpoint
- [ ] Create TemplateSavePanel
- [ ] Add template viewing/editing functionality

### Phase 7: Integration & Linking (1.5 hours)
- [ ] Wire all components together
- [ ] Add data flow from recommendations → templates
- [ ] Add data flow from KB → templates
- [ ] Add template versioning
- [ ] Add download/share functionality

### Phase 8: Testing & Refinement (1-2 hours)
- [ ] End-to-end testing of all flows
- [ ] Error handling verification
- [ ] TypeScript strict mode compliance check
- [ ] UI/UX refinement

---

## Part 6: Critical Implementation Details

### LLMClientFactory Pattern
```typescript
interface LLMProvider {
  generate(prompt: string, options?: {
    temperature?: number;
    maxTokens?: number;
  }): Promise<string>;
}

class LLMClientFactory {
  static create(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'azure-openai':
        return new AzureOpenAIClient(config);
      case 'claude':
        return new ClaudeClient(config);
      case 'aws-bedrock':
        return new AWSBedrockClient(config);
      case 'openai':
        return new OpenAIClient(config);
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }
}
```

### Strict TypeScript Guards
- All API responses validated with Zod schemas
- All form inputs validated before submission
- Proper handling of optional LLM config fields
- Null/undefined checks at every data transition point
- ReadonlyArray<> for fixed data structures

### Data Flow Validation
- recommendationPrompts must link to valid recordIds
- kbPrompts must link to valid ragSessionIds
- promptTemplates must link to valid sources
- All ObjectIds properly typed as ObjectId (not string)

---

## Part 7: Implementation Checklist (No Gaps)

### Backend Files to Create
- [ ] src/models/LLMConfig.ts
- [ ] src/models/KnowledgeBaseConfig.ts
- [ ] src/models/RecommendationPrompt.ts
- [ ] src/models/KBPrompt.ts
- [ ] src/models/PromptTemplate.ts
- [ ] src/schemas/llmConfigSchema.ts (Zod)
- [ ] src/schemas/kbConfigSchema.ts (Zod)
- [ ] src/services/LLMConfigService.ts
- [ ] src/services/LLMClientFactory.ts
- [ ] src/services/AzureOpenAIClient.ts
- [ ] src/services/ClaudeClient.ts
- [ ] src/services/AWSBedrockClient.ts
- [ ] src/services/OpenAIClient.ts
- [ ] src/api/llmConfigRoutes.ts (enhanced)
- [ ] src/api/recommendationPromptsRoutes.ts
- [ ] src/api/kbPromptsRoutes.ts
- [ ] src/api/promptTemplatesRoutes.ts

### Frontend Files to Create
- [ ] src/components/settings/LLMProviderSettings.tsx
- [ ] src/components/settings/KBLLMSettings.tsx
- [ ] src/components/templates/PromptTemplateBuilder.tsx
- [ ] src/components/templates/SourceSelector.tsx
- [ ] src/components/templates/TemplateEditor.tsx
- [ ] src/components/templates/TemplateRefinementPanel.tsx
- [ ] src/components/templates/TemplateSavePanel.tsx
- [ ] src/components/templates/TemplateViewer.tsx
- [ ] src/hooks/usePromptTemplates.ts (SWR hook)
- [ ] src/hooks/useRecommendationPrompts.ts (SWR hook)
- [ ] src/hooks/useKBPrompts.ts (SWR hook)
- [ ] src/types/templates.ts (TypeScript interfaces)

### Files to Modify
- [ ] app/settings/page.tsx (add new tabs)
- [ ] src/components/dashboard/raw-data-detail-modal.tsx (add save recommendation)
- [ ] src/services/HallucinationDetectionService.ts (use config from DB)
- [ ] services/knowledge-base/src/services/EmbeddingService.ts (use config from DB)
- [ ] backend/src/index.ts (register new routes)

---

## Part 8: TypeScript Strictness Requirements

### All Components Must Have:
1. **Explicit types** - No implicit `any`
2. **Zod validation** - All external data validated at runtime
3. **Error boundaries** - Try-catch with proper error handling
4. **Type narrowing** - Use `unknown` + guards, not `any`
5. **Readonly collections** - Use `readonly T[]` for immutable data
6. **Null safety** - Handle `undefined` explicitly with `??` or `?.`
7. **ObjectId typing** - Use MongoDB ObjectId type, not strings

---

## Summary

This plan creates a complete, gap-free system where:
- ✅ LLM configurations are centralized per application
- ✅ Recommendations from raw data are saved to a registry
- ✅ Knowledge base outcomes are saved to a registry
- ✅ Prompt templates draw from both registries
- ✅ Templates are refined by the configured LLM
- ✅ All data flows are type-safe and validated
- ✅ No implementation is deferred to later
- ✅ Each service has its own LLM config with proper defaults
