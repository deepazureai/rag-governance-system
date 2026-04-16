# Refactored Data Sources Architecture

## Overview
The data sources configuration has been completely restructured:
- **Data source connections creation** moved to: **App Catalog → + New Application**
- **Existing connections management** moved to: **Settings → Connections Tab**
- Backend Node.js connector classes created for all 5 data source types

## Architecture Changes

### 1. Frontend Structure

#### New Page: `/app/apps/new/page.tsx` (Multi-step form)
**Step 1: Application Info**
- Name
- Description
- Metadata fields

**Step 2: Data Source Selection**
- Radio buttons for 5 types:
  1. Managed SQL Service
  2. PostgreSQL Service
  3. Azure Blob Storage
  4. Azure Monitor
  5. Splunk
  6. Datadog

**Step 3: Connection Details (Dynamic)**
Each datasource shows type-specific form with 6 sections:

#### Section 1: Basic Info
- Name (auto-filled from app name)
- Type (read-only)
- Environment (Dev/Staging/Prod)

#### Section 2: Connection Details
**Managed SQL Service:**
- Server
- Database
- Port

**PostgreSQL:**
- Host
- Port
- Database
- Schema

**Azure Blob Storage:**
- Account URL
- Container Name
- Folder Path (optional)

**Azure Monitor:**
- Workspace ID
- Resource Group

**Splunk:**
- Base URL
- HEC Token

**Datadog:**
- API Key
- App Key
- Site (US/EU)

#### Section 3: Authentication
Dropdown with options:
- Managed Identity (Azure default)
- Key Vault Secret Reference
- Direct Credentials

#### Section 4: Key Vault (Conditional)
Shown when "Key Vault" selected:
- Vault URL
- Secret Name/Reference
- Multiple key-value pairs for optional secrets

#### Section 5: Controls
- Batch Size (default 1000)
- Time Filter (date range for logs)
- Row Limit (max records to fetch)

#### Section 6: Actions
- **Test Connection** - validates credentials
- **Preview Data** - shows sample records
- **Save** - stores configuration

### 2. Settings → Connections Tab

**App Selector** (horizontal scrollable)
- Shows all apps with status badge
- Single selection
- Click to load app's connections

**Connections List** (for selected app)
- Card view showing:
  - Connection name
  - Data source type
  - Last tested date
  - Status (active/inactive)
  - Actions: Edit, Delete, Test

**Edit Connection**
- Opens same form as creation
- Pre-fills existing values
- Can update without re-entering all fields

**Add Connection to App**
- Button to add additional data source to existing app
- Opens new connection form

### 3. Backend Structure

#### Connector Classes
Located in `/backend/connectors/`:

1. **SqlConnector.js** - Managed SQL Service
   - Azure Managed Identity support
   - Connection pooling
   - Schema discovery
   - Data fetching with streaming

2. **PostgresConnector.js** - PostgreSQL
   - Azure AD integration (optional)
   - Connection pooling
   - Schema discovery
   - Batch processing

3. **AzureBlobConnector.js** - Azure Blob Storage
   - Container listing
   - Blob listing and fetching
   - JSON/CSV support
   - Streaming for large files

4. **AzureMonitorConnector.js** - Azure Monitor/Log Analytics
   - KUQL query execution
   - Table discovery
   - Time-based queries
   - Token caching

5. **SplunkConnector.js** - Splunk Enterprise/Cloud
   - SPL query execution
   - Search job management
   - Async result polling
   - Multi-site support (US/EU)

6. **DatadogConnector.js** - Datadog
   - Metrics querying
   - Log querying (v2 API)
   - Monitor retrieval
   - Multi-site support

#### Security & Utility Files
Located in `/backend/security/` and `/backend/common/`:

- **KeyVaultProvider.js** - Azure Key Vault integration with caching
- **EncryptionService.js** - Local credential encryption
- **retry.js** - Exponential backoff retry logic

### 4. Database Schema

```sql
-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Data Source Configurations
CREATE TABLE data_source_configs (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES applications(id),
  name VARCHAR(255),
  type VARCHAR(50), -- sql, postgres, azure_blob, azure_monitor, splunk, datadog
  environment VARCHAR(50),
  connection_details JSONB, -- encrypted
  auth_type VARCHAR(50), -- managed_identity, keyvault, direct
  key_vault_url VARCHAR(255),
  secret_references JSONB,
  batch_size INT DEFAULT 1000,
  time_filter_days INT,
  row_limit INT,
  last_tested_at TIMESTAMP,
  test_status VARCHAR(50), -- success, failed
  test_message TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Evaluation Metrics (from connectors)
CREATE TABLE evaluation_metrics (
  id UUID PRIMARY KEY,
  app_id UUID REFERENCES applications(id),
  config_id UUID REFERENCES data_source_configs(id),
  prompt TEXT,
  context TEXT,
  response TEXT,
  metadata JSONB,
  ingested_at TIMESTAMP,
  processed_at TIMESTAMP
);
```

### 5. API Endpoints

#### Applications
- `POST /api/applications` - Create new application with data source
- `GET /api/applications/:id` - Get application details
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

#### Data Source Configurations
- `POST /api/applications/:appId/connections` - Add connection
- `GET /api/applications/:appId/connections` - List connections
- `PUT /api/applications/:appId/connections/:connId` - Update connection
- `DELETE /api/applications/:appId/connections/:connId` - Delete connection
- `POST /api/applications/:appId/connections/:connId/test` - Test connection
- `POST /api/applications/:appId/connections/:connId/preview` - Preview data

#### Connector Operations
- `POST /api/connectors/:type/fetch` - Fetch data using specific connector
- `GET /api/connectors/:type/schema` - Get schema for data source
- `POST /api/connectors/:type/validate` - Validate credentials

### 6. Frontend Components (To be created)

**New Files:**
- `/app/apps/new/page.tsx` - Multi-step application creation
- `/src/components/apps/new-application-wizard.tsx` - Wizard component
- `/src/components/connectors/connector-form.tsx` - Dynamic form renderer
- `/src/components/connectors/[type]-form.tsx` - Type-specific forms (6 files)
- `/src/components/settings/connections-tab.tsx` - Connections management

**Modified Files:**
- `app/settings/page.tsx` - Replace "Data Sources" tab with "Connections"
- `src/store/slices/dataSourcesSlice.ts` - Update for new structure
- `src/types/dataSource.ts` - Update types for new schema

### 7. Files Created

#### Backend Connectors (6 files)
- `/backend/connectors/SqlConnector.js`
- `/backend/connectors/PostgresConnector.js`
- `/backend/connectors/AzureBlobConnector.js`
- `/backend/connectors/AzureMonitorConnector.js`
- `/backend/connectors/SplunkConnector.js`
- `/backend/connectors/DatadogConnector.js`

#### Backend Security & Utilities (3 files)
- `/backend/security/KeyVaultProvider.js`
- `/backend/security/EncryptionService.js`
- `/backend/common/retry.js`

#### Frontend (To be created in next phase)
- Connection form components
- App creation wizard
- Settings connections management

### 8. Implementation Steps

**Phase 1: Backend (Complete)**
✅ Connector classes for all 5 data sources
✅ Security utilities (Key Vault, Encryption)
✅ Retry/resilience patterns

**Phase 2: Frontend**
⏳ App creation wizard with multi-step form
⏳ Dynamic connector forms (Section 1-6)
⏳ Settings connections management page
⏳ Redux state updates

**Phase 3: Integration**
⏳ Connect frontend to backend APIs
⏳ Database schema implementation
⏳ API endpoints

**Phase 4: Testing & Deployment**
⏳ Connection testing
⏳ Data preview functionality
⏳ Production security hardening

### 9. Migration Path

**From Old Data Sources Tab to New Architecture:**

1. Remove old data-sources-tab component from Settings
2. Rename Settings tab from "Data Sources" to "Connections"
3. Update redux store with new connection management actions
4. Create new application wizard flow
5. Import backend connector classes in API routes
6. Update database schema
7. Create data migration script (if needed)

### 10. Key Features

✅ **Per-Application Connections**: Each app has its own data source config
✅ **6 Connection Types**: SQL, PostgreSQL, Blob, Monitor, Splunk, Datadog
✅ **Flexible Authentication**: Managed Identity, Key Vault, Direct Credentials
✅ **Secure Storage**: Encrypted credentials with Key Vault integration
✅ **Connection Testing**: Test button validates credentials before saving
✅ **Data Preview**: Preview sample data from connection
✅ **Retry & Resilience**: Exponential backoff for transient failures
✅ **Batch Processing**: Configurable batch sizes for large datasets
✅ **Time Filtering**: Optional date range filtering for logs
✅ **Schema Discovery**: Auto-discover columns from data sources
