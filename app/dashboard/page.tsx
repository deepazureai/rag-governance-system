'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { MetricCard } from '@/src/components/dashboard/metric-card';
import { AppSelector } from '@/src/components/dashboard/app-selector';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockMetrics, mockQueryPerformance, mockRelevanceScores, mockAlerts, mockGovernanceMetrics, mockDetailedMetrics, mockApps } from '@/src/data/mockData';
import { formatDateTime } from '@/src/utils/format';
import { getFilteredMetrics, getFilteredAlerts, getFilteredGovernanceMetrics } from '@/src/utils/dashboardFilters';
import { GovernanceMetricsGrid } from '@/src/components/dashboard/governance-metrics-grid';
import { EvaluationMetricsGrid } from '@/src/components/dashboard/evaluation-metrics-grid';
import { EvaluationMetricsRadar } from '@/src/components/dashboard/evaluation-metrics-radar';
import { useAppSelector } from '@/src/hooks/useRedux';
import { useAppDispatch } from '@/src/hooks/useRedux';
import { setApps } from '@/src/store/slices/appSlice';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const selectedAppIds = useAppSelector((state) => state.appSelection.selectedAppIds);
  const apps = useAppSelector((state) => state.app.apps);
  const displayApps = apps.length > 0 ? apps : mockApps;

  useEffect(() => {
    setMounted(true);
    if (apps.length === 0) {
      dispatch(setApps(mockApps));
    }
  }, []);

  const handleRefreshApp = async (appId: string) => {
    setRefreshing(appId);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      console.log('[v0] Refreshed metrics for app:', appId);
    } finally {
      setRefreshing(null);
    }
  };

  const filteredData = useMemo(() => {
    return {
      metrics: getFilteredMetrics(selectedAppIds, mockApps),
      alerts: getFilteredAlerts(selectedAppIds, mockApps),
      governanceMetrics: getFilteredGovernanceMetrics(selectedAppIds),
    };
  }, [selectedAppIds]);

  if (!mounted) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </DashboardLayout>
    );
  }

  const unresolvedAlerts = filteredData.alerts.filter((a) => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === 'critical');

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Overview</h1>
          <p className="text-gray-600">
            Real-time metrics and performance monitoring for your RAG applications
          </p>
        </div>

        {/* Application Selector */}
        <AppSelector />

        {/* Bulk Refresh for Selected Applications */}
        {selectedAppIds.length > 0 && (
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Selected Applications</h3>
                <p className="text-sm text-blue-700">
                  Showing metrics for {selectedAppIds.length} application{selectedAppIds.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                onClick={() => {
                  setRefreshing('bulk');
                  setTimeout(() => setRefreshing(null), 1500);
                }}
                disabled={refreshing === 'bulk'}
                className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing === 'bulk' ? 'animate-spin' : ''}`} />
                {refreshing === 'bulk' ? 'Refreshing...' : 'Refresh All'}
              </Button>
            </div>
          </Card>
        )}

        {/* All Applications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">All Applications</h2>
            <Link href="/apps/new">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                + Add Application
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayApps.map((app) => (
              <Card key={app.id} className="p-4 bg-white hover:shadow-lg transition-shadow">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{app.name}</h3>
                    <p className="text-sm text-gray-600 truncate">{app.description}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Status</p>
                      <p className={`font-semibold ${app.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>
                        {app.status === 'active' ? '✓ Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-600">Owner</p>
                      <p className="font-semibold text-gray-900">{app.owner}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRefreshApp(app.id)}
                    disabled={refreshing === app.id}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded border transition-all ${
                      refreshing === app.id
                        ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${refreshing === app.id ? 'animate-spin' : ''}`}
                    />
                    {refreshing === app.id ? 'Refreshing...' : 'Refresh Metrics'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Alert Banner */}
        {criticalAlerts.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-900 mb-1">
                {criticalAlerts.length} Critical Alert{criticalAlerts.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-sm text-red-800 mb-3">
                {criticalAlerts.map((a) => a.message).join('; ')}
              </p>
              <Link href="/alerts">
                <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-100">
                  View Alerts
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Evaluation Metrics</h2>
            <EvaluationMetricsGrid metrics={filteredData.metrics.metrics} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EvaluationMetricsRadar metrics={mockDetailedMetrics} title="Quality Evaluation Profile" />
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Safety & Compliance</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="font-medium text-gray-900">Safety Score</p>
                    <p className="text-sm text-gray-600">Absence of harmful content</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{mockDetailedMetrics.safety.toFixed(1)}%</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="font-medium text-gray-900">Harmfulness Detection</p>
                    <p className="text-sm text-gray-600">Blocked harmful responses</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{(100 - mockDetailedMetrics.harmfulness).toFixed(1)}%</p>
                </div>
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div>
                    <p className="font-medium text-gray-900">Factuality Score</p>
                    <p className="text-sm text-gray-600">Accuracy of factual claims</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{mockDetailedMetrics.factuality.toFixed(1)}%</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Governance Metrics */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Governance & Infrastructure Metrics</h2>
          <GovernanceMetricsGrid metrics={filteredData.governanceMetrics} />
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Query Performance Chart */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Query Performance Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockQueryPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  tick={{ fontSize: 12 }}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return [value.toFixed(1), ''];
                    }
                    return value;
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="averageLatency"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444', r: 4 }}
                  name="Avg Latency (ms)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="successRate"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 4 }}
                  name="Success Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Relevance Scores Chart */}
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Relevance Scores Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockRelevanceScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                  }}
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return [value.toFixed(1) + '%', ''];
                    }
                    return value;
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="overall"
                  stroke="#3b82f6"
                  fill="#93c5fd"
                  name="Overall Relevance"
                />
                <Area
                  type="monotone"
                  dataKey="retrieval"
                  stroke="#8b5cf6"
                  fill="#d8b4fe"
                  name="Retrieval"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Alerts */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Alerts</h2>
            <Link href="/alerts">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {mockAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mt-1">
                  {alert.resolved ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : alert.severity === 'critical' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{alert.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(alert.timestamp)} • {alert.resolved ? 'Resolved' : 'Active'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
