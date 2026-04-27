'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GovernancePage() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const res = await fetch(`${apiUrl}/api/applications`);
      const data = await res.json();
      const apps = data.applications || data.data || [];
      setApplications(apps);
      if (apps.length > 0) {
        setSelectedAppId(apps[0].id);
      }
    } catch (err) {
      setError('Failed to load applications');
      console.error(err);
    }
  };

  useEffect(() => {
    if (selectedAppId && mounted) {
      loadMetrics();
    }
  }, [selectedAppId, mounted]);

  const loadMetrics = async () => {
    if (!selectedAppId) return;
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const res = await fetch(`${apiUrl}/api/governance-metrics/ai-activity/${selectedAppId}/latest`);
      const data = await res.json();
      setMetrics(data.data || null);
    } catch (err) {
      setError('Failed to load governance metrics');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!selectedAppId) return;
    setIsLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const res = await fetch(`${apiUrl}/api/governance-metrics/ai-activity/${selectedAppId}/calculate`, {
        method: 'POST',
      });
      const data = await res.json();
      setMetrics(data.data || null);
    } catch (err) {
      setError('Failed to refresh metrics');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  const llmLatency = metrics?.latency?.llmProcessing;
  const totalLatency = metrics?.latency?.total;
  const tokens = metrics?.tokens;
  const errors = metrics?.errors;
  const trends = metrics?.trends;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI Activity Governance</h1>
            <p className="text-gray-600 mt-1">Monitor system performance, latency, costs, and reliability</p>
          </div>
          <Button onClick={handleRefresh} disabled={isLoading || !selectedAppId} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Application Selector */}
        <Card className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Application</label>
          {applications.length === 0 ? (
            <p className="text-gray-500">No applications found</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {applications.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    selectedAppId === app.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {app.name}
                </button>
              ))}
            </div>
          )}
        </Card>

        {/* Error */}
        {error && <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-200">{error}</div>}

        {/* Loading */}
        {isLoading && <div className="text-center py-12">Loading governance metrics...</div>}

        {/* Empty State */}
        {!isLoading && !metrics && selectedAppId && (
          <Card className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900">No Governance Metrics</h3>
            <p className="text-gray-600 mt-2">Run batch processing to generate metrics</p>
          </Card>
        )}

        {/* Metrics Grid */}
        {metrics && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* LLM Latency */}
            {llmLatency && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-700 mb-4">LLM Processing</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">P50</span>
                    <span className="font-semibold">{Math.round(llmLatency.p50)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">P95</span>
                    <span className="font-semibold text-orange-600">{Math.round(llmLatency.p95)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">P99</span>
                    <span className="font-semibold text-red-600">{Math.round(llmLatency.p99)}ms</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Total Latency */}
            {totalLatency && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-700 mb-4">Total End-to-End</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">P50</span>
                    <span className="font-semibold">{Math.round(totalLatency.p50)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">P95</span>
                    <span className="font-semibold text-orange-600">{Math.round(totalLatency.p95)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">P99</span>
                    <span className="font-semibold text-red-600">{Math.round(totalLatency.p99)}ms</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Token Usage */}
            {tokens && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-700 mb-4">Token Usage</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Input</span>
                    <span className="font-semibold">{Math.round(tokens.promptTokens.avg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Avg Output</span>
                    <span className="font-semibold">{Math.round(tokens.responseTokens.avg)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="font-semibold">{tokens.totalTokens.total}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Error Rate */}
            {errors && (
              <Card className="p-6">
                <h3 className="font-semibold text-gray-700 mb-4">Error & Reliability</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <span className="font-semibold text-green-600">{errors.successRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Error Rate</span>
                    <span className="font-semibold text-red-600">{errors.errorRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Timeout Rate</span>
                    <span className="font-semibold text-orange-600">{errors.timeoutRate.toFixed(1)}%</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Latency Trend */}
            {trends && (
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-700">Latency Trend</h3>
                    <p className="text-sm text-gray-600 capitalize mt-1">{trends.latencyTrend}</p>
                  </div>
                  {trends.latencyTrend === 'improving' ? (
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  ) : trends.latencyTrend === 'degrading' ? (
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  ) : (
                    <div className="w-6 h-6 text-gray-400">─</div>
                  )}
                </div>
                <p className="text-2xl font-bold mt-4">{Math.abs(trends.latencyChangePercent).toFixed(1)}%</p>
                <p className="text-xs text-gray-600">change from baseline</p>
              </Card>
            )}

            {/* Token Trend */}
            {trends && (
              <Card className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-700">Token Trend</h3>
                    <p className="text-sm text-gray-600 capitalize mt-1">{trends.tokenTrend}</p>
                  </div>
                  {trends.tokenTrend === 'decreasing' ? (
                    <TrendingDown className="w-6 h-6 text-green-600" />
                  ) : trends.tokenTrend === 'increasing' ? (
                    <TrendingUp className="w-6 h-6 text-red-600" />
                  ) : (
                    <div className="w-6 h-6 text-gray-400">─</div>
                  )}
                </div>
                <p className="text-2xl font-bold mt-4">{Math.abs(trends.tokenChangePercent).toFixed(1)}%</p>
                <p className="text-xs text-gray-600">change from baseline</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
