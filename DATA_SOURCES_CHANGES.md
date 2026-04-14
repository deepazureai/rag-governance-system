# Data Sources Configuration Feature - All Changes

This document lists all files created and modified for the configurable data sources feature.

## Files Created (14 new files)

### 1. Type Definitions
- **File**: `src/types/dataSource.ts`
- **Purpose**: TypeScript interfaces for all data source types (Database, Azure Logs, Azure Blob, Splunk, Datadog)
- **Includes**: DataSourceConfig union type, DataSourceMetrics, DataSourceTestResult

### 2. Redux State Management
- **File**: `src/store/slices/dataSourcesSlice.ts`
- **Purpose**: Redux slice managing data sources configurations, app selection, loading, errors, and test results
- **Actions**: setConfigurations, selectApp, addConfiguration, updateConfiguration, deleteConfiguration, setLoading, setError, setTestingConfigId, setTestResult, clearTestResults

### 3. Redux Store Update
- **File**: `src/store/index.ts` (MODIFIED)
- **Changes**: Added dataSourcesReducer to the store configuration

### 4. API Client
- **File**: `src/api/dataSourcesClient.ts`
- **Purpose**: Fetch/create/update/delete/test data source configurations
- **Endpoints**: GET/POST/PUT/DELETE /api/data-sources, POST /api/data-sources/{id}/test

### 5. Constants and Configuration
- **File**: `src/constants/dataSources.ts`
- **Purpose**: Data source types, port numbers, Datadog sites, metric field options, sensitive field definitions

### 6. Custom Hook
- **File**: `src/hooks/useDataSources.ts`
- **Purpose**: React hook for managing data sources operations (fetch, save, delete, test)
- **Exports**: useDataSources hook with all CRUD operations

### 7. Form Components (5 files)
- **File**: `src/components/settings/data-sources/database-form.tsx`
- **Purpose**: Form for Database configuration (host, port, database, username, password, SSL, timeout)

- **File**: `src/components/settings/data-sources/azure-logs-form.tsx`
- **Purpose**: Form for Azure Log Analytics (workspace ID, primary key, table name, KQL query)

- **File**: `src/components/settings/data-sources/azure-blob-form.tsx`
- **Purpose**: Form for Azure Blob Storage (account name, container, key, folder path, file pattern)

- **File**: `src/components/settings/data-sources/splunk-form.tsx`
- **Purpose**: Form for Splunk configuration (host, port, credentials, index, SPL query, SSL)

- **File**: `src/components/settings/data-sources/datadog-form.tsx`
- **Purpose**: Form for Datadog configuration (API key, app key, site selection, logs query)

### 8. Main Tab Component
- **File**: `src/components/settings/data-sources-tab.tsx`
- **Purpose**: Main component orchestrating the data sources configuration UI
- **Features**:
  - Horizontal scrollable app selector (single selection)
  - Display existing configurations per app
  - Add new configuration UI
  - Edit/delete/test existing configurations
  - Dynamic form rendering based on data source type
  - Test connection results display

## Files Modified (1 file)

### Settings Page
- **File**: `app/settings/page.tsx`
- **Changes**:
  - Added Database icon import from lucide-react
  - Imported DataSourcesTab component
  - Updated TabsList grid from 4 to 5 columns
  - Added 5th tab trigger for "Data Sources"
  - Added TabsContent for data-sources value displaying DataSourcesTab

## Backend Implementation Required

The frontend is complete. For full functionality, you need to implement:

### API Routes (Node.js/Express example)

```
POST /api/data-sources              - Create configuration
GET /api/data-sources?appId={id}    - Get app configurations
GET /api/data-sources/{configId}    - Get single configuration
PUT /api/data-sources/{configId}    - Update configuration
DELETE /api/data-sources/{configId} - Delete configuration
POST /api/data-sources/{configId}/test - Test connection
```

### Backend Responsibilities

1. **Credential Encryption**: Encrypt sensitive fields before storing in database
2. **Azure Key Vault Integration**: Store encryption keys and references securely
3. **Connection Testing**: Implement test endpoints for each data source type
4. **Database Schema**: Create table to store configurations per app
5. **Validation**: Server-side validation of configuration formats

### Sample Backend Structure

```typescript
// Database Schema
table: data_source_configs
columns:
  - id (UUID, primary key)
  - app_id (foreign key to apps)
  - name (string)
  - type (enum: database, azure-logs, azure-blob, splunk, datadog)
  - config (JSON - encrypted sensitive fields)
  - is_enabled (boolean)
  - vault_reference (string - Azure Key Vault reference ID)
  - created_at (timestamp)
  - updated_at (timestamp)

// Encryption Service
class CredentialEncryptionService
  - encrypt(config: DataSourceConfig): EncryptedConfig
  - decrypt(encrypted: EncryptedConfig): DataSourceConfig
  - generateVaultReference(): string

// Data Sources Service
class DataSourcesService
  - getConfigurations(appId: string): Promise<DataSourceConfig[]>
  - saveConfiguration(config: DataSourceConfig): Promise<DataSourceConfig>
  - testConnection(configId: string): Promise<TestResult>
  - deleteConfiguration(configId: string): Promise<void>

// Connection Testers (per data source type)
class DatabaseTester
class AzureLogsTester
class AzureBlobTester
class SplunkTester
class DatadogTester
```

## Architecture Overview

```
Frontend (React/Next.js)
├── UI Components (Form Components)
├── DataSourcesTab Component
├── useDataSources Hook
└── Redux State (dataSourcesSlice)
    └── API Client (dataSourcesClient)
        └── Backend API

Backend
├── API Routes
├── Data Sources Service
├── Encryption Service
├── Connection Testers
└── Database
    └── data_source_configs table
        └── Azure Key Vault (credential storage)
```

## Security Considerations

1. **Sensitive Fields**: Password, API keys, account keys are encrypted server-side only
2. **Frontend Validation**: Only format validation (not actual credential validation)
3. **Backend Validation**: Connection test endpoint validates credentials
4. **Encryption**: Use AES-256 or similar for credential encryption
5. **Vault References**: Store only reference IDs in database, actual keys in Azure Key Vault
6. **Environment Variables**: API credentials for connecting to external services stored in .env

## Configuration Per Application

Each application can have:
- Multiple data source configurations
- Different data source types (user can choose Database for one app, Splunk for another)
- Single active configuration or multiple for different purposes
- Test results showing connection status

## User Flow

1. Navigate to Settings → Data Sources
2. Select application from horizontal scroll selector
3. View existing configurations (if any)
4. Click "Add Data Source" to choose type
5. Fill in type-specific form (Database, Azure Logs, etc.)
6. Click "Save Configuration"
7. Click "Test Connection" to verify
8. Edit or delete existing configurations as needed

## Environment Setup

Add these environment variables to your `.env` file:

```
# For backend data sources connections
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Azure Key Vault (if using Azure)
AZURE_KEYVAULT_URL=https://your-keyvault.vault.azure.net/
AZURE_KEYVAULT_CLIENT_ID=your-client-id
AZURE_KEYVAULT_CLIENT_SECRET=your-client-secret

# Encryption
ENCRYPTION_KEY=your-encryption-key
```

## Testing Checklist

- [ ] Add new data source to app (test all 5 types)
- [ ] Edit existing configuration
- [ ] Delete configuration with confirmation
- [ ] Test connection for each data source type
- [ ] Switch between apps and verify configurations load
- [ ] Verify sensitive fields are masked in forms
- [ ] Test error handling for invalid credentials
- [ ] Verify Redux state updates correctly
