# Environment Setup Guide

## Quick Start

The `.env` file has been created with all required variables for docker compose.

### To run docker compose locally:

```bash
# Navigate to project directory
cd /path/to/rag-governance-system

# Start all services
docker compose up

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Rebuild and start
docker compose build --no-cache && docker compose up
```

### Environment Variables

The `.env` file contains:

- **MongoDB**: Default credentials (admin/password)
- **PostgreSQL**: Database connection for batch processing sources
- **Azure OpenAI**: Configuration for LLM recommendations (update with your credentials)
- **DeepEval**: API key for evaluation framework
- **Backend/Frontend**: Port and URL configuration

### Azure OpenAI Setup (For Recommendations Feature)

To enable LLM-based recommendations, update these in `.env`:

```
AZURE_OPENAI_API_KEY=your-key-here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_ID=gpt-4
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_TENANT_ID=your-tenant-id
AZURE_CLIENT_ID=your-client-id
AZURE_CLIENT_SECRET=your-client-secret
AZURE_KEY_VAULT_URL=https://your-keyvault.vault.azure.net/
```

### Services Running on Docker

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5001
- **MongoDB**: localhost:27018
- **Prompt Debugger**: http://localhost:8001
- **Knowledge Base**: http://localhost:8002
- **Template Creator**: http://localhost:8003
- **DeepEval**: http://localhost:8000
- **Poller**: http://localhost:5002

All warnings about missing environment variables will be resolved once you run docker compose.
