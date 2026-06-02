# LLM Configuration Guide

## Issue: "Generate Recommendations" Not Working for New Applications

**Symptoms:**
- Click "Generate Recommendations" button in Raw Data → Recommendations
- Error appears: "LLM Configuration Required: Please configure LLM settings in Settings → LLM Configuration tab"
- Recommendations cannot be generated

**Root Cause:**
Each application requires its own Azure OpenAI LLM configuration to generate recommendations. New applications don't have this configured by default.

---

## Solution: Configure LLM Settings

### Step 1: Navigate to LLM Configuration
1. Click **Settings** (top right)
2. Select **LLM Configuration** tab
3. Choose your application from the dropdown

### Step 2: Enter Azure OpenAI Credentials

You need the following from your Azure OpenAI deployment:

| Field | Description | Example |
|-------|-------------|---------|
| **Provider** | Select "Azure OpenAI" | Azure OpenAI |
| **API Key** | Azure OpenAI API key | `a1b2c3d4e5f6...` |
| **API Endpoint** | Azure resource endpoint | `https://my-resource.openai.azure.com/` |
| **Deployment Name** | Model deployment name | `gpt-4-turbo` |
| **API Version** | Azure API version | `2024-02-15-preview` |

### Step 3: Save Configuration
- Click **Save** or **Update** button
- Wait for confirmation message
- Credentials are encrypted and stored securely

### Step 4: Test & Generate Recommendations
1. Go to **Raw Data** → **Recommendations**
2. Click **Generate Recommendations**
3. LLM should now generate recommendations using your configured settings

---

## Per-Application Configuration

Each application can have **different LLM settings**:

- Application "RAG-App": Uses Production Azure OpenAI
- Application "Test": Uses Development/Testing Azure OpenAI
- Application "Demo": Uses Free-tier Azure OpenAI

This allows teams to:
- Use different LLM models per app
- Control costs separately
- Test new models safely
- Maintain separate API quotas

---

## Troubleshooting

### Error: "LLM connection validation failed"

**Possible causes:**
1. Invalid API key
2. Wrong Azure endpoint URL
3. Deployment name doesn't exist
4. API version not supported

**Solution:**
1. Verify credentials in Azure Portal
2. Copy exact values (no extra spaces)
3. Test with Azure CLI: `az openai model list --resource-group my-rg`
4. Update to latest API version (2024-02-15-preview or newer)

### Error: "No LLM configuration found"

**Cause:** Application hasn't been configured yet

**Solution:**
1. Go to Settings → LLM Configuration
2. Select the application
3. Fill in all required fields
4. Click Save

### Recommendations are slow

**Possible causes:**
- High Azure OpenAI latency
- Large context retrieval
- Complex evaluation metrics

**Solutions:**
- Check Azure region latency
- Reduce context chunk size
- Use faster model (gpt-3.5-turbo vs gpt-4)

---

## Security Notes

- API keys are encrypted in database
- Only authenticated users can configure LLM settings
- Credentials never logged in console
- Each app has isolated configuration

---

## API Details

The backend validates LLM connection before attempting to generate recommendations:

1. Fetches saved LLM config for application
2. Creates LLM client with credentials
3. Tests connection with validation call
4. Only proceeds if connection successful

If any step fails, users get actionable error message with next steps.

---

## Next Steps After Configuration

Once LLM is configured:
1. ✅ Generate Recommendations works
2. ✅ DeepEval analysis displays
3. ✅ Prompt curation available
4. ✅ Improvements can be saved

