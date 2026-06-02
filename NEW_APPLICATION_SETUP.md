# Setting Up "Generate Recommendations" for New Applications

## Problem

You created a new application called "Test" and tried to use "Generate Recommendations" in Raw Data → Recommendations, but got an error:

```
LLM Configuration Required: Please configure LLM settings in Settings → LLM Configuration tab for this application before generating recommendations.
```

## Why This Happens

The "Generate Recommendations" feature uses Azure OpenAI to generate LLM-based suggestions. Each application needs its own LLM configuration with:
- Azure OpenAI API Key
- Azure Endpoint URL
- Deployment Name
- API Version

New applications don't have these credentials configured by default.

## Solution (4 Steps)

### Step 1: Open Settings
Click the **Settings** button (gear icon) in the top right corner

### Step 2: Go to LLM Configuration Tab
In the Settings panel, click the **LLM Configuration** tab

### Step 3: Select Your Application
Find and select "Test" from the application dropdown

### Step 4: Enter Azure OpenAI Credentials

Fill in these fields with your Azure credentials:

| Field | What to Enter |
|-------|---------------|
| **Provider** | Select "Azure OpenAI" |
| **API Key** | Your Azure OpenAI API key (from Azure Portal) |
| **Azure Endpoint** | Like `https://your-resource.openai.azure.com/` |
| **Deployment Name** | Name of your model deployment (e.g., `gpt-4-turbo`) |
| **API Version** | Latest version like `2024-02-15-preview` |

⚠️ **Important:**
- Copy values exactly from Azure Portal (no extra spaces)
- API Key is secret - keep it safe
- Credentials are encrypted before storing

### Step 5: Save
Click **Save** or **Update** button and wait for success confirmation

### Step 6: Test It
1. Go back to Raw Data → Recommendations
2. Click **Generate Recommendations** 
3. Recommendations should now generate successfully!

---

## After Configuration Works

Once LLM is set up, you can:
✅ Generate recommendations for any raw data record  
✅ Get DeepEval metric analysis  
✅ See LLM suggestions to improve metrics  
✅ Auto-generate improved prompts  
✅ Save improvements to database  

---

## Troubleshooting

**Still getting error after saving?**
- Try refreshing the page
- Verify API key is correct (no typos)
- Check Azure resource is in same region
- Confirm deployment name exists

**Getting "connection failed" error?**
- Check if Azure endpoint URL is correct
- Verify API key hasn't expired
- Make sure deployment name matches
- Try different API version

**Slow recommendations?**
- First time generation takes longer
- Check internet connection
- Azure OpenAI might be slow
- Try again in a few minutes

---

## Per-Application Configuration

You can set different LLM settings for each application:

- **"Test" app** → Development Azure account (free tier)
- **"Production" app** → Production Azure account (paid tier)
- **"Demo" app** → Shared demo Azure account

This lets you:
- Test with development credentials
- Use different models per app
- Control costs separately
- Keep apps isolated

---

## Reference

For more details, see `LLM_CONFIGURATION_GUIDE.md` in the project documentation.

