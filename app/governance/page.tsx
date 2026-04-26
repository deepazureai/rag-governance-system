'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface GovernanceMetrics {
  latency: {
    retrieval: { p50: number; p95: number; p99: number };
    llm: { p50: number; p95: number; p99: number };
    total: { p50: number; p95: number; p99: number };
  };
  tokens: {
    promptTokens: { min: number; max: number; avg: number; total: number };
    responseTokens: { min: number; max: number; avg: number; total: number };
    totalTokens: { min: number; max: number; avg: number; total: number };
  };
  cost: {
    costPerQuery: { min: number; max: number; avg: number };
    dailyEstimatedCost: number;
    tokensPerDollar: number;
  };
  errors: {
    errorRate: number;
    timeoutRate: number;
    partialRate: number;
    successRate: number;
  };
  trends: {
    latencyTrend: 'improving' | 'degrading' | 'stable';
    latencyChangePercent: number;
    tokenTrend: 'increasing' | 'decreasing' | 'stable';
    tokenChangePercent: number;
    errorTrend: 'improving' | 'worsening' | 'stable';
    errorChangePercent: number;
  };
}

interface Application {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'archived';
}



export default function GovernancePage() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [governanceMetrics, setGovernanceMetrics] = useState<GovernanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/applications`);
      const data = await response.json();
      if (data.applications) {
        setApplications(data.applications);
        if (data.applications.length > 0) {
          setSelectedAppIds([data.applications[0].id]);
        }
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  const fetchGovernanceMetrics = async () => {
    if (selectedAppIds.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const appId = selectedAppIds[0];
      
      const response = await fetch(
        `${apiUrl}/api/governance-metrics/ai-activity/${appId}/latest`
      );
      
      if (!response.ok) throw new Error('Failed to fetch governance metrics');
      
      const data = await response.json();
      setGovernanceMetrics(data.data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching governance metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (mounted && selectedAppIds.length > 0) {
      fetchGovernanceMetrics();
    }
  }, [selectedAppIds, mounted]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Activity Governance</h1>
            <p className="text-gray-600 mt-1">Monitor system performance, latency, costs, and reliability</p>
          </div>
          <Button
            onClick={fetchGovernanceMetrics}
            disabled={isLoading || selectedAppIds.length === 0}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="w-4 h-4" />
            {isLoading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Application Selector */}
        <Card className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">Select Application</label>
          <div className="flex gap-2 flex-wrap">
            {applications.map((app) => (
              <button
                key={app.id}
                onClick={() => setSelectedAppIds([app.id])}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedAppIds.includes(app.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {app.name}
              </button>
            ))}
          </div>
        </Card>

        {/* Error State */}
        {error && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error Loading Metrics</h3>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card className="p-12">
            <div className="flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-gray-600 mt-4">Calculating governance metrics...</p>
            </div>
          </Card>
        )}

        {/* Metrics Display */}
        {governanceMetrics && !isLoading && (
          <>
            {/* Latency Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Latency Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Retrieval Latency */}
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Context Retrieval</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P50</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {Math.round(governanceMetrics.latency.retrieval.p50)}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P95</span>
                      <span className="text-lg font-semibold text-orange-600">
                        {Math.round(governanceMetrics.latency.retrieval.p95)}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P99</span>
                      <span className="text-lg font-semibold text-red-600">
                        {Math.round(governanceMetrics.latency.retrieval.p99)}ms
                      </span>
                    </div>
                  </div>
                </Card>

                {/* LLM Latency */}
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">LLM Processing</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P50</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {Math.round(governanceMetrics.latency.llm.p50)}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P95</span>
                      <span className="text-lg font-semibold text-orange-600">
                        {Math.round(governanceMetrics.latency.llm.p95)}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P99</span>
                      <span className="text-lg font-semibold text-red-600">
                        {Math.round(governanceMetrics.latency.llm.p99)}ms
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Total Latency */}
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Total End-to-End</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P50</span>
                      <span className="text-lg font-semibold text-gray-900">
                        {Math.round(governanceMetrics.latency.total.p50)}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P95</span>
                      <span className="text-lg font-semibold text-orange-600">
                        {Math.round(governanceMetrics.latency.total.p95)}ms
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">P99</span>
                      <span className="text-lg font-semibold text-red-600">
                        {Math.round(governanceMetrics.latency.total.p99)}ms
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Token Usage Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Token Usage</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Prompt Tokens */}
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Prompt Tokens</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Min</span>
                      <span className="text-lg font-semibold">{governanceMetrics.tokens.promptTokens.min}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {Math.round(governanceMetrics.tokens.promptTokens.avg)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Max</span>
                      <span className="text-lg font-semibold">{governanceMetrics.tokens.promptTokens.max}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-600">Total:</span>
                      <span className="text-lg font-semibold ml-2">{governanceMetrics.tokens.promptTokens.total}</span>
                    </div>
                  </div>
                </Card>

                {/* Response Tokens */}
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Response Tokens</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Min</span>
                      <span className="text-lg font-semibold">{governanceMetrics.tokens.responseTokens.min}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {Math.round(governanceMetrics.tokens.responseTokens.avg)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Max</span>
                      <span className="text-lg font-semibold">{governanceMetrics.tokens.responseTokens.max}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-600">Total:</span>
                      <span className="text-lg font-semibold ml-2">{governanceMetrics.tokens.responseTokens.total}</span>
                    </div>
                  </div>
                </Card>

                {/* Total Tokens */}
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Total Tokens</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Min</span>
                      <span className="text-lg font-semibold">{governanceMetrics.tokens.totalTokens.min}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg</span>
                      <span className="text-lg font-semibold text-blue-600">
                        {Math.round(governanceMetrics.tokens.totalTokens.avg)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Max</span>
                      <span className="text-lg font-semibold">{governanceMetrics.tokens.totalTokens.max}</span>
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-600">Total:</span>
                      <span className="text-lg font-semibold ml-2">{governanceMetrics.tokens.totalTokens.total}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Cost Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Cost Analysis</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Cost Per Query</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Min</span>
                      <span className="text-lg font-semibold">${governanceMetrics.cost.costPerQuery.min.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg</span>
                      <span className="text-lg font-semibold text-green-600">
                        ${governanceMetrics.cost.costPerQuery.avg.toFixed(4)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Max</span>
                      <span className="text-lg font-semibold">${governanceMetrics.cost.costPerQuery.max.toFixed(4)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Estimated Daily Cost</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-green-600">
                      ${governanceMetrics.cost.dailyEstimatedCost.toFixed(2)}
                    </span>
                    <span className="text-sm text-gray-600 mb-1">/day</span>
                  </div>
                </Card>

                <Card className="p-6">
                  <h3 className="font-semibold text-gray-700 mb-4">Efficiency</h3>
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold text-blue-600">
                      {Math.round(governanceMetrics.cost.tokensPerDollar)}
                    </span>
                    <span className="text-sm text-gray-600 mb-1">tokens/$</span>
                  </div>
                </Card>
              </div>
            </div>

            {/* Reliability Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reliability & Errors</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.round(governanceMetrics.errors.successRate)}%
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Error Rate</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round(governanceMetrics.errors.errorRate)}%
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    <div>
                      <p className="text-sm text-gray-600">Timeout Rate</p>
                      <p className="text-2xl font-bold text-red-600">
                        {Math.round(governanceMetrics.errors.timeoutRate)}%
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-yellow-600" />
                    <div>
                      <p className="text-sm text-gray-600">Partial Rate</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {Math.round(governanceMetrics.errors.partialRate)}%
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Trends Section */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-4">Trends</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Latency Trend */}
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Latency Trend</h3>
                      <p className="text-sm text-gray-600 capitalize">{governanceMetrics.trends.latencyTrend}</p>
                    </div>
                    {governanceMetrics.trends.latencyTrend === 'improving' ? (
                      <TrendingDown className="w-6 h-6 text-green-600" />
                    ) : governanceMetrics.trends.latencyTrend === 'degrading' ? (
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    ) : (
                      <div className="w-6 h-6 text-gray-400">─</div>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-4 text-gray-900">
                    {Math.abs(governanceMetrics.trends.latencyChangePercent).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">change from baseline</p>
                </Card>

                {/* Token Trend */}
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Token Trend</h3>
                      <p className="text-sm text-gray-600 capitalize">{governanceMetrics.trends.tokenTrend}</p>
                    </div>
                    {governanceMetrics.trends.tokenTrend === 'decreasing' ? (
                      <TrendingDown className="w-6 h-6 text-green-600" />
                    ) : governanceMetrics.trends.tokenTrend === 'increasing' ? (
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    ) : (
                      <div className="w-6 h-6 text-gray-400">─</div>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-4 text-gray-900">
                    {Math.abs(governanceMetrics.trends.tokenChangePercent).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">change from baseline</p>
                </Card>

                {/* Error Trend */}
                <Card className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Error Trend</h3>
                      <p className="text-sm text-gray-600 capitalize">{governanceMetrics.trends.errorTrend}</p>
                    </div>
                    {governanceMetrics.trends.errorTrend === 'improving' ? (
                      <TrendingDown className="w-6 h-6 text-green-600" />
                    ) : governanceMetrics.trends.errorTrend === 'worsening' ? (
                      <TrendingUp className="w-6 h-6 text-red-600" />
                    ) : (
                      <div className="w-6 h-6 text-gray-400">─</div>
                    )}
                  </div>
                  <p className="text-2xl font-bold mt-4 text-gray-900">
                    {Math.abs(governanceMetrics.trends.errorChangePercent).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-600 mt-1">change from baseline</p>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && !governanceMetrics && selectedAppIds.length > 0 && !error && (
          <Card className="p-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Governance Metrics Yet</h3>
            <p className="text-gray-600">
              Run a batch process to generate evaluation data, which will calculate governance metrics automatically.
            </p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
