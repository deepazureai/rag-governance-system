# Comprehensive Metrics Coverage

This document details all evaluation and governance metrics covered in the RAG LLM Evaluation Platform.

## Evaluation Metrics (Quality & Safety)

The platform provides comprehensive evaluation of RAG response quality through the following metrics:

### Quality Metrics
1. **Groundedness** (0-100%)
   - Measures how well responses are grounded in source documents
   - High groundedness indicates responses directly reference retrieved documents
   - Location: Dashboard > Evaluation Metrics, App Detail > Evaluation Tab, Explore > Query Metrics

2. **Relevance Score** (0-100%)
   - Assesses how relevant responses are to user queries
   - Combines retrieval relevance and generation relevance
   - Location: Dashboard > Evaluation Metrics, Benchmarks > Comparison

3. **Fluency** (0-100%)
   - Evaluates natural language quality of generated responses
   - Measures readability and linguistic coherence
   - Location: Dashboard > Evaluation Metrics, App Detail > Evaluation Tab

4. **Coherence** (0-100%)
   - Assesses logical consistency throughout responses
   - Ensures response doesn't contradict itself
   - Location: Dashboard > Evaluation Metrics, App Detail > Evaluation Tab

5. **Completeness** (0-100%)
   - Measures how thoroughly responses address queries
   - Ensures no important aspects are omitted
   - Location: Dashboard > Evaluation Metrics, App Detail > Evaluation Tab

6. **Factuality** (0-100%)
   - Evaluates accuracy of factual claims in responses
   - Checks for hallucinations or incorrect information
   - Location: Dashboard > Safety & Compliance, App Detail > Evaluation Tab

### Safety & Compliance Metrics

7. **Safety Score** (0-100%)
   - Measures absence of harmful content in responses
   - Detects and flags inappropriate or dangerous content
   - Location: Dashboard > Safety & Compliance Section
   - Target: >98% for production systems

8. **Harmfulness Detection** (Detection Rate %)
   - Rate of successfully identified harmful content
   - Percentage of blocked harmful responses
   - Location: Dashboard > Safety & Compliance, Governance > Policies

---

## Governance Metrics (Infrastructure & Performance)

The platform monitors operational governance through real-time infrastructure metrics:

### Token Management
- **Total Tokens Used** (tokens)
  - Cumulative tokens consumed in current period
  - Tracks API usage against quota
  - Location: Governance Page, App Detail > Performance Tab
  - Threshold: Configurable per application

- **Tokens per Query** (average)
  - Mean number of tokens consumed per query
  - Helps estimate costs and optimize prompts
  - Tracked in Query Logs

### Performance Metrics

- **Average Response Latency** (milliseconds)
  - Mean time to generate complete response
  - Includes retrieval + generation time
  - Location: Dashboard, Governance Page, App Detail > Performance Tab
  - Target: <300ms for optimal UX

- **P95 Latency** (milliseconds)
  - 95th percentile response time
  - Identifies performance outliers
  - Location: Governance Page
  - Threshold: <1000ms

### Throughput Metrics

- **Queries Per Minute (QPM)** (queries/min)
  - Number of queries processed per minute
  - Indicates system capacity utilization
  - Location: Governance Page
  - Shows trend: UP (improved capacity)

- **Query Volume** (absolute count)
  - Total queries in time period
  - Tracks usage patterns
  - Location: App Detail > Performance Tab (daily/weekly/monthly)

### Latency Metrics

- **Query Response Time Distribution**
  - P50 (median), P95, P99 latencies
  - Identify baseline vs outliers
  - Location: App Detail > Performance Charts

- **Retrieval Latency** (ms)
  - Time spent retrieving documents
  - Optimization opportunity identification
  - Part of Query Log metrics

- **Generation Latency** (ms)
  - Time spent generating response
  - Indicates LLM performance
  - Part of Query Log metrics

### Reliability Metrics

- **Success Rate** (%)
  - Percentage of queries completed successfully
  - Excludes timeouts and errors
  - Location: Dashboard, Performance Charts
  - Target: >98%

- **Error Rate** (%)
  - Percentage of failed queries
  - Identifies system issues
  - Location: Governance Page
  - Target: <2%

- **Timeout Rate** (%)
  - Percentage exceeding timeout threshold
  - Location: Governance Page
  - Threshold: <2%

### Optimization Metrics

- **Cache Hit Rate** (%)
  - Percentage of queries served from cache
  - Reduces latency and token usage
  - Location: Governance Page
  - Target: >20% for mature systems

### Cost Metrics

- **Estimated Monthly Cost** ($)
  - Projected API usage cost
  - Based on token consumption and pricing
  - Location: Governance Page, Query Logs
  - Threshold: Configurable budget

- **Cost Per Query** ($)
  - Average cost per query
  - Helps identify expensive queries
  - Location: Query Logs detailed view

---

## Metric Display Locations

### Dashboard
- **Top Section**: Evaluation Metrics Grid (8 metrics)
- **Middle Section**: Evaluation Radar Chart + Safety/Compliance Cards
- **Lower Section**: Governance Metrics Grid (8 metrics)
- **Charts**: Query Performance, Relevance Trends

### App Catalog Page
- Application status indicators
- High-level health metrics per app

### App Detail Page
- **Overview Tab**: Quick metrics snapshot
- **Evaluation Tab**: Complete evaluation metrics with radar chart and scoring
- **Performance Tab**: Governance metrics + performance charts
- **Query Logs Tab**: Per-query evaluation and governance metrics
- **Alerts Tab**: Metric threshold violations

### Explore Page
- **Query Metrics Display**: Detailed evaluation metrics for executed queries
- **Token Tracking**: Real-time token usage display
- **Cost Display**: Cost estimation per query

### Benchmarks Page
- **Comparison Charts**: Multi-app evaluation metrics side-by-side
- **Radar Charts**: Quality profile comparison

### Governance Page
- **Governance Metrics Grid**: All 8 governance metrics with status
- **Policies List**: Associated compliance policies
- **Metrics Trends**: Historical governance metric performance

### Alerts Page
- Metric threshold breaches
- Alert severity based on metric values

---

## Metric Categories

### By Type
1. **Quality Metrics**: Groundedness, Relevance, Fluency, Coherence, Completeness, Factuality
2. **Safety Metrics**: Safety Score, Harmfulness Detection
3. **Performance Metrics**: Latency, Success Rate, Error Rate, Cache Hit Rate
4. **Throughput Metrics**: Queries/min, Query Volume, Timeout Rate
5. **Cost Metrics**: Total Cost, Cost per Query
6. **Token Metrics**: Total Tokens, Tokens per Query

### By Audience
- **Business Users**: Evaluation metrics (quality, safety), cost metrics
- **Operations**: Governance metrics (latency, throughput, errors)
- **Data Scientists**: Detailed evaluation breakdowns, trends
- **Compliance**: Safety metrics, policy adherence metrics

---

## Real-Time Data

All metrics are updated in real-time:
- Dashboard refreshes every 30 seconds (configurable)
- Query-specific metrics populate within query latency
- Governance metrics stream continuously
- Historical data available for trend analysis (7 days default)

---

## Integration Points

### Alert Thresholds
- Critical: Metric falls below critical threshold
- Warning: Metric approaches warning threshold
- Info: Metric crosses informational threshold

### API Endpoints
All metrics available via REST API:
- `/api/metrics/evaluation` - Evaluation metrics
- `/api/metrics/governance` - Governance metrics
- `/api/metrics/query/{id}` - Query-specific metrics
- `/api/apps/{id}/metrics` - App-specific metrics

### Export Capabilities
- CSV export of metric history
- Dashboard snapshots
- Report generation with metric summaries
