# RAG Evaluation Platform - Architecture Documentation

## System Overview

The RAG Evaluation Platform is a full-stack web application designed for enterprise users to evaluate, monitor, and manage Retrieval-Augmented Generation (RAG) LLM applications. It provides real-time insights into application performance, quality metrics, and compliance status.

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **UI Library**: React 19
- **State Management**: Redux Toolkit + RTK Query
- **Data Fetching**: TanStack Query (React Query) + Axios
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Date Handling**: date-fns
- **Form Handling**: React Hook Form + Zod validation
- **Type Safety**: TypeScript 5.7+

### Development Tools
- **Package Manager**: pnpm
- **Build Tool**: Turbopack (Next.js default)
- **Code Quality**: ESLint

## Architecture Layers

### 1. Presentation Layer (UI Components)

Located in `/src/components/` and `/app/`, handles:
- **Layout Components**: Sidebar navigation, header, main layout
- **Dashboard Components**: Metric cards, app cards, charts
- **Page Components**: Full page implementations for each feature
- **UI Components**: Reusable shadcn/ui components

**Design Pattern**: Composition with server components where possible, client components for interactivity.

### 2. State Management Layer

**Redux Store** (`/src/store/`):
- **filtersSlice**: Global filter state (search, date ranges, status filters)
- **uiSlice**: UI state (sidebar toggle, modals, notifications)
- **appSlice**: Application data (current app, app list)
- **alertsSlice**: Alert data and filtering

**Purpose**: Manage application-wide state that needs to persist across components.

**Data Fetching Layer**: TanStack Query (React Query)
- Handles server state
- Automatic caching and invalidation
- Optimistic updates
- Retry logic

### 3. API Integration Layer

**API Client** (`/src/api/client.ts`):
- Centralized Axios instance
- Request/response interceptors
- Authentication token handling
- Error handling

**API Services** (`/src/api/services.ts`):
- Clean API function interfaces
- Organized by resource (apps, metrics, alerts, benchmarks, governance)
- Type-safe request/response handling

**Error Handler** (`/src/api/error-handler.ts`):
- Centralized error handling
- HTTP status code mapping
- Network error detection

### 4. Data Types Layer

**TypeScript Interfaces** (`/src/types/index.ts`):
- Domain models (App, EvaluationMetric, Alert, etc.)
- API response types
- Utility types (ApiResponse, PaginatedResponse)

**Purpose**: Ensure type safety across the entire application.

### 5. Utilities & Helpers

**Format Utilities** (`/src/utils/format.ts`):
- Date formatting (formatDate, formatDateTime, formatTime)
- Number formatting (formatNumber, formatPercentage, formatLatency)
- Styling helpers (getTrendColor, getSeverityColor, getStatusColor)
- Text utilities (truncateText, debounce)

**Shared Utilities** (`/lib/utils.ts`):
- `cn()` function for conditional Tailwind classes
- Other common utilities

## Data Flow

### User Interaction Flow

```
User Action (click, input)
    ↓
Component Event Handler
    ↓
Redux Action / Query Mutation
    ↓
API Call via apiClient
    ↓
Server Response
    ↓
Store Update / Query Cache Update
    ↓
Component Re-render
    ↓
Updated UI
```

### Example: Fetching App Metrics

```typescript
// Component
const { data: metrics } = useQuery({
  queryKey: ['metrics', appId],
  queryFn: () => metricsApi.getByApp(appId),
});

// OR with Redux
const dispatch = useAppDispatch();
useEffect(() => {
  dispatch(fetchMetrics(appId));
}, [appId]);
```

## Page Structure

### Dashboard Pages

1. **Overview** (`/app/dashboard/page.tsx`)
   - Key metrics overview
   - Performance trends
   - Alert summary
   - Recent activity

2. **Apps Catalog** (`/app/apps/page.tsx`)
   - App listing with filters
   - Search and status filtering
   - Quick app preview

3. **App Detail** (`/app/apps/[id]/page.tsx`)
   - Multi-tab interface (Overview, Performance, Queries, Alerts, Settings)
   - Detailed metrics and charts
   - Configuration management

4. **Alerts** (`/app/alerts/page.tsx`)
   - Alert listing with filters
   - Severity filtering
   - App filtering
   - Alert statistics

5. **Explore** (`/app/explore/page.tsx`)
   - Query testing interface
   - App selection
   - Query history
   - Response display

6. **Benchmarks** (`/app/benchmarks/page.tsx`)
   - Performance comparison
   - Charts and visualizations
   - Ranking and insights

7. **Governance** (`/app/governance/page.tsx`)
   - Policy management
   - Compliance tracking
   - Audit trail

8. **Settings** (`/app/settings/page.tsx`)
   - User profile
   - Notifications
   - Appearance
   - Security

## Key Features Implementation

### 1. Real-time Metrics

- Components subscribe to metrics via TanStack Query
- Auto-refresh with configurable intervals
- Stale-while-revalidate caching strategy

### 2. Responsive Design

- Mobile-first approach
- Tailwind breakpoints (sm, md, lg, xl)
- Adaptive layouts for different screen sizes
- Touch-friendly interactions on mobile

### 3. Dark Mode Support

- Via next-themes provider
- User preference storage
- System preference detection

### 4. Alert System

- Redux-managed alert state
- Filter by severity and application
- Real-time alert notifications
- Resolved/unresolved tracking

### 5. Chart Visualizations

- Recharts library for interactive charts
- Line, Area, Bar, and Radar charts
- Responsive containers
- Custom tooltips and legends

## Code Organization Best Practices

### Component Structure

```typescript
'use client'; // Client component directive when needed

import { imports } from 'appropriate-locations';

interface ComponentProps {
  // Type-safe props
}

export function ComponentName({ prop }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### Custom Hooks

Custom hooks in `/src/hooks/`:
- `useRedux.ts`: Typed Redux hooks (useAppDispatch, useAppSelector)
- Additional domain-specific hooks can be added

### API Usage Pattern

```typescript
// Always use the centralized services
import { appsApi } from '@/api/services';

const apps = await appsApi.getAll({ page: 1 });
```

## Performance Optimization

1. **Code Splitting**: Automatic via Next.js
2. **Image Optimization**: Via next/image (enabled where applicable)
3. **Caching Strategy**:
   - Redux for UI state
   - React Query for API data
   - 5-minute stale time for most queries
4. **Bundle Optimization**:
   - Tree-shaking enabled
   - Unused code elimination

## Security Measures

1. **API Security**:
   - Token-based authentication
   - Request interceptors for auth headers
   - Automatic 401 handling

2. **Input Validation**:
   - Type safety via TypeScript
   - Form validation via Zod (when needed)

3. **Environment Variables**:
   - Sensitive data in .env.local
   - Public variables prefixed with NEXT_PUBLIC_

4. **CORS**: Configured on backend

## Error Handling Strategy

1. **API Errors**: Centralized via ApiErrorHandler
2. **Component Errors**: Can use Error Boundaries (implement when needed)
3. **Form Errors**: Via React Hook Form + Zod
4. **User Feedback**: Toast notifications via Sonner

## Testing Recommendations

1. **Unit Tests**: Test utility functions and formatting
2. **Component Tests**: Test components in isolation
3. **Integration Tests**: Test data fetching and state management
4. **E2E Tests**: Test complete user workflows

## Deployment Considerations

1. **Build Optimization**:
   ```bash
   pnpm build
   ```

2. **Environment Setup**: Configure env variables for production

3. **API Endpoint**: Update NEXT_PUBLIC_API_URL for production

4. **Monitoring**: Implement error tracking (Sentry recommended)

## Future Enhancements

1. **Real-time Updates**: WebSocket integration for live metrics
2. **Advanced Analytics**: Machine learning for anomaly detection
3. **Custom Dashboards**: User-defined widget layouts
4. **Report Generation**: PDF/CSV exports
5. **Mobile App**: React Native version
6. **Offline Support**: Progressive Web App (PWA)
7. **Collaboration**: Real-time collaboration features

## Documentation Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Redux Toolkit](https://redux-toolkit.js.org)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
- [Recharts](https://recharts.org)

---

This architecture supports scalability, maintainability, and performance while providing a solid foundation for enterprise applications.
