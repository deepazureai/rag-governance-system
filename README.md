# RAG LLM Evaluation Platform

A production-grade enterprise application for evaluating, monitoring, and managing Retrieval-Augmented Generation (RAG) based Large Language Model applications.

## 📋 Overview

This platform provides comprehensive tools for:
- **Real-time Monitoring**: Track performance metrics, latency, and success rates
- **Quality Evaluation**: Measure retrieval accuracy, generation quality, and relevance scores
- **Alert Management**: Configure and manage alerts across all RAG applications
- **Performance Benchmarking**: Compare applications and track improvements
- **Governance & Compliance**: Enforce policies and maintain audit trails
- **Query Exploration**: Test queries directly against your RAG applications

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 16 with React 19
- **State Management**: Redux Toolkit + Redux Query
- **API Integration**: Axios + TanStack Query (React Query)
- **UI Framework**: shadcn/ui with Tailwind CSS
- **Charting**: Recharts
- **Type Safety**: TypeScript

### Folder Structure
```
├── app/                          # Next.js App Router pages
│   ├── dashboard/               # Overview page
│   ├── apps/                    # App catalog & detail pages
│   ├── alerts/                  # Alerts management
│   ├── explore/                 # Query exploration
│   ├── benchmarks/              # Performance benchmarks
│   ├── governance/              # Policies & compliance
│   ├── settings/                # User settings
│   └── layout.tsx               # Root layout
├── src/
│   ├── components/
│   │   ├── dashboard/           # Dashboard-specific components
│   │   ├── layout/              # Layout components (sidebar, header)
│   │   └── providers.tsx        # Redux & React Query providers
│   ├── api/
│   │   ├── client.ts            # Axios client with interceptors
│   │   └── services.ts          # API service functions
│   ├── store/                   # Redux store & slices
│   │   ├── index.ts             # Store configuration
│   │   └── slices/              # Redux slices (filters, ui, app, alerts)
│   ├── hooks/
│   │   └── useRedux.ts          # Redux hooks (useAppDispatch, useAppSelector)
│   ├── types/                   # TypeScript type definitions
│   ├── utils/
│   │   └── format.ts            # Utility functions (format, styling)
│   ├── data/
│   │   └── mockData.ts          # Mock data for development
│   └── lib/
│       └── utils.ts             # Shared utilities (cn function)
├── public/                       # Static assets
├── package.json                 # Dependencies
└── tsconfig.json                # TypeScript config
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. **Install dependencies**
```bash
pnpm install
```

2. **Set up environment variables**
Create a `.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

3. **Run development server**
```bash
pnpm dev
```

4. **Open in browser**
Navigate to `http://localhost:3000`

## 📖 Usage

### Key Features

#### Dashboard Overview
The main landing page displays:
- Key performance metrics (retrieval accuracy, response quality, latency, success rate)
- Query performance trends over time
- Relevance score analytics
- Recent alerts and system status

#### Application Catalog
Browse and manage RAG applications:
- Filter by status (active, inactive, archived)
- Search by name, description, or owner
- View application details and configuration
- Quick access to performance metrics

#### App Detail Page
Comprehensive application management with tabs:
- **Overview**: Key metrics and recent activity
- **Performance**: Detailed performance charts and trends
- **Query Logs**: View recent queries and their scores
- **Alerts**: Configure alert rules
- **Settings**: Application configuration

#### Alerts Management
Centralized alert system:
- Filter by severity (critical, warning, info)
- Filter by application
- Mark alerts as resolved
- View alert history
- Summary statistics

#### Explore & Query
Test your RAG applications:
- Select an application
- Execute queries directly
- View responses with relevance scores
- Maintain query history
- Copy responses for documentation

#### Benchmarks
Compare performance across applications:
- Visual comparison charts
- Performance profiles
- Detailed metrics tables
- Ranking and insights

#### Governance & Compliance
Manage policies and compliance:
- Privacy, security, quality, and compliance policies
- Rule configuration and management
- Compliance status tracking
- Audit trail of policy changes

#### Settings
User and application preferences:
- Profile management
- Notification preferences
- Appearance customization
- Security settings

## 🔧 Development

### Redux State Management

The store includes four slices:

**filtersSlice**: Manages global filters
- App ID, status, date range
- Search query, severity filter
- Sort configuration

**uiSlice**: Manages UI state
- Sidebar state, dark mode
- Selected app, active tab
- Modal and notification state

**appSlice**: Manages application data
- Current app, app list
- Loading and error states

**alertsSlice**: Manages alert data
- Alert list and filtering
- Loading state

### API Integration

All API calls go through the centralized `apiClient`:

```typescript
import { appsApi, metricsApi, alertsApi } from '@/api/services';

// Fetch apps
const apps = await appsApi.getAll({ page: 1, pageSize: 10 });

// Get metrics for an app
const metrics = await metricsApi.getByApp('app-id');
```

### Styling

Uses Tailwind CSS with shadcn/ui components:
- Responsive design with mobile-first approach
- Dark mode support via next-themes
- Custom colors defined in tailwind.config.ts
- Utility classes for common patterns

### Type Safety

All data is fully typed:
```typescript
import { App, EvaluationMetric, Alert } from '@/types';
```

## 🔐 Security Considerations

The application includes:
- Token-based authentication (configured in API client)
- Request/response interceptors
- Automatic 401 error handling
- TypeScript for type safety
- Environment variable management

## 📊 Charts & Visualizations

Using Recharts for:
- Line charts (performance trends)
- Area charts (relevance scores)
- Bar charts (query volume)
- Radar charts (performance comparison)

## 🎨 UI/UX Design

### Design Principles
- **Intuitive Navigation**: Clear sidebar with active state indicators
- **Business-Focused**: Card-based metrics for quick insights
- **Responsive**: Mobile-first, works on all screen sizes
- **Accessibility**: ARIA labels, semantic HTML, keyboard navigation
- **Professional**: Clean design with consistent spacing and typography

### Color Scheme
- Primary: Blue (#3b82f6)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Danger: Red (#ef4444)
- Neutral: Slate grays

## 🚀 Deployment

### Build for Production
```bash
pnpm build
pnpm start
```

### Environment Variables for Production
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NODE_ENV=production
```

## 📝 Mock Data

The application includes comprehensive mock data in `/src/data/mockData.ts` for development and testing. Replace this with real API calls when ready.

## 🔄 Next Steps for Production

1. **Connect Real API**: Replace mock data with actual backend API calls
2. **Authentication**: Implement proper auth (OAuth, JWT, etc.)
3. **Database**: Set up backend database
4. **Error Handling**: Enhance error boundaries and logging
5. **Testing**: Add unit and integration tests
6. **Monitoring**: Integrate application monitoring (Sentry, etc.)
7. **Performance**: Optimize bundle size and implement code splitting
8. **Security**: Add rate limiting, CORS, and security headers

## 📞 Support

For issues or questions, please refer to the documentation or contact your development team.

---

Built with Next.js, React, Redux Toolkit, and Tailwind CSS for enterprise-grade RAG evaluation.
