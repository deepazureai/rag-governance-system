# Metrics Integration Summary

## Quick Reference: Where Each Metric Is Displayed

### EVALUATION METRICS (Quality & Safety)

| Metric | Dashboard | App Detail | Explore | Benchmarks | Governance |
|--------|-----------|-----------|---------|-----------|-----------|
| **Groundedness** | ✅ Grid | ✅ Eval Tab | ✅ Query | ✅ Chart | - |
| **Relevance** | ✅ Grid | ✅ Eval Tab | ✅ Query | ✅ Chart | - |
| **Fluency** | ✅ Grid | ✅ Eval Tab | ✅ Query | - | - |
| **Safety** | ✅ Card | ✅ Eval Tab | ✅ Query | - | ✅ Policy |
| **Coherence** | ✅ Grid | ✅ Eval Tab | ✅ Query | - | - |
| **Completeness** | ✅ Grid | ✅ Eval Tab | ✅ Query | - | - |
| **Factuality** | ✅ Card | ✅ Eval Tab | - | - | ✅ Policy |
| **Harmfulness** | ✅ Card | ✅ Eval Tab | - | - | ✅ Policy |

### GOVERNANCE METRICS (Infrastructure & Performance)

| Metric | Dashboard | App Detail | Governance | Explore | Benchmarks |
|--------|-----------|-----------|-----------|---------|-----------|
| **Total Tokens Used** | ✅ Grid | ✅ Perf Tab | ✅ Grid | ✅ Display | - |
| **Avg Latency** | ✅ Grid | ✅ Perf Tab | ✅ Grid | - | - |
| **Throughput (QPM)** | ✅ Grid | ✅ Perf Tab | ✅ Grid | - | - |
| **P95 Latency** | ✅ Grid | ✅ Perf Tab | ✅ Grid | - | - |
| **Monthly Cost** | ✅ Grid | ✅ Perf Tab | ✅ Grid | ✅ Display | - |
| **Error Rate** | ✅ Grid | ✅ Chart | ✅ Grid | - | - |
| **Cache Hit Rate** | ✅ Grid | ✅ Perf Tab | ✅ Grid | - | - |
| **Timeout Rate** | ✅ Grid | ✅ Perf Tab | ✅ Grid | - | - |

---

## Data Flow Architecture

### Source → Display → Action

1. **Raw Query Data** (QueryLog objects)
   - ↓ contains evaluation metrics
   - ↓ contains performance data
   - ↓ contains token/cost info

2. **Evaluation Metrics Grid Component**
   - Displays all 8 evaluation metrics
   - Used on: Dashboard, App Detail Eval Tab
   - Color-coded by category
   - Shows trends

3. **Governance Metrics Grid Component**
   - Displays all 8 governance metrics
   - Used on: Dashboard, App Detail Performance Tab, Governance Page
   - Status indicators (healthy/warning/critical)
   - Threshold comparisons

4. **Evaluation Radar Chart Component**
   - Polar visualization of 7 quality dimensions
   - Used on: Dashboard, App Detail Eval Tab
   - Quick visual health assessment
   - Identifies strength/weakness areas

5. **Analytics & Alerts**
   - Metric thresholds trigger alerts
   - Alerts appear on Alerts page
   - Dashboard shows critical alerts banner

---

## Page-by-Page Metrics Summary

### 🏠 Dashboard
**Focus**: Executive overview of system health
- Evaluation Metrics: 8-metric grid
- Evaluation Profile: Radar chart + Safety cards
- Governance Metrics: 8-metric grid with 4 categories
- Trends: Query performance line chart

### 📱 App Catalog
**Focus**: Quick health check across all apps
- Status badges (Active/Inactive/Archived)
- Quick metrics display
- Direct links to detail pages

### 🔍 App Detail: Overview Tab
**Focus**: Application configuration and quick status
- Framework, datasource, owner info
- Recent activity log
- Configuration parameters

### 📊 App Detail: Evaluation Tab (NEW)
**Focus**: Deep dive into quality metrics
- 8 Evaluation metrics grid
- Quality profile radar chart
- Evaluation summary with progress bars
- Historical trend line chart (retrieval, generation, overall)

### ⚡ App Detail: Performance Tab (ENHANCED)
**Focus**: Infrastructure and operational metrics
- 8 Governance metrics grid
- Query performance line chart
- Query volume bar chart
- Latency distributions

### 📝 App Detail: Query Logs Tab
**Focus**: Individual query analysis
- Query history table
- Per-query evaluation metrics
- Token usage per query
- Cost per query

### 🚨 App Detail: Alerts Tab
**Focus**: Threshold violations
- Alert history with metrics
- Severity indicators
- Resolution status

### ⚙️ App Detail: Settings Tab
**Focus**: Configuration
- Alert thresholds
- Metric preferences
- Integration settings

### 🔎 Explore Page (ENHANCED)
**Focus**: Interactive query testing
- Test queries on selected app
- Live evaluation metrics display
- Token usage tracking
- Cost estimation
- Query performance comparison

### 📈 Benchmarks Page
**Focus**: Multi-app comparison
- Radar chart comparison
- Bar chart: Retrieval vs Generation vs Overall
- Benchmark creation/management

### 🏛️ Governance Page (ENHANCED)
**Focus**: Operational governance
- 8 Governance metrics grid (all categories)
- Policy management by type
- Compliance scoring
- Audit trail

### 🔔 Alerts Page
**Focus**: Metric anomalies
- All unresolved alerts
- Severity filtering
- Metric-triggered alerts
- Resolution workflow

### ⚙️ Settings Page
**Focus**: User preferences
- Metric refresh intervals
- Alert thresholds
- Display preferences
- Notification settings

---

## Data Types & Structures

### EvaluationMetric (Used for quality/safety)
```typescript
{
  id: string;
  name: string;
  description: string;
  value: number;           // 0-100
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  unit?: string;
  category?: 'quality' | 'safety' | 'relevance' | 'performance';
}
```

### GovernanceMetric (Used for infrastructure)
```typescript
{
  id: string;
  name: string;
  description: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  unit?: string;
  threshold?: number;
  status: 'healthy' | 'warning' | 'critical';
  category: 'tokens' | 'performance' | 'throughput' | 'latency' | 'cost';
}
```

### DetailedEvaluationMetrics (Per-query breakdown)
```typescript
{
  groundedness: number;
  relevance: number;
  fluency: number;
  safety: number;
  coherence: number;
  completeness: number;
  factuality: number;
  harmfulness: number;
}
```

### QueryLog (Individual query data)
```typescript
{
  id: string;
  appId: string;
  query: string;
  response: string;
  retrievedDocuments: Document[];
  relevanceScore: number;
  latency: number;
  timestamp: string;
  evaluationMetrics?: DetailedEvaluationMetrics;
  tokensUsed: number;
  costEstimate: number;
}
```

---

## Color Coding System

### Metric Status Colors
- **Green** (Healthy): Metric within normal range
- **Yellow** (Warning): Metric approaching threshold
- **Red** (Critical): Metric exceeding threshold

### Category Colors
- **Blue**: Retrieval & Relevance Quality
- **Green**: Generation & Fluency Quality
- **Purple**: Safety & Compliance
- **Orange**: Performance & Latency
- **Red**: Errors & Harmfulness
- **Pink**: Cost & Tokens
- **Indigo**: Throughput

---

## Update Frequency

- Dashboard: Real-time (30-60 sec refresh)
- App Detail: Real-time (10 sec refresh)
- Explore: Real-time (per query execution)
- Benchmarks: Manual refresh or 5 min auto-refresh
- Governance: Real-time (continuous update)
- Alerts: Real-time (as metrics breach thresholds)
- Query Logs: Real-time (as queries complete)

---

## API Endpoints for Metrics

All metrics accessible via Next.js API routes:

```
GET  /api/metrics/evaluation          → EvaluationMetric[]
GET  /api/metrics/governance          → GovernanceMetric[]
GET  /api/metrics/query/{id}          → DetailedEvaluationMetrics
GET  /api/apps/{id}/metrics           → App-specific metrics
POST /api/metrics/query-result        → Store query with metrics
GET  /api/benchmarks/{id}/compare     → Benchmark comparison data
```

---

## Next Steps for Integration

1. **Connect Real API**
   - Replace mock data with actual backend
   - Update `src/api/services.ts` endpoints
   - Implement RTK Query for data fetching

2. **Add More Metrics**
   - Custom evaluation metrics per application
   - Industry-specific governance metrics
   - Custom threshold definitions

3. **Advanced Analytics**
   - ML-based anomaly detection
   - Predictive performance alerts
   - Correlation analysis

4. **Export & Reporting**
   - PDF reports with metric summaries
   - CSV exports for analysis
   - Scheduled email reports

5. **Webhooks & Integrations**
   - Slack notifications on critical alerts
   - PagerDuty integration
   - Datadog/New Relic connections
