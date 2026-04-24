# RAG Evaluation Platform - Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18.0 or higher
- pnpm (or npm/yarn)

### Step 1: Clone/Access Project
```bash
cd /path/to/rag-evaluation-platform
```

### Step 2: Install Dependencies
```bash
pnpm install
```

### Step 3: Configure Environment
Create a `.env.local` file in the project root:
```bash
cp .env.example .env.local
```

Default configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Step 4: Start Development Server
```bash
pnpm dev
```

### Step 5: Open Application
Navigate to `http://localhost:3000` in your browser.

**The application will automatically redirect to the dashboard.**

---

## 📖 Project Structure Overview

```
rag-evaluation-platform/
├── app/                      # Next.js pages and routes
│   ├── dashboard/           # Overview dashboard
│   ├── apps/                # App catalog and details
│   ├── alerts/              # Alert management
│   ├── explore/             # Query exploration
│   ├── benchmarks/          # Performance benchmarks
│   ├── governance/          # Compliance and policies
│   ├── settings/            # User settings
│   └── layout.tsx           # Root layout
├── src/
│   ├── components/          # React components
│   ├── api/                 # API integration
│   ├── store/               # Redux state management
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Utility functions
│   └── data/                # Mock data (development)
├── public/                  # Static assets
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config
├── next.config.mjs          # Next.js config
└── README.md                # Project documentation
```

---

## 🎨 Application Pages

### 1. Dashboard (`/dashboard`)
- Key metrics overview
- Performance trends
- System health status
- Recent alerts

**Access:** Click "Overview" in sidebar or navigate to `/dashboard`

### 2. Application Catalog (`/apps`)
- Browse all RAG applications
- Filter by status and search
- Quick app information
- Navigate to app details

**Access:** Click "App Catalog" in sidebar or navigate to `/apps`

### 3. Application Detail (`/apps/[id]`)
- Multi-tab interface
- Detailed metrics and charts
- Query logs
- Alert management
- Configuration

**Access:** Click "View Details" on any app card

### 4. Alerts (`/alerts`)
- Alert monitoring and management
- Filter by severity and application
- Alert statistics
- Resolution tracking

**Access:** Click "Alerts" in sidebar or navigate to `/alerts`

### 5. Explore (`/explore`)
- Test queries against applications
- Query history
- Response scoring
- Real-time testing

**Access:** Click "Explore" in sidebar or navigate to `/explore`

### 6. Benchmarks (`/benchmarks`)
- Compare application performance
- Visual analytics
- Performance profiles
- Ranking and insights

**Access:** Click "Benchmarks" in sidebar or navigate to `/benchmarks`

### 7. Governance (`/governance`)
- Policy management
- Compliance tracking
- Audit trails
- Rule configuration

**Access:** Click "Governance" in sidebar or navigate to `/governance`

### 8. Settings (`/settings`)
- User profile management
- Notification preferences
- Appearance customization
- Security settings

**Access:** Click "Settings" in sidebar or navigate to `/settings`

---

## 🔧 Development Workflow

### Running in Development
```bash
pnpm dev
```
- Hot Module Replacement (HMR) enabled
- Mock data loaded automatically
- TypeScript compilation on the fly

### Building for Production
```bash
pnpm build
pnpm start
```

### Linting
```bash
pnpm lint
```

---

## 📊 Using Mock Data

The application includes comprehensive mock data in `/src/data/mockData.ts` for:
- Applications (3 sample apps)
- Metrics (4 KPIs)
- Query performance (7 data points)
- Relevance scores
- Alerts (3 alerts)
- Benchmarks
- Governance policies

**No API calls needed to test the UI.**

---

## 🔌 Connecting Your API

### Step 1: Update API URL
In `.env.local`, change:
```env
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api
```

### Step 2: Implement Backend Endpoints
Your API should implement endpoints matching those defined in `/src/api/services.ts`:

**Example endpoints to implement:**
- `GET /api/apps` - List applications
- `GET /api/apps/{id}` - Get app details
- `GET /api/apps/{id}/metrics` - Get metrics
- `GET /api/alerts` - List alerts
- And more (see services.ts for full list)

### Step 3: Authentication Setup
Update API client interceptors in `/src/api/client.ts`:
```typescript
// Add your auth logic
config.headers.Authorization = `Bearer ${token}`;
```

### Step 4: Replace Mock Data
In components, replace mock data imports with API calls:
```typescript
// Before (mock)
import { mockApps } from '@/data/mockData';

// After (API)
const { data: apps } = useQuery({
  queryKey: ['apps'],
  queryFn: () => appsApi.getAll(),
});
```

---

## 🎯 Key Features

### State Management
The application uses Redux Toolkit for state management:
- **Filters**: Search, status, date range
- **UI**: Sidebar, modals, notifications
- **App Data**: Current app, app list
- **Alerts**: Alert list and filtering

### Data Fetching
TanStack Query handles:
- Server state management
- Caching and revalidation
- Loading and error states
- Automatic retries

### Type Safety
Full TypeScript implementation ensures:
- Compile-time type checking
- IntelliSense in IDE
- Self-documenting code

### Responsive Design
- Mobile-first approach
- Works on all screen sizes
- Touch-friendly interface
- Adaptive layouts

---

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use a different port
pnpm dev -- -p 5001
```

### Module Not Found Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
```

### TypeScript Errors
```bash
# TypeScript is set to ignore build errors in development
# Build errors won't stop dev server
# Check tsconfig.json: "ignoreBuildErrors": true
```

### API Connection Issues
1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Ensure backend is running
3. Check CORS configuration
4. Review browser console for errors

---

## 📚 API Documentation

### Available Services
Located in `/src/api/services.ts`:

**Apps**
- `getAll()` - List applications
- `getById(id)` - Get app details
- `create(data)` - Create app
- `update(id, data)` - Update app
- `delete(id)` - Delete app

**Metrics**
- `getByApp(appId)` - Get metrics for app
- `getQueryPerformance(appId)` - Performance data
- `getRelevanceScores(appId)` - Relevance scores

**Alerts**
- `getAll()` - List all alerts
- `getByApp(appId)` - Get app alerts
- `create(data)` - Create alert
- `resolve(id)` - Mark as resolved
- `delete(id)` - Delete alert

**Benchmarks**
- `getAll()` - List benchmarks
- `getById(id)` - Get benchmark
- `create(data)` - Create benchmark
- `update(id, data)` - Update benchmark
- `compare(appIds)` - Compare apps

**Governance**
- `getPolicies()` - List policies
- `createPolicy(data)` - Create policy
- `updatePolicy(id, data)` - Update policy
- `deletePolicy(id)` - Delete policy

---

## 🔐 Security Considerations

### Authentication
- Token stored in localStorage (production: use secure cookies)
- Automatic token refresh on 401
- Logout on failed authentication

### CORS
- Configure CORS on backend
- Allow requests from your frontend domain

### Environment Variables
- Never commit `.env.local`
- Keep API secrets on backend
- Use `NEXT_PUBLIC_` only for public values

### Input Validation
- Use Zod schemas for form validation
- Sanitize user input
- Validate on both client and server

---

## 📈 Performance Tips

1. **Use React DevTools Profiler** to identify bottlenecks
2. **Monitor bundle size** with `pnpm build --analyze`
3. **Enable code splitting** for large components
4. **Use React Query dev tools** for debugging
5. **Use Redux DevTools** for state debugging

---

## 🧪 Testing (Optional)

### Setting Up Tests
```bash
pnpm add -D jest @testing-library/react
```

### Run Tests
```bash
pnpm test
```

### Example Test
```typescript
import { render, screen } from '@testing-library/react';
import { MetricCard } from '@/components/dashboard/metric-card';

describe('MetricCard', () => {
  it('renders metric name', () => {
    const metric = { id: '1', name: 'Test Metric', /* ... */ };
    render(<MetricCard metric={metric} />);
    expect(screen.getByText('Test Metric')).toBeInTheDocument();
  });
});
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)
```bash
# Install Vercel CLI
pnpm install -g vercel

# Deploy
vercel
```

### Deploy to Other Platforms
Follow their Node.js deployment guide, typically:
1. Build: `pnpm build`
2. Start: `pnpm start`
3. Set environment variables
4. Point to your domain

### Pre-deployment Checklist
- [ ] Replace mock data with API calls
- [ ] Update API URLs for production
- [ ] Configure environment variables
- [ ] Test all features
- [ ] Review security settings
- [ ] Enable monitoring/logging
- [ ] Test on production domain
- [ ] Set up backups

---

## 📞 Getting Help

1. **Read Documentation**
   - README.md - Getting started
   - ARCHITECTURE.md - System design
   - This file - Setup guide

2. **Check Code Comments**
   - Components have JSDoc comments
   - API services are documented
   - Types have descriptions

3. **Review Examples**
   - Look at existing pages
   - Check component implementations
   - Review mock data structure

4. **Debug with Tools**
   - React DevTools browser extension
   - Redux DevTools extension
   - Network tab in browser DevTools

---

## 🎓 Learning Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Redux Toolkit Docs](https://redux-toolkit.js.org)
- [TanStack Query Guide](https://tanstack.com/query/latest)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

## ✅ Success Checklist

- [ ] Dependencies installed (`pnpm install`)
- [ ] Development server running (`pnpm dev`)
- [ ] Dashboard accessible at `http://localhost:3000`
- [ ] Can navigate between all 8 pages
- [ ] Charts rendering correctly
- [ ] Filters working on catalog and alerts
- [ ] Sidebar toggle working on mobile
- [ ] Ready to integrate backend API

---

**You're all set! Happy developing! 🎉**
