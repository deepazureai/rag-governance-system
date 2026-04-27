import { useState } from 'react';
import { useApplications } from '@/hooks/useApplications';
import { useGovernanceMetrics } from '@/hooks/useGovernanceMetrics';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GovernancePage() {
  const { applications, isLoading: appsLoading } = useApplications();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const { metrics, isLoading, isRefreshing, refreshMetrics } = useGovernanceMetrics(selectedAppId);

  const selectedApp = applications.find(app => app.id === selectedAppId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Activity Governance</h1>
          <p className="text-gray-600">Monitor system performance, latency, costs, and reliability</p>
        </div>
        <Button
          onClick={refreshMetrics}
          disabled={!selectedAppId || isRefreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Application Selector */}
      <Card className="p-6">
        <label className="block text-sm font-medium mb-3">Select Application</label>
        {appsLoading ? (
          <div className="text-gray-500">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="text-gray-500">No applications available</div>
        ) : (
          <select
            value={selectedAppId || ''}
            onChange={(e) => setSelectedAppId(e.target.value || null)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select an application --</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        )}
      </Card>

      {/* Metrics Display */}
      {selectedApp && (
        <div className="space-y-6">
          {isLoading ? (
            <Card className="p-6 text-center text-gray-500">Loading metrics...</Card>
          ) : !metrics ? (
            <Card className="p-6 flex items-center gap-3 text-yellow-700 bg-yellow-50 border border-yellow-200">
              <AlertCircle className="w-5 h-5" />
              <span>No governance metrics calculated yet. Run batch processing to generate metrics.</span>
            </Card>
          ) : (
            <>
              {/* Performance Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Avg Response Latency"
                  value={`${metrics.avgResponseLatency}ms`}
                  subtext={`P95: ${metrics.p95Latency}ms`}
                />
                <MetricCard
                  label="Throughput"
                  value={`${metrics.throughputQueriesPerMin.toFixed(2)} q/min`}
                />
                <MetricCard
                  label="Error Rate"
                  value={`${metrics.errorRate.toFixed(2)}%`}
                  isAlert={metrics.errorRate > 5}
                />
                <MetricCard
                  label="Compliance Rate"
                  value={`${metrics.complianceRate.toFixed(2)}%`}
                  isGood={metrics.complianceRate >= 80}
                />
              </div>

              {/* Resource Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  label="Total Tokens Used"
                  value={metrics.totalTokensUsed.toLocaleString()}
                />
                <MetricCard
                  label="Unique Users"
                  value={metrics.uniqueUsers.toString()}
                />
                <MetricCard
                  label="Last Updated"
                  value={new Date(metrics.calculatedAt).toLocaleTimeString()}
                />
              </div>

              {/* RAGA Metrics Averages */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">RAGA Metrics Averages</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {Object.entries(metrics.ragaMetricsAverages).map(([metric, value]) => (
                    <div key={metric} className="bg-gray-50 p-3 rounded-lg">
                      <div className="text-sm text-gray-600 capitalize">{metric.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="text-lg font-semibold">{(value as number).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Metric Compliance */}
              <Card className="p-6">
                <h3 className="font-semibold mb-4">Metric Compliance</h3>
                <div className="space-y-3">
                  {Object.entries(metrics.metricCompliance).map(([metric, compliance]) => (
                    <div key={metric} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{metric.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              (compliance as number) >= 80 ? 'bg-green-500' : (compliance as number) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min((compliance as number), 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{(compliance as number).toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, subtext, isAlert, isGood }: {
  label: string;
  value: string | number;
  subtext?: string;
  isAlert?: boolean;
  isGood?: boolean;
}) {
  return (
    <Card className={`p-4 ${isAlert ? 'bg-red-50 border-red-200' : isGood ? 'bg-green-50 border-green-200' : ''}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${isAlert ? 'text-red-600' : isGood ? 'text-green-600' : ''}`}>
        {value}
      </div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </Card>
  );
}
