'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface GovernanceMetrics {
  _id: string;
  applicationId: string;
  applicationName: string;
  period: 'daily' | 'weekly' | 'monthly';
  periodDate: string;
  totalTokensUsed: number;
  avgResponseLatency: number;
  throughputQueriesPerMin: number;
  p95Latency: number;
  errorRate: number;
  complianceRate: number;
  slaDeviationRate: number;
  avgPromptLength: number;
  avgContextLength: number;
  avgResponseLength: number;
  uniqueUsers: number;
  recordsPerUser: number;
  metricCompliance: Record<string, number>;
  trend: {
    complianceRateTrend: 'up' | 'down' | 'stable';
    latencyTrend: 'up' | 'down' | 'stable';
    errorRateTrend: 'up' | 'down' | 'stable';
  };
}

interface Application {
  _id: string;
  applicationId: string;
  name: string;
}

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    case 'stable':
      return <Minus className="w-4 h-4 text-gray-600" />;
    default:
      return null;
  }
};

const MetricCard = ({
  title,
  value,
  unit,
  trend,
  isGoodUp = true,
}: {
  title: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  isGoodUp?: boolean;
}) => {
  let trendColor = 'text-gray-600';
  if (trend === 'up') {
    trendColor = isGoodUp ? 'text-green-600' : 'text-red-600';
  } else if (trend === 'down') {
    trendColor = isGoodUp ? 'text-red-600' : 'text-green-600';
  }

  return (
    <Card className="p-4 bg-white">
      <p className="text-xs text-gray-600 mb-2">{title}</p>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-2xl font-bold text-gray-900">
          {value.toFixed(1)}{unit}
        </p>
        {trend && <div className={`${trendColor}`}>{getTrendIcon(trend)}</div>}
      </div>
    </Card>
  );
};

export default function GovernancePage() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<GovernanceMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [comparisonMode, setComparisonMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchApplications();
  }, []);

  useEffect(() => {
    if (selectedAppIds.length > 0 && mounted) {
      fetchMetrics();
    }
  }, [selectedAppIds, period, mounted]);

  // Disable comparison mode if not exactly 2 apps
  useEffect(() => {
    if (selectedAppIds.length !== 2) {
      setComparisonMode(false);
    }
  }, [selectedAppIds]);

  const fetchApplications = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/applications`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setApplications(result.data);
          if (result.data.length > 0 && selectedAppIds.length === 0) {
            setSelectedAppIds([result.data[0].applicationId]);
          }
        }
      }
    } catch (error) {
      console.error('[v0] Error fetching applications:', error);
    }
  };

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const metricPromises = selectedAppIds.map((appId) =>
        fetch(
          `${apiUrl}/api/governance-metrics/applications/${appId}?period=${period}&limit=1`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        ).then((res) => res.json())
      );

      const results = await Promise.all(metricPromises);
      const allMetrics: GovernanceMetrics[] = [];

      results.forEach((result) => {
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          allMetrics.push(result.data[0]);
        }
      });

      setMetrics(allMetrics);
    } catch (error) {
      console.error('[v0] Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  const canCompare = selectedAppIds.length === 2;
  const app1Metrics = metrics.find(
    (m) => m.applicationId === selectedAppIds[0]
  );
  const app2Metrics = metrics.find(
    (m) => m.applicationId === selectedAppIds[1]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Governance Metrics</h1>
          <p className="text-gray-600 mt-2">
            Monitor quality, performance, and SLA compliance metrics
          </p>
        </div>

        {/* Period & Comparison Controls */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex gap-2">
              {['daily', 'weekly', 'monthly'].map((p) => (
                <Button
                  key={p}
                  onClick={() => setPeriod(p as 'daily' | 'weekly' | 'monthly')}
                  className={
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </Button>
              ))}
            </div>

            {/* Application Selection */}
            <div className="flex flex-wrap gap-2">
              {applications.map((app) => (
                <Button
                  key={app.applicationId}
                  onClick={() =>
                    setSelectedAppIds(
                      selectedAppIds.includes(app.applicationId)
                        ? selectedAppIds.filter((id) => id !== app.applicationId)
                        : [...selectedAppIds, app.applicationId]
                    )
                  }
                  className={
                    selectedAppIds.includes(app.applicationId)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }
                >
                  {app.name}
                </Button>
              ))}
            </div>

            {/* Comparison Toggle */}
            {canCompare && (
              <Button
                onClick={() => setComparisonMode(!comparisonMode)}
                className={
                  comparisonMode
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-800'
                }
              >
                {comparisonMode ? 'Exit Comparison' : 'Compare Apps'}
              </Button>
            )}
          </div>
        </Card>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : metrics.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">No metrics available for selected applications</p>
          </Card>
        ) : comparisonMode && app1Metrics && app2Metrics ? (
          // Comparison View
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">
              {app1Metrics.applicationName} vs {app2Metrics.applicationName}
            </h2>

            {/* Compliance Rate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 border-l-4 border-l-blue-500">
                <p className="text-sm text-gray-600 mb-2">
                  {app1Metrics.applicationName} - Compliance Rate
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {app1Metrics.complianceRate.toFixed(1)}%
                </p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(app1Metrics.trend.complianceRateTrend)}
                  <span className="text-xs text-gray-600">
                    {app1Metrics.trend.complianceRateTrend}
                  </span>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-purple-500">
                <p className="text-sm text-gray-600 mb-2">
                  {app2Metrics.applicationName} - Compliance Rate
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {app2Metrics.complianceRate.toFixed(1)}%
                </p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(app2Metrics.trend.complianceRateTrend)}
                  <span className="text-xs text-gray-600">
                    {app2Metrics.trend.complianceRateTrend}
                  </span>
                </div>
              </Card>
            </div>

            {/* Latency Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 border-l-4 border-l-blue-500">
                <p className="text-sm text-gray-600 mb-2">
                  {app1Metrics.applicationName} - Avg Latency
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {app1Metrics.avgResponseLatency.toFixed(0)}ms
                </p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(app1Metrics.trend.latencyTrend)}
                  <span className="text-xs text-gray-600">
                    Lower is better • {app1Metrics.trend.latencyTrend}
                  </span>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-purple-500">
                <p className="text-sm text-gray-600 mb-2">
                  {app2Metrics.applicationName} - Avg Latency
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {app2Metrics.avgResponseLatency.toFixed(0)}ms
                </p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(app2Metrics.trend.latencyTrend)}
                  <span className="text-xs text-gray-600">
                    Lower is better • {app2Metrics.trend.latencyTrend}
                  </span>
                </div>
              </Card>
            </div>

            {/* Error Rate Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 border-l-4 border-l-blue-500">
                <p className="text-sm text-gray-600 mb-2">
                  {app1Metrics.applicationName} - Error Rate
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {app1Metrics.errorRate.toFixed(2)}%
                </p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(app1Metrics.trend.errorRateTrend)}
                  <span className="text-xs text-gray-600">
                    Lower is better • {app1Metrics.trend.errorRateTrend}
                  </span>
                </div>
              </Card>

              <Card className="p-6 border-l-4 border-l-purple-500">
                <p className="text-sm text-gray-600 mb-2">
                  {app2Metrics.applicationName} - Error Rate
                </p>
                <p className="text-3xl font-bold text-gray-900 mb-1">
                  {app2Metrics.errorRate.toFixed(2)}%
                </p>
                <div className="flex items-center gap-2">
                  {getTrendIcon(app2Metrics.trend.errorRateTrend)}
                  <span className="text-xs text-gray-600">
                    Lower is better • {app2Metrics.trend.errorRateTrend}
                  </span>
                </div>
              </Card>
            </div>
          </div>
        ) : (
          // Individual Metrics View
          <div className="space-y-6">
            {metrics.map((metric) => (
              <div key={metric._id} className="space-y-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {metric.applicationName}
                </h2>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Compliance Rate"
                    value={metric.complianceRate}
                    unit="%"
                    trend={metric.trend.complianceRateTrend}
                    isGoodUp={true}
                  />
                  <MetricCard
                    title="Avg Latency"
                    value={metric.avgResponseLatency}
                    unit="ms"
                    trend={metric.trend.latencyTrend}
                    isGoodUp={false}
                  />
                  <MetricCard
                    title="Error Rate"
                    value={metric.errorRate}
                    unit="%"
                    trend={metric.trend.errorRateTrend}
                    isGoodUp={false}
                  />
                  <MetricCard
                    title="P95 Latency"
                    value={metric.p95Latency}
                    unit="ms"
                  />
                </div>

                {/* Additional Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Tokens"
                    value={metric.totalTokensUsed}
                    unit="k"
                  />
                  <MetricCard
                    title="Throughput"
                    value={metric.throughputQueriesPerMin}
                    unit=" q/min"
                  />
                  <MetricCard
                    title="Unique Users"
                    value={metric.uniqueUsers}
                    unit=""
                  />
                  <MetricCard
                    title="Records/User"
                    value={metric.recordsPerUser}
                    unit=""
                  />
                </div>

                {/* Content Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    title="Avg Prompt Length"
                    value={metric.avgPromptLength}
                    unit=" words"
                  />
                  <MetricCard
                    title="Avg Context Length"
                    value={metric.avgContextLength}
                    unit=" words"
                  />
                  <MetricCard
                    title="Avg Response Length"
                    value={metric.avgResponseLength}
                    unit=" words"
                  />
                </div>

                {/* Per-Metric Compliance */}
                {Object.keys(metric.metricCompliance).length > 0 && (
                  <Card className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Per-Metric Compliance
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      {Object.entries(metric.metricCompliance).map(([name, compliance]) => (
                        <div key={name} className="p-3 bg-gray-50 rounded">
                          <p className="text-xs text-gray-600 mb-1">{name}</p>
                          <p className="text-lg font-bold text-gray-900">
                            {compliance.toFixed(1)}%
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
