## TypeScript Build & Deployment Guide

### Prerequisites
- Node.js 18+
- pnpm or npm
- MongoDB connection string
- PostgreSQL connection string (if using polling service)

### Installation & Build

**Step 1: Install Dependencies**
```bash
# Root level
pnpm install

# Backend
cd backend && pnpm install && cd ..

# Frontend
pnpm install

# Polling Service
cd poller && pnpm install && cd ..
```

**Step 2: TypeScript Type Checking**
```bash
# Check all TypeScript files for errors
pnpm run type-check

# If errors exist, review:
# - Backend: backend/src/**/*.ts
# - Frontend: app/**/*.tsx, src/**/*.ts
# - Poller: poller/src/**/*.ts
```

**Step 3: Build Backend**
```bash
cd backend
pnpm run build
# Outputs: dist/ folder
```

**Step 4: Build Frontend**
```bash
pnpm run build
# Outputs: .next/ folder
```

**Step 5: Build Polling Service**
```bash
cd poller
pnpm run build
# Outputs: dist/ folder
```

### Type Safety Summary

All code has been verified for:
- ✅ No unsafe `any` types
- ✅ Proper interface definitions (Alert, GovernanceMetrics, etc.)
- ✅ String | string[] union types handled correctly
- ✅ Async/await with proper Promise types
- ✅ React hooks with correct typing
- ✅ MongoDB operations with proper collection types
- ✅ Error handling with typed catch blocks

### Pre-Deployment Verification

**TypeScript Build Check (REQUIRED)**
```bash
# Should show 0 errors
pnpm run type-check

# Expected output:
# ✓ No TypeScript errors found
```

**File Count Verification**
- Backend API files: 2 (alertsRoutes.ts, governanceMetricsRoutes.ts)
- Backend Services: 1 (AlertGenerationService.ts)
- Frontend Pages: 2 (alerts/page.tsx, governance/page.tsx)
- Data Models: 1 (database.ts with Alert + GovernanceMetrics interfaces)
- Documentation: 6 (IMPLEMENTATION_COMPLETE.md, OWASP_SECURITY_REVIEW.md, etc.)

### Security Checklist Before Production

- [ ] Implement JWT authentication
- [ ] Add role-based authorization (RBAC)
- [ ] Enable database encryption at rest
- [ ] Set up TLS/HTTPS
- [ ] Add rate limiting
- [ ] Configure CORS correctly
- [ ] Move secrets to KeyVault
- [ ] Enable security headers (HSTS, CSP)
- [ ] Set up audit logging
- [ ] Configure CSRF protection

### Excluded Folders (Not Included in Export)

These folders are regenerated on build:
- `node_modules/` - Run `pnpm install`
- `dist/` - Run `pnpm run build`
- `.next/` - Run `pnpm run build`
- `out/` - Build output
- `build/` - Old build artifacts

### Database Setup

**MongoDB Collections Required**
```bash
# Create indexes for performance
db.alerts.createIndex({ "applicationId": 1, "status": 1 })
db.alerts.createIndex({ "createdAt": -1 })
db.governanceMetrics.createIndex({ "applicationId": 1, "period": 1, "periodDate": -1 })
```

### Environment Configuration

**Backend (.env)**
```
MONGODB_URL=mongodb+srv://...
POSTGRESQL_URL=postgresql://...
JWT_SECRET=your_secret_key
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

**Polling Service (.env)**
```
MONGODB_URL=mongodb+srv://...
POSTGRESQL_URL=postgresql://...
BACKEND_URL=http://backend-service:5000
AZURE_KEYVAULT_URL=https://your-keyvault.vault.azure.net/
NODE_ENV=production
```

### Verification Steps

1. Run TypeScript compiler: `tsc --noEmit`
2. Build all packages: `pnpm run build`
3. Run unit tests (if available): `pnpm run test`
4. Check for console errors: `pnpm run lint`
5. Verify database connections in .env files
6. Test API endpoints after deployment

### Support

For TypeScript errors:
- Check `/backend/src/models/database.ts` for interface definitions
- Verify parameter types in API route handlers
- Check React component prop interfaces in page files
- Review service class method signatures

For build issues:
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Clear build artifacts: `rm -rf dist .next build`
- Rebuild: `pnpm run build`

---

**Status: READY FOR PRODUCTION BUILD** ✅
