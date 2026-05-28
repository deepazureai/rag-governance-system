# **LLM ARCHITECTURE: CURRENT STATE vs. PRODUCTION READY**

## **QUICK REFERENCE TABLE**

| Component | Current Status | Priority | Est. Effort |
|-----------|---|---|---|
| **LLM Provider Types** | ✅ Complete (4 providers) | - | - |
| **Database Models** | ✅ Complete | - | - |
| **Settings UI** | ✅ Complete | - | - |
| **LLMClientFactory** | 🟡 Partial (Bedrock is stub) | HIGH | 2-3 hrs |
| **ConfigManager** | ❌ Missing | HIGH | 2-3 hrs |
| **Encryption Utility** | ❌ Missing | HIGH | 1-2 hrs |
| **Template Assistance API** | ❌ Missing | HIGH | 3-4 hrs |
| **Recommendation Assistance API** | ❌ Missing | HIGH | 2-3 hrs |
| **KB Assistance API** | ❌ Missing | MEDIUM | 2-3 hrs |
| **Frontend Components** | ❌ Missing | MEDIUM | 4-5 hrs |
| **Error Handling & Validation** | 🟡 Partial | HIGH | 2-3 hrs |
| **AWS Bedrock Full Implementation** | ❌ Stub only | MEDIUM | 3-4 hrs |

**Total Estimated Effort: 24-32 hours** (3-4 working days)

---

## **WHAT'S WORKING RIGHT NOW**

### Users Can:
1. ✅ Go to Settings → LLM Provider Settings
2. ✅ Select from 4 LLM providers (Azure OpenAI, OpenAI, Claude, AWS Bedrock)
3. ✅ Enter provider-specific credentials
4. ✅ Click "Test Connection" button
5. ✅ Save configuration to MongoDB
6. ✅ View which provider is active

### Configuration Features:
- ✅ Per-application LLM configuration
- ✅ Temperature and max tokens adjustment
- ✅ Separate KB LLM configuration
- ✅ Default to Azure OpenAI
- ✅ Dynamic form fields based on provider

---

## **WHAT'S NOT WORKING YET**

### 1. **Stored Configs Are Not Used**
```
❌ Template generation doesn't fetch LLM config
❌ Recommendations don't use stored LLM settings
❌ KB processing doesn't use KB LLM config
❌ No centralized config retrieval with caching
```

### 2. **No User-Assisted Workflows**
```
❌ Template generation: Can't combine KB + Raw Data prompts
❌ No LLM suggestion interface
❌ Users can't edit LLM suggestions
❌ Recommendation assistant not implemented
❌ KB summary assistance not implemented
```

### 3. **Security & Data Protection**
```
❌ API keys stored in plain text
❌ No encryption at rest
❌ No audit logging of LLM calls
❌ Credentials could be exposed in logs
```

### 4. **Error Handling**
```
❌ No fallback if LLM config missing
❌ No retry logic for API failures
❌ No timeout handling
❌ Limited validation on credentials
```

### 5. **AWS Bedrock Integration**
```
❌ Only stub implementation
❌ AWS SDK not integrated
❌ No credential validation
❌ No test connection support
```

---

## **ARCHITECTURE: USER-ASSISTED WORKFLOW**

### **Workflow Flow**

```
┌─────────────────────────────────────────────────────────────┐
│ Settings Page: User Configures LLM Connection              │
├─────────────────────────────────────────────────────────────┤
│ 1. Select Provider (Azure OpenAI, OpenAI, Claude, Bedrock) │
│ 2. Enter Credentials                                        │
│ 3. Test Connection                                          │
│ 4. Save to MongoDB (encrypted)                              │
│ 5. System initializes with this config                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Runtime: Application Uses Configured LLM                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TEMPLATE GENERATION FLOW:                                 │
│  1. User selects prompts from KB + Raw Data               │
│  2. User clicks "Get LLM Suggestion"                       │
│  3. Frontend calls POST /api/templates/assist-combine     │
│  4. Backend fetches stored LLM config for app              │
│  5. Creates LLM client using ConfigManager                │
│  6. Validates credentials with LLMClient.validate()       │
│  7. Sends combined prompt to configured LLM               │
│  8. LLM returns suggested combined prompt                  │
│  9. Frontend shows suggestion + editable textarea         │
│  10. User edits if needed                                  │
│  11. User clicks "Save Template"                           │
│  12. Backend saves user's FINAL version (not LLM's)       │
│                                                             │
│  RECOMMENDATION REFINEMENT:                                │
│  1. User views recommendation                              │
│  2. User clicks "Get LLM Suggestion"                       │
│  3. Similar flow to template generation                    │
│  4. User edits, then saves final version                  │
│                                                             │
│  KB PROCESSING:                                            │
│  1. User uploads KB document                               │
│  2. System extracts content                                │
│  3. User clicks "Generate Summary"                         │
│  4. Backend uses KB LLM config (separate from Dashboard)  │
│  5. LLM generates summary suggestion                       │
│  6. User edits, then saves final version                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## **CONFIGURATION MANAGER: KEY CONCEPT**

The **ConfigManager** is a centralized utility that:

```typescript
// Single source of truth for config retrieval
const config = await configManager.getApplicationLLMConfig(appId)

// With automatic caching (1 hour TTL)
// With fallback to default if not found
// With validation before returning
// Never returning null - throws clear error instead
```

This prevents:
- ❌ Redundant database queries
- ❌ Multiple LLM client instantiations
- ❌ Missing configuration handling
- ❌ Inconsistent error messages

---

## **ENCRYPTION STRATEGY**

### **Sensitive Fields to Encrypt**:
```typescript
- config.azureApiKey
- config.openaiApiKey
- config.claudeApiKey
- config.awsAccessKeyId
- config.awsSecretAccessKey
```

### **Encryption Flow**:
```
User enters credentials in Settings
        ↓
Frontend POSTs to /api/llm-config/save
        ↓
Backend validates credentials
        ↓
Backend encrypts sensitive fields using ENCRYPTION_KEY
        ↓
Backend saves encrypted data to MongoDB
        ↓
--------[At Runtime]--------
        ↓
Service needs to use credentials
        ↓
Fetches config from MongoDB (still encrypted)
        ↓
Decrypts sensitive fields using ENCRYPTION_KEY
        ↓
Creates LLM client with decrypted credentials
        ↓
Uses client for LLM call
        ↓
Never logs or exposes decrypted values
```

---

## **VALIDATION & ERROR HANDLING**

### **When User Saves Configuration**:
```typescript
✅ Validate provider name
✅ Validate all required fields present
✅ Validate fields are non-empty strings
✅ Call LLMClient.validate() for test connection
✅ Return detailed error if validation fails
✅ Show error to user in Settings page
```

### **When Service Uses Configuration**:
```typescript
✅ Check applicationId exists in database
✅ Fetch LLM config from ConfigManager
✅ Check config exists (throw if not)
✅ Create LLM client using factory
✅ Call validate() before generating
✅ Implement retry logic (max 2 attempts)
✅ Handle timeouts (30-second max)
✅ Return meaningful error to frontend
✅ Log error without sensitive data
```

### **User Experience**:
```
Success: "LLM generated suggestion successfully"
Error:   "Failed to connect to Azure OpenAI. Please check 
         your credentials in Settings."
```

---

## **FOUR PROVIDERS: CONFIGURATION SUMMARY**

### **1. Azure OpenAI** ✅ Complete
```
Required Fields:
- Endpoint: https://your-resource.openai.azure.com
- API Key: <from Azure portal>
- Deployment Name: gpt-4 (or gpt-35-turbo)
- API Version: 2023-05-15 (or newer)

Testing: Quick test with 10 max_tokens
```

### **2. OpenAI** ✅ Complete
```
Required Fields:
- API Key: sk-... (from openai.com)
- Model: gpt-4-turbo (or gpt-4, gpt-3.5-turbo)

Testing: Quick test with 10 max_tokens
```

### **3. Claude (Anthropic)** ✅ Complete
```
Required Fields:
- API Key: sk-ant-... (from console.anthropic.com)
- Model: claude-3-opus-20240229 (latest)

Testing: Quick test with 10 max_tokens
```

### **4. AWS Bedrock** 🟡 Stub Only
```
Required Fields:
- AWS Region: us-east-1 (where Bedrock is available)
- AWS Access Key ID: <from IAM console>
- AWS Secret Access Key: <from IAM console>
- Model ID: anthropic.claude-3-opus-20240229-v1:0

Status: Needs full AWS SDK integration (3-4 hours)
```

---

## **DATABASE: WHAT'S STORED**

### **LLMConfig Collection** (MongoDB):
```javascript
{
  _id: ObjectId,
  applicationId: "app-123",
  provider: "azure-openai",
  
  // Azure-specific (encrypted if values present)
  azureEndpoint: <encrypted>,
  azureApiKey: <encrypted>,
  azureDeploymentName: <encrypted>,
  azureApiVersion: "2023-05-15",
  
  // OpenAI-specific (encrypted if values present)
  openaiApiKey: <encrypted>,
  openaiModel: "gpt-4-turbo",
  
  // Claude-specific (encrypted if values present)
  claudeApiKey: <encrypted>,
  claudeModel: "claude-3-opus-20240229-v1:0",
  
  // AWS-specific (encrypted if values present)
  awsRegion: "us-east-1",
  awsAccessKeyId: <encrypted>,
  awsSecretAccessKey: <encrypted>,
  bedrockModelId: "anthropic.claude-3-opus-20240229-v1:0",
  
  // Common settings
  temperature: 0.7,
  maxTokens: 2048,
  topP: 1,
  isDefault: true,
  
  // Audit
  createdAt: 2024-01-15T10:30:00Z,
  updatedAt: 2024-01-15T10:30:00Z
}
```

### **PromptTemplate Collection** (MongoDB) - New Fields:
```javascript
{
  // ... existing fields
  
  // Track LLM assistance
  assistedBy: "azure-openai", // Which provider was used
  llmSuggestion: "suggested prompt text", // What LLM generated
  userEditedVersion: "user's final version", // What user saved
  assistanceVersion: "gpt-4-0613", // Which model version
  assistanceTimestamp: 2024-01-15T10:35:00Z
}
```

---

## **API ENDPOINTS TO IMPLEMENT**

### **Template Assistance**:
```
POST /api/templates/assist-combine-prompts
Request: {
  applicationId: string
  selectedPromptIds: string[]
}
Response: {
  success: boolean
  suggestion: string
  provider: string
  model: string
}
Error: { error: string, details?: string }
```

### **Recommendation Assistance**:
```
POST /api/recommendations/:id/assist-refinement
Request: {
  applicationId: string
  recommendationText: string
}
Response: {
  success: boolean
  suggestion: string
  provider: string
}
Error: { error: string }
```

### **KB Assistance**:
```
POST /api/knowledge-base/:id/assist-summary
Request: {
  applicationId: string
  content: string
}
Response: {
  success: boolean
  suggestion: string
  provider: string
}
Error: { error: string }
```

### **Config Validation**:
```
POST /api/llm-config/validate/:applicationId
Request: {
  provider: string
  // ... provider-specific fields
}
Response: {
  valid: boolean
  error?: string
}
```

---

## **FRONTEND: COMPONENTS TO BUILD**

### **TemplateAssistant.tsx**:
- Display selected prompts from KB + Raw Data
- Show LLM suggestion (read-only)
- Editable textarea for user's final version
- Side-by-side comparison view
- Show which LLM is being used
- Save button (only after user confirms edits)

### **RecommendationAssistant.tsx**:
- Show original recommendation
- Display LLM suggestion
- User edit area
- Save button

### **KBAssistant.tsx**:
- KB content preview
- LLM suggested summary
- User edit area
- Save button

---

## **DEPLOYMENT CHECKLIST: MAC → WINDOWS**

### **Mac (Development)**:
```
✅ Install Node.js 18+
✅ Clone repository
✅ npm install (all services)
✅ Configure .env with MongoDB URI
✅ Docker build all services
✅ Docker compose up
✅ Configure Azure OpenAI connection in Settings (free tier test)
✅ Create test template with 2-3 prompts
✅ Verify LLM suggestion appears
✅ Edit and save final version
✅ Check MongoDB shows saved config
```

### **Windows Office**:
```
✅ Install Git, Node.js, Docker Desktop
✅ Clone repository
✅ npm install (all services)
✅ Copy .env from Mac (or update with Windows settings)
✅ Docker build all services
✅ Docker compose up
✅ Update LLM config with production Azure OpenAI credentials
✅ Run full workflow end-to-end
✅ Test with 10+ template generations
✅ Verify error scenarios (invalid credentials, timeouts)
✅ Check performance metrics
✅ Backup database
```

### **Production**:
```
✅ Use AWS Secrets Manager for credentials
✅ Enable encryption at rest in MongoDB
✅ Set up audit logging for all LLM calls
✅ Implement rate limiting (max calls per app per day)
✅ Monitor LLM API costs
✅ Set up alerts for credential failures
✅ Regular backup of MongoDB
```

---

## **SUCCESS CRITERIA: USER PERSPECTIVE**

When this is complete, users should be able to:

1. **Configure LLM**:
   - "I can set up Azure OpenAI in Settings"
   - "I can switch to Claude or OpenAI if needed"
   - "I can test the connection before saving"
   - "My credentials are secure (encrypted)"

2. **Create Templates**:
   - "I can select 2-3 prompts from KB and Raw Data"
   - "LLM suggests how to combine them"
   - "I can edit the suggestion before saving"
   - "Only my final version is saved"

3. **Refine Recommendations**:
   - "LLM can suggest better wording"
   - "I can edit before saving"
   - "I see which LLM was used"

4. **Process KB**:
   - "LLM can generate summaries"
   - "I can edit before saving"
   - "Separate KB LLM config from Dashboard"

5. **Error Handling**:
   - "Clear error if credentials are wrong"
   - "Suggestion if I forgot to configure LLM"
   - "No crashes from missing config"

---

## **FILE STRUCTURE: WHAT TO CREATE**

```
backend/src/
├── utils/
│   ├── ConfigManager.ts          [NEW]
│   └── CryptoUtil.ts             [NEW]
├── services/
│   ├── LLMClientFactory.ts        [ENHANCE - Bedrock]
│   ├── PromptTemplateService.ts   [ADD assistance method]
│   ├── RecommendationPromptService.ts [ADD assistance method]
│   └── DocumentProcessorService.ts    [ADD assistance method]
├── api/
│   ├── promptTemplateRoutes.ts    [ADD assist endpoints]
│   ├── recommendationRoutes.ts    [ADD assist endpoints]
│   └── knowledgeBaseRoutes.ts     [ADD assist endpoints]
└── types/
    └── models.ts                  [Already complete]

src/components/
├── dashboard/
│   └── TemplateAssistant.tsx      [NEW]
├── recommendations/
│   └── RecommendationAssistant.tsx [NEW]
└── knowledge-base/
    └── KBAssistant.tsx            [NEW]
```

---

## **READY TO BUILD?**

This plan provides:
- ✅ Complete current-state assessment
- ✅ All gaps identified with specific solutions
- ✅ Detailed implementation steps
- ✅ Frontend/backend split
- ✅ Database schema changes
- ✅ Error handling strategy
- ✅ Deployment checklist
- ✅ Success criteria

**Shall I begin with Phase 1 implementation?** (ConfigManager, CryptoUtil, API endpoints)

All code will follow strict TypeScript best practices with no mock data.
