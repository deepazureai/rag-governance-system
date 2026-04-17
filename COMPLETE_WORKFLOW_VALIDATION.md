# Complete Application Management Workflow

## User Story Validation: ✅ COMPLETE

This document confirms that the complete user story workflow is now fully implemented and integrated.

---

## **User Workflow - Step by Step**

### **Step 1: Create New Application**
**Path**: `/apps/new`

- User clicks "New Application" button on `/apps` page
- Opens 4-step wizard:
  1. **App Info** - Name, description, framework, owner
  2. **Connector Type** - Select from 5 data sources (Database, Azure Logs, Azure Blob, Splunk, Datadog)
  3. **Connector Config** - Enter connection parameters (varies by type)
  4. **Review** - Confirm and create

**Backend API**: `POST /api/applications`
- Creates application record in database
- Returns application ID

**Frontend Component**: `app/apps/new/page.tsx`
- Multi-step wizard with progress indicator
- Dynamic connector form selection
- Connection test capability

---

### **Step 2: Configure Data Source Connection**
**Same as Step 1 - Part 3**

After selecting data source type in the wizard, user configures:
- **Database**: Host, Port, Database, Username, Password, SSL
- **Azure Logs**: Tenant ID, Client ID, Client Secret
- **Azure Blob**: Connection String, Storage Account
- **Splunk**: Host, Port, API Token, Index
- **Datadog**: API Key, Application Key, Hostname

**Backend API**: `POST /api/connections`
- Creates connection record with encrypted credentials
- Associates with application
- Returns connection ID

**Frontend Component**: `src/components/apps/connectors/*.tsx`
- Type-specific forms for each data source
- Connection test with retry logic
- Credential encryption before sending to backend

---

### **Step 3: View Applications in Catalog**
**Path**: `/apps`

- Lists all created applications
- Shows status (active/inactive)
- Shows owner and framework
- Filterable by name/owner/status
- Can link to individual app detail page

---

### **Step 4: Manage Connections in Settings**
**Path**: `/settings` → **Connections Tab**

### **Step 4a: View All Applications**
- Shows list of all applications as buttons
- Click to select an application
- Highlights selected application

### **Step 4b: View Selected App's Connections**
- Lists all connections for the selected application
- Shows:
  - Connection name
  - Data source type
  - Enabled/Disabled status
  - Last test status (success/failed/pending)
  - Last tested timestamp

**Component**: `src/components/settings/connections-tab.tsx`

---

### **Step 5: Edit Connection (NEW - Just Added)**
**Triggered by**: Clicking "Edit" (pencil icon) on connection card

Opens modal with:
1. **Connection Name** - Edit name
2. **Data Source Type** - Change to different source with warning
3. **Connection Parameters** - Update credentials/config based on source type
4. **Enable/Disable** - Toggle connection active status

**Backend API**: `PUT /api/connections/:id`
- Updates connection with new parameters
- Encrypts credentials
- Resets test status to "pending"

**Frontend Component**: `src/components/settings/edit-connection-modal.tsx`
- Dialog modal with tabbed interface
- Reuses connector forms from app creation
- Shows warning when changing data source type
- Save/Cancel buttons

---

### **Step 6: Test Connection**
**Triggered by**: Clicking "Rotate/Refresh" button on connection card or in edit modal

**Backend API**: `POST /api/connections/:id/test`
- Tests connection parameters
- Updates test status (success/failed)
- Records last tested timestamp

**UI Feedback**:
- Shows status badge: ✓ Success, ✗ Failed, ⏳ Pending
- Last tested timestamp updates
- Color-coded status indicators

---

### **Step 7: Delete Connection**
**Triggered by**: Clicking "Trash" button on connection card

- Shows confirmation dialog
- Deletes connection from database
- Removes from connections list
- Stops metrics collection for that connection

**Backend API**: `DELETE /api/connections/:id`

---

## **Backend Architecture**

### **New API Endpoints**

#### **Applications**
```
POST   /api/applications              # Create new app
GET    /api/applications              # List all apps
GET    /api/applications/:id          # Get specific app
PUT    /api/applications/:id          # Update app ✨ NEW
DELETE /api/applications/:id          # Delete app
```

#### **Connections**
```
POST   /api/connections               # Create new connection
GET    /api/connections               # List all connections
GET    /api/connections/app/:appId   # Get app's connections
GET    /api/connections/:id           # Get specific connection
PUT    /api/connections/:id           # Update connection ✨ NEW
DELETE /api/connections/:id           # Delete connection
POST   /api/connections/:id/test      # Test connection
POST   /api/connections/validate      # Validate parameters
```

### **File Structure**

**New Backend Files**:
- `backend/src/api/applicationsRoutes.ts` - Application endpoints
- `backend/src/api/connectionsRoutes.ts` - Connection endpoints with PUT (update) support
- `backend/src/controllers/applicationsController.ts` - Application handlers
- `backend/src/controllers/connectionsController.ts` - Connection handlers with update handler
- `backend/src/services/applicationsService.ts` - Application business logic
- `backend/src/services/connectionsService.ts` - Connection business logic with encryption

**New Frontend Files**:
- `src/components/settings/edit-connection-modal.tsx` - Edit modal UI
- `src/components/settings/connector-edit-form.tsx` - Connector forms router
- Updated: `src/components/settings/connections-tab.tsx` - Added edit button and modal

---

## **Data Flow for Complete Workflow**

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE APPLICATION                                       │
├─────────────────────────────────────────────────────────────┤
│ Frontend: app/apps/new/page.tsx                            │
│  └─> POST /api/applications {name, description, framework} │
│      └─> Backend: Create Application in DB                 │
│          └─> Response: {appId}                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CREATE CONNECTION                                        │
├─────────────────────────────────────────────────────────────┤
│ Frontend: Same wizard, step 3                               │
│  └─> POST /api/connections {                               │
│        appId, dataSourceType, config (encrypted)           │
│      }                                                      │
│      └─> Backend: Save with encrypted credentials          │
│          └─> Response: {connectionId}                      │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. METRICS JOB STARTS (every 5 minutes)                    │
├─────────────────────────────────────────────────────────────┤
│ Backend: metricsCollectionJob.ts                           │
│  ├─> Load all Applications and Connections                │
│  ├─> For each connection:                                 │
│  │  ├─> Select appropriate adapter                       │
│  │  ├─> Decrypt credentials                              │
│  │  ├─> Fetch metrics (with retry)                       │
│  │  └─> Save to metrics collection                       │
│  └─> Metrics appear on dashboard                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. VIEW APPLICATIONS & CONNECTIONS                         │
├─────────────────────────────────────────────────────────────┤
│ Frontend: /settings → Connections Tab                      │
│  ├─> Shows: All applications as selectable buttons         │
│  ├─> On selection: Shows connections for that app          │
│  └─> GET /api/connections/app/:appId                       │
│      └─> Backend: Return connections for app               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. EDIT CONNECTION ✨ NEW                                   │
├─────────────────────────────────────────────────────────────┤
│ Frontend: Click Edit button on connection                   │
│  └─> Opens: EditConnectionModal                            │
│      ├─> Can change: name, data source type, parameters    │
│      ├─> Shows: Warning if changing source type            │
│      └─> On Save:                                          │
│          PUT /api/connections/:id {                        │
│            connectionName, dataSourceType, config          │
│          }                                                  │
│          └─> Backend: Update connection, reset test status│
│              └─> Response: Updated connection              │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. TEST CONNECTION                                          │
├─────────────────────────────────────────────────────────────┤
│ Frontend: Click Test button                                 │
│  └─> POST /api/connections/:id/test                        │
│      └─> Backend: Validate connection, update test status  │
│          └─> Response: {success: true/false}               │
│              └─> UI updates status badge                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. DELETE CONNECTION                                        │
├─────────────────────────────────────────────────────────────┤
│ Frontend: Click Delete button + Confirm                    │
│  └─> DELETE /api/connections/:id                           │
│      └─> Backend: Remove connection from DB                │
│          └─> Metrics collection stops for this connection  │
└─────────────────────────────────────────────────────────────┘
```

---

## **Key Features Implemented**

✅ Create applications with multi-step wizard
✅ Select from 5 data source types
✅ Configure connection parameters
✅ View all applications in settings
✅ Select individual applications to see their connections
✅ **Edit connections** - Change parameters or data source type
✅ Test connections with retry logic
✅ Delete connections
✅ Encrypt credentials before sending to backend
✅ Backend PUT endpoints for updates
✅ TypeScript type safety throughout
✅ Validation schemas with Zod
✅ Comprehensive error handling
✅ Real-time status updates

---

## **Complete Workflow Summary**

| Step | Action | Component | API | Status |
|------|--------|-----------|-----|--------|
| 1 | Create App | `/apps/new` | `POST /applications` | ✅ |
| 2 | Select Data Source | Wizard Step 2 | N/A | ✅ |
| 3 | Configure Connection | Wizard Step 3 | `POST /connections` | ✅ |
| 4 | View Apps | `/settings` → Connections | `GET /connections` | ✅ |
| 5 | View Connections | Settings Connections Tab | `GET /connections/app/:id` | ✅ |
| 6 | **Edit Connection** | **EditConnectionModal** | **`PUT /connections/:id`** | **✅ NEW** |
| 7 | Change Data Source | Edit Modal | `PUT /connections/:id` | ✅ |
| 8 | Test Connection | Settings Button | `POST /connections/:id/test` | ✅ |
| 9 | Delete Connection | Settings Button | `DELETE /connections/:id` | ✅ |

---

## **Frontend Structure**

```
app/
├── apps/
│   ├── page.tsx                    # App catalog
│   └── new/page.tsx                # Create app wizard ✨
└── settings/page.tsx               # Settings main

src/components/
├── apps/
│   ├── connector-form.tsx           # Connector router
│   └── connectors/
│       ├── database-connector.tsx
│       ├── azure-logs-connector.tsx
│       ├── azure-blob-connector.tsx
│       ├── splunk-connector.tsx
│       └── datadog-connector.tsx
└── settings/
    ├── connections-tab.tsx          # Updated ✨
    ├── edit-connection-modal.tsx    # NEW ✨
    └── connector-edit-form.tsx      # NEW ✨
```

---

## **Testing the Complete Workflow**

1. Go to `/apps` → Click "New Application"
2. Fill in app info → Select data source type
3. Enter connection parameters → Test connection
4. Create application
5. Go to `/settings` → Connections Tab
6. Select created application
7. Click "Edit" on connection
8. Change connection name and/or data source type
9. Click "Save Changes"
10. Connection updates and is ready for metrics collection

---

**Status**: ✅ User story is complete and ready for integration testing!
