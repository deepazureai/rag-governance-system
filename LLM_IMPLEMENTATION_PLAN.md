# **COMPREHENSIVE LLM MULTI-PROVIDER IMPLEMENTATION PLAN**
**User-Assisted Workflow with Azure OpenAI, OpenAI, Claude, and AWS Bedrock**

---

## **EXECUTIVE SUMMARY**

This plan implements a **user-assisted LLM workflow** where:
1. **Users configure LLM connections** in Settings with full credentials
2. **Connections stored in MongoDB** with provider flexibility
3. **Azure OpenAI is default** but users can switch to OpenAI, Claude, or AWS Bedrock
4. **LLM assists** (never auto-generates) in:
   - Template generation by combining selected prompts
   - Recommendation refinement
   - Knowledge Base content processing
5. **Users edit and save** final versions - LLM is advisory only

---

## **CURRENT IMPLEMENTATION STATUS**

### ✅ **Already Implemented**

1. **Database Models** (`backend/src/types/models.ts`):
   - ✅ `LLMProvider` type: `'azure-openai' | 'claude' | 'aws-bedrock' | 'openai'`
   - ✅ `LLMConfig` interface with all provider fields
   - ✅ `KnowledgeBaseConfig` with separate KB LLM config
   - ✅ Temperature, maxTokens, topP parameters

2. **LLM Client Factory** (`backend/src/services/LLMClientFactory.ts`):
   - ✅ `ILLMProvider` interface (generate, validate)
   - ✅ `AzureOpenAIProvider` - Complete implementation
   - ✅ `OpenAIProvider` - Complete implementation
   - ✅ `ClaudeProvider` - Complete implementation
   - ✅ `AWSBedrockProvider` - Placeholder (needs AWS SDK)
   - ✅ `LLMClientFactory.create()` - Factory method
   - ✅ `LLMClientFactory.getSupportedProviders()` - Provider metadata

3. **Settings UI** (`src/components/settings/LLMProviderSettings.tsx`):
   - ✅ Provider dropdown with 4 options
   - ✅ Dynamic form fields based on provider selection
   - ✅ Temperature and maxTokens inputs
   - ✅ Save and Test Connection buttons
   - ✅ Success/error messaging

4. **Backend Services**:
   - ✅ `LLMConfigService` - CRUD operations
   - ✅ API routes at `/api/llm-config/*`
   - ✅ Config validation endpoints

### ❌ **Critical Gaps to Implement**

#### **Gap 1: ConfigManager Utility** (HIGH PRIORITY)
**Purpose**: Centralized config fetching, caching, validation, and default initialization

**Missing Components**:
```typescript
// backend/src/utils/ConfigManager.ts - NEEDS CREATION
class LLMConfigManager {
  private cache: Map<string, CachedConfig>
  private cacheTTL: number = 3600000 // 1 hour
  
  async getApplicationLLMConfig(appId: string): Promise<ILLMConfig>
  async getKnowledgeBaseConfig(appId: string): Promise<IKnowledgeBaseConfig>
  async validateCredentials(config: ILLMConfig): Promise<boolean>
  async initializeDefaultConfig(appId: string, llmProvider?: string): Promise<ILLMConfig>
  private getCachedConfig(key: string): ILLMConfig | null
  private setCachedConfig(key: string, config: ILLMConfig): void
  private clearCache(key: string): void
}
```

**Requirements**:
- Fetch config by applicationId with caching
- Return null if not found (vs throwing error)
- Initialize with Azure OpenAI as default
- Validate credentials before use
- Clear cache on config update
- No mock data - always fetch from DB

---

#### **Gap 2: Template Generation Assistance API** (HIGH PRIORITY)

**Current**: No LLM integration in template generation

**Needed Endpoint**:
```typescript
// backend/src/api/promptTemplateRoutes.ts - ADD
POST /api/templates/assist-combine-prompts
Body: {
  applicationId: string
  selectedPromptIds: string[] // From KB and Raw Data
  useKBPrompts: boolean
  useRawDataRecommendations: boolean
}
Response: {
  success: boolean
  suggestion: string // LLM-suggested combined prompt
  provider: 'azure-openai' | 'openai' | 'claude' | 'aws-bedrock'
  model: string
}
```

**Backend Service Logic**:
```typescript
// backend/src/services/PromptTemplateService.ts - ENHANCE
async assistCombinePrompts(
  appId: string,
  selectedPromptIds: string[]
): Promise<TemplateAssistanceResult> {
  // 1. Get LLM config for app
  const llmConfig = await configManager.getApplicationLLMConfig(appId)
  
  // 2. Fetch all selected prompts from KB and recommendations
  const selectedPrompts = await this.fetchSelectedPrompts(selectedPromptIds)
  
  // 3. Create LLM client from config
  const llmClient = LLMClientFactory.create(llmConfig)
  
  // 4. Validate credentials
  const validation = await llmClient.validate()
  if (!validation.valid) throw new Error(validation.error)
  
  // 5. Build assistance prompt
  const assistancePrompt = this.buildCombinePromptsPrompt(selectedPrompts)
  
  // 6. Call LLM
  const suggestion = await llmClient.generate(assistancePrompt, {
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.maxTokens,
  })
  
  // 7. Return suggestion (NOT saved to DB)
  return {
    suggestion,
    provider: llmConfig.provider,
    model: this.getModelName(llmConfig),
  }
}

private buildCombinePromptsPrompt(prompts: PromptInfo[]): string {
  return `You are a prompt engineering expert. The user has selected these prompts 
  from their knowledge base and raw data recommendations:

  ${prompts.map((p, i) => `
  ${i + 1}. Source: ${p.source} (${p.type})
     "${p.content}"
  `).join('\n')}

  Please suggest an improved, combined prompt that:
  1. Incorporates the best elements of all selected prompts
  2. Removes redundancy and duplication
  3. Improves clarity and specificity
  4. Maintains the original intent and context
  5. Creates a more powerful and focused prompt

  Return ONLY the improved prompt text, no explanation or markdown.`
}
```

---

#### **Gap 3: Recommendation Assistance API** (HIGH PRIORITY)

**Needed Endpoint**:
```typescript
// backend/src/api/recommendationRoutes.ts - ADD
POST /api/recommendations/:id/assist-refinement
Body: {
  applicationId: string
  recommendationText: string
}
Response: {
  success: boolean
  suggestion: string // LLM-suggested improved recommendation
  provider: string
}
```

**Backend Service Logic**:
```typescript
// backend/src/services/RecommendationPromptService.ts - ADD
async assistRefineRecommendation(
  appId: string,
  recommendation: RecommendationPrompt
): Promise<AssistanceResult> {
  // 1. Get LLM config
  const llmConfig = await configManager.getApplicationLLMConfig(appId)
  const llmClient = LLMClientFactory.create(llmConfig)
  
  // 2. Validate
  const validation = await llmClient.validate()
  if (!validation.valid) throw new Error(validation.error)
  
  // 3. Build prompt for refinement
  const refinementPrompt = `
  The following is a data-driven recommendation for improving a system or process. 
  Please refine this recommendation to make it more actionable and clear:
  
  Original Recommendation: "${recommendation.originalResponse}"
  
  Improvements should:
  1. Make it more specific and actionable
  2. Add quantifiable metrics if possible
  3. Improve clarity for end users
  4. Maintain professional tone
  
  Return ONLY the refined recommendation, no explanation.`
  
  // 4. Get LLM suggestion
  const suggestion = await llmClient.generate(refinementPrompt, {
    temperature: llmConfig.temperature,
    maxTokens: llmConfig.maxTokens,
  })
  
  return { suggestion, provider: llmConfig.provider }
}
```

---

#### **Gap 4: Knowledge Base Assistance API** (MEDIUM PRIORITY)

**Needed Endpoint**:
```typescript
// backend/src/api/knowledgeBaseRoutes.ts - ADD
POST /api/knowledge-base/:id/assist-summary
Body: {
  applicationId: string
  content: string
}
Response: {
  success: boolean
  suggestion: string // LLM-suggested KB summary
}
```

**Backend Service Logic**:
```typescript
// backend/src/services/DocumentProcessorService.ts - ENHANCE
async assistGenerateSummary(
  appId: string,
  content: string
): Promise<string> {
  // 1. Get KB LLM config
  const kbConfig = await configManager.getKnowledgeBaseConfig(appId)
  const llmClient = LLMClientFactory.create({
    provider: kbConfig.kbLlmProvider,
    // ... map KB config fields to LLM config
  })
  
  // 2. Generate summary
  const summaryPrompt = `
  Summarize the following document concisely in 2-3 sentences:
  
  ${content.substring(0, 2000)} // Limit to prevent token overflow
  
  Return ONLY the summary, no explanation.`
  
  return await llmClient.generate(summaryPrompt)
}
```

---

#### **Gap 5: AWS Bedrock Full Implementation** (MEDIUM PRIORITY)

**Current**: Placeholder only

**Needed Implementation**:
```typescript
// backend/src/services/LLMClientFactory.ts - ENHANCE AWSBedrockProvider
export class AWSBedrockProvider implements ILLMProvider {
  private bedrockClient: BedrockRuntimeClient
  private modelId: string
  private region: string
  
  constructor(config: LLMConfig) {
    // Initialize AWS SDK with credentials
    this.bedrockClient = new BedrockRuntimeClient({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId!,
        secretAccessKey: config.awsSecretAccessKey!,
      },
    })
    this.modelId = config.bedrockModelId!
    this.region = config.awsRegion!
  }
  
  async generate(prompt: string, options?: LLMGenerationOptions): Promise<string> {
    // Use InvokeModel API with proper payload formatting
    // Support both Claude and other Bedrock models
    // Handle streaming vs non-streaming responses
  }
  
  async validate(): Promise<{ valid: boolean; error?: string }> {
    // Test connection with ListModels or test invoke
  }
}
```

**Dependencies to Add**:
```json
{
  "@aws-sdk/client-bedrock": "^3.x",
  "@aws-sdk/client-bedrock-runtime": "^3.x"
}
```

---

#### **Gap 6: Sensitive Data Encryption** (HIGH PRIORITY)

**Current**: API keys stored in plain text in MongoDB

**Needed Encryption Utility**:
```typescript
// backend/src/utils/CryptoUtil.ts - CREATE
class CryptoUtil {
  private encryptionKey: string
  
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || ''
    if (!this.encryptionKey) {
      console.warn('ENCRYPTION_KEY not set - sensitive data will not be encrypted')
    }
  }
  
  encrypt(plainText: string): string {
    if (!this.encryptionKey) return plainText
    // Use crypto module for AES-256 encryption
  }
  
  decrypt(cipherText: string): string {
    if (!this.encryptionKey) return cipherText
    // Decrypt using same key
  }
}
```

**Usage in Models**:
```typescript
// Encrypt before saving to DB
config.azureApiKey = cryptoUtil.encrypt(config.azureApiKey)

// Decrypt when retrieving from DB
const decryptedConfig = {
  ...config,
  azureApiKey: cryptoUtil.decrypt(config.azureApiKey),
}
```

---

#### **Gap 7: Frontend Components for Assistance** (MEDIUM PRIORITY)

**Needed Components**:

1. **TemplateAssistant.tsx** - Show LLM-suggested combined prompt
```typescript
// src/components/dashboard/TemplateAssistant.tsx
Features:
- Display selected prompts from KB and Raw Data
- Show LLM suggestion in read-only box
- Provide editable textarea for user edits
- Side-by-side comparison
- Save button (only saves user's final version)
- Show LLM provider being used
```

2. **RecommendationAssistant.tsx** - Show LLM-refined recommendation
```typescript
// src/components/recommendations/RecommendationAssistant.tsx
Features:
- Original recommendation
- LLM suggestion
- User edit area
- Save button
```

3. **KBAssistant.tsx** - Show LLM-generated summary
```typescript
// src/components/knowledge-base/KBAssistant.tsx
Features:
- KB content preview
- LLM suggested summary
- User edit area
- Save button
```

---

## **IMPLEMENTATION PHASES**

### **Phase 1: Foundation (Days 1-2)**
- [ ] Create `ConfigManager` utility with caching
- [ ] Create `CryptoUtil` for sensitive data encryption
- [ ] Add encryption to LLMConfig save/retrieve
- [ ] Update LLMConfigService to use ConfigManager

### **Phase 2: Core LLM Integration (Days 2-3)**
- [ ] Implement Template Assistance API
- [ ] Implement Recommendation Assistance API
- [ ] Implement KB Assistance API
- [ ] Add error handling and validation

### **Phase 3: AWS Bedrock (Day 3-4)**
- [ ] Implement full AWSBedrockProvider
- [ ] Add AWS SDK dependencies
- [ ] Test AWS credential validation
- [ ] Handle AWS-specific error cases

### **Phase 4: Frontend Components (Days 4-5)**
- [ ] Create TemplateAssistant component
- [ ] Create RecommendationAssistant component
- [ ] Create KBAssistant component
- [ ] Integrate assistance endpoints

### **Phase 5: Testing & Validation (Days 5-6)**
- [ ] Test all 4 providers locally
- [ ] Validate credential handling
- [ ] Test error scenarios
- [ ] Test Mac → Windows Azure OpenAI migration

---

## **TYPESCRIPT STRICTNESS REQUIREMENTS**

**All implementations must follow**:

```typescript
✅ No `any` types - use explicit interfaces always
✅ Strict null checks - explicit null/undefined handling
✅ Explicit return types on all functions: Promise<string> | null
✅ Type guards for error handling: catch(error: unknown) with type narrowing
✅ No optional chaining shortcuts - explicit error messages
✅ All Promises awaited
✅ Dependency injection for services
✅ No mock data - real DB/API calls only
✅ Input validation with Zod schemas
✅ Never log sensitive data (API keys, credentials)
```

---

## **DATABASE SCHEMA UPDATES**

**Add to LLMConfig**:
```typescript
interface LLMConfig {
  // ... existing fields
  encryptedFields?: string[] // Track which fields are encrypted
  lastTestedAt?: Date // Track when credentials were last validated
  testStatus?: 'success' | 'failed' | 'pending'
  testError?: string // Last error from test
}

interface PromptTemplate {
  // ... existing fields
  assistedBy?: 'azure-openai' | 'openai' | 'claude' | 'aws-bedrock'
  llmSuggestion?: string // What LLM suggested
  userEditedVersion: string // What user saved
  assistanceVersion?: string // Which model version was used
}
```

---

## **ENVIRONMENT VARIABLES REQUIRED**

```bash
# Encryption
ENCRYPTION_KEY=<base64-encoded-32-byte-key>

# AWS (if using Bedrock)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<from-user-settings>
AWS_SECRET_ACCESS_KEY=<from-user-settings>

# MongoDB
MONGODB_URI=<connection-string>
```

---

## **ERROR HANDLING CHECKLIST**

Every service method must validate:

```typescript
✅ [Service] applicationId exists in database
✅ [Service] LLM config exists for application
✅ [Service] All required credentials present
✅ [Service] Credentials are non-empty strings
✅ [Service] Test connection before first use
✅ [Service] Handle network timeouts gracefully
✅ [Service] Implement retry logic (max 2 retries with backoff)
✅ [Service] Never expose sensitive data in error messages
✅ [Service] Log all LLM calls for debugging (without credentials)
✅ [API] Validate request schema with Zod
✅ [API] Return meaningful error messages to frontend
✅ [API] Implement rate limiting on /assist endpoints
✅ [DB] Index applicationId for query performance
✅ [Frontend] Show loading spinner during LLM calls
✅ [Frontend] Show provider being used
✅ [Frontend] Graceful error display
```

---

## **DEPLOYMENT: MAC → WINDOWS → PRODUCTION**

### **Mac Development**:
1. Configure Azure OpenAI connection in Settings
2. Create sample template using 2-3 prompts
3. Verify LLM suggestion appears
4. Edit and save final version
5. Test with OpenAI and Claude APIs (if available)

### **Windows Office**:
1. Update ENCRYPTION_KEY in environment
2. Change LLM provider to real Azure OpenAI account
3. Run full end-to-end workflow
4. Test all error scenarios
5. Verify performance at scale

### **Production**:
1. Use managed secrets (e.g., AWS Secrets Manager)
2. Enable audit logging for all LLM calls
3. Implement rate limiting per application
4. Monitor LLM API costs
5. Set up alerts for credential failures

---

## **SUCCESS CRITERIA**

Users can:
- ✅ Configure 4 different LLM providers in Settings
- ✅ Switch providers without data loss
- ✅ Create templates by combining KB + Raw Data prompts
- ✅ Get LLM suggestions for combined prompts
- ✅ Edit LLM suggestions before saving
- ✅ Refine recommendations with LLM assistance
- ✅ Generate KB summaries with LLM help
- ✅ See which LLM is being used for each operation
- ✅ Test LLM connections from Settings
- ✅ Handle credential errors gracefully

---

## **NEXT IMMEDIATE STEPS**

1. **Create `ConfigManager.ts`** - Centralized config fetching with caching
2. **Enhance `LLMClientFactory`** - Add AWS Bedrock full implementation
3. **Create `CryptoUtil.ts`** - Encrypt sensitive credentials
4. **Add assistance endpoints** - Template, Recommendation, KB
5. **Create frontend components** - Assistant UIs for user editing

Ready to proceed with Phase 1 implementation?
