# Files to Copy for Per-Application SLA System

## Complete Implementation Checklist

Copy these files to your local machine in this order:

### BACKEND - New Files (5 files)

1. **backend/src/utils/sla-benchmarks.ts** - Industry standard SLA definitions
2. **backend/src/api/slaConfigRoutes.ts** - SLA CRUD API endpoints
3. **backend/src/api/applicationRecordsRoutes.ts** - Evaluation records API
4. **backend/src/utils/paramParser.ts** - Safe parameter extraction (created earlier)

### BACKEND - Updated Files (3 files)

5. **backend/src/models/database.ts** - Added ApplicationSLA interface
6. **backend/src/api/applicationsRoutes.ts** - Auto-creates SLA on app creation
7. **backend/src/index.ts** - Registered slaConfigRouter

---

### FRONTEND - New Files (8 files)

8. **src/utils/sla-comparison.ts** - Metric health evaluation utility
9. **src/hooks/useApplicationSLA.ts** - SLA configuration hook with mutations
10. **src/hooks/useApplicationMetrics.ts** - Metrics fetching with SLA support
11. **src/components/dashboard/sla-settings-tab.tsx** - SLA configuration UI
12. **src/components/dashboard/evaluation-logs-viewer.tsx** - UPDATED for per-app SLA
13. **src/types/application.ts** - ApplicationSLA TypeScript interfaces
14. **app/apps/[id]/settings/page.tsx** - Per-app settings page
15. **app/apps/[id]/page.tsx** - UPDATED to include settings link and SLA passing

### FRONTEND - Previously Created Files (Still needed if not copied)

16. **app/apps/page.tsx** - App catalog listing
17. **app/dashboard/page.tsx** - Main dashboard
18. **src/api/client.ts** - API client
19. **src/components/apps/local-folder-config.tsx** - File validation UI

---

## Copy Order

**1. Copy Backend Files First** (in order):
```bash
# New utilities and routes
backend/src/utils/sla-benchmarks.ts
backend/src/api/slaConfigRoutes.ts

# Updated models
backend/src/models/database.ts

# Updated application routes
backend/src/api/applicationsRoutes.ts

# Updated server entry
backend/src/index.ts
```

**2. Restart Backend**
```bash
cd backend
npm install  # If new packages needed
pnpm dev
```

**3. Copy Frontend Files** (in order):
```bash
# Utilities
src/utils/sla-comparison.ts

# Hooks
src/hooks/useApplicationSLA.ts
src/hooks/useApplicationMetrics.ts

# Types
src/types/application.ts

# Components
src/components/dashboard/sla-settings-tab.tsx
src/components/dashboard/evaluation-logs-viewer.tsx

# Pages
app/apps/[id]/settings/page.tsx
app/apps/[id]/page.tsx
```

**4. Restart Frontend**
```bash
pnpm dev
```

---

## Testing Checklist

- [ ] Create new application → Auto-populated with industry benchmarks
- [ ] Navigate to app → Click Settings button
- [ ] Open `/apps/[id]/settings` → See SLA configuration form
- [ ] Modify metric thresholds → Save changes
- [ ] View application → Go to Evaluation Logs tab
- [ ] Verify color coding uses app-specific thresholds
- [ ] Reset to defaults → Check benchmarks restored
- [ ] Check aggregation still uses industry standards

---

## Database Collections

Make sure MongoDB has these collections:
- `applicationmasters` - Application definitions
- `applicationslas` - Per-app SLA configurations (auto-created on app creation)
- `evaluationrecords` - Metric evaluation data
- `rawdatarecords` - Original data records

---

## Environment Variables

No new environment variables needed. Existing ones should work:
- `DATABASE_URL` - MongoDB connection string
- `NEXT_PUBLIC_API_URL` - Backend URL (defaults to http://localhost:5000)

---

## Key Features Implemented

✅ Per-application SLA configuration
✅ Industry benchmark auto-population
✅ Custom threshold customization
✅ Reset to defaults
✅ SLA-aware color coding in logs
✅ Business-context metrics display
✅ Settings page per application
✅ Aggregation with industry standards
✅ No TODOs - Complete implementation

