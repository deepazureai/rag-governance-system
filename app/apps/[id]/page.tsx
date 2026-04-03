'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { MetricCard } from '@/src/components/dashboard/metric-card';
import { mockApps, mockMetrics, mockQueryPerformance, mockRelevanceScores, mockGovernanceMetrics, mockDetailedMetrics } from '@/src/data/mockData';
import { getStatusColor, formatDateTime } from '@/src/utils/format';
import { GovernanceMetricsGrid } from '@/src/components/dashboard/governance-metrics-grid';
import { EvaluationMetricsGrid } from '@/src/components/dashboard/evaluation-metrics-grid';
import { EvaluationMetricsRadar } from '@/src/components/dashboard/evaluation-metrics-radar';

interface AppDetailPageProps {
  params: {
    id: string;
  };
}

export default function AppDetailPage({ params }: AppDetailPageProps) {
  const router = useRouter();
  const app = mockApps.find((a) => a.id === params.id);
  const [activeTab, setActiveTab] = useState('overview');

  if (!app) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Not Found</h1>
          <Link href="/apps">
            <Button variant="outline">Back to Apps</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
              <Badge className={`text-xs ${getStatusColor(app.status)}`}>
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-600">{app.description}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* App Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-white">
            <p className="text-xs text-gray-600 mb-1">Framework</p>
            <p className="font-semibold text-gray-900">{app.ragFramework}</p>
          </Card>
          <Card className="p-4 bg-white">
            <p className="text-xs text-gray-600 mb-1">Data Source</p>
            <p className="font-semibold text-gray-900 truncate">{app.dataSource}</p>
          </Card>
          <Card className="p-4 bg-white">
            <p className="text-xs text-gray-600 mb-1">Owner</p>
            <p className="font-semibold text-gray-900">{app.owner}</p>
          </Card>
          <Card className="p-4 bg-white">
            <p className="text-xs text-gray-600 mb-1">Deployed</p>
            <p className="font-semibold text-gray-900">
              {new Date(app.deploymentDate).toLocaleDateString()}
            </p>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-6 bg-white border-b border-gray-200 rounded-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="queries">Query Logs</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="settings" className="hidden md:inline-flex">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {mockMetrics.map((metric) => (
                <MetricCard key={metric.id} metric={metric} />
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {[
                    { time: '2 hours ago', event: 'Accuracy improved to 92.5%' },
                    { time: '4 hours ago', event: 'Response latency reduced to 245ms' },
                    { time: '1 day ago', event: 'New model version deployed' },
                    { time: '3 days ago', event: 'Maintenance completed' },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.event}</p>
                        <p className="text-xs text-gray-500">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Query Length</span>
                    <span className="font-medium">2048 tokens</span>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Retrieval Top-K</span>
                    <span className="font-medium">5 documents</span>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Temperature</span>
                    <span className="font-medium">0.7</span>
                  </div>
                  <div className="border-t border-gray-200" />
                  <div className="flex justify-between">
                    <span className="text-gray-600">Response Timeout</span>
                    <span className="font-medium">30 seconds</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Evaluation Tab */}
          <TabsContent value="evaluation" className="space-y-6 mt-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality & Safety Evaluation Metrics</h3>
              <EvaluationMetricsGrid metrics={mockMetrics} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EvaluationMetricsRadar metrics={mockDetailedMetrics} title="Quality Profile" />
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Summary</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Overall Quality Score</span>
                      <span className="text-2xl font-bold text-blue-700">91.3%</span>
                    </div>
                    <div className="h-2 bg-blue-200 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600" style={{ width: '91.3%' }} />
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Safety & Compliance</span>
                      <span className="text-2xl font-bold text-green-700">99.2%</span>
                    </div>
                    <div className="h-2 bg-green-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600" style={{ width: '99.2%' }} />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Factuality & Accuracy</span>
                      <span className="text-2xl font-bold text-purple-700">96.1%</span>
                    </div>
                    <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-600" style={{ width: '96.1%' }} />
                    </div>
                  </div>

                  <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700">Response Completeness</span>
                      <span className="text-2xl font-bold text-orange-700">88.5%</span>
                    </div>
                    <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-600" style={{ width: '88.5%' }} />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Metrics Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mockRelevanceScores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="retrieval"
                    stroke="#3b82f6"
                    name="Retrieval Quality"
                  />
                  <Line
                    type="monotone"
                    dataKey="generation"
                    stroke="#8b5cf6"
                    name="Generation Quality"
                  />
                  <Line
                    type="monotone"
                    dataKey="overall"
                    stroke="#10b981"
                    name="Overall Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
            {/* Governance Metrics */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Governance Metrics</h3>
              <GovernanceMetricsGrid metrics={mockGovernanceMetrics} />
            </div>

            {/* Query Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Performance</h3>
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
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="averageLatency"
                      stroke="#ef4444"
                      name="Avg Latency (ms)"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="successRate"
                      stroke="#22c55e"
                      name="Success Rate (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Query Volume</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mockQueryPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="queryCount" fill="#3b82f6" name="Query Count" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Relevance Scores Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={mockRelevanceScores}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
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
          </TabsContent>

          {/* Query Logs Tab */}
          <TabsContent value="queries" className="space-y-6 mt-6">
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Queries</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Query</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Latency</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Score</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { query: 'How to reset password?', latency: '234ms', score: 92, time: '5m ago' },
                      {
                        query: 'What are the pricing options?',
                        latency: '187ms',
                        score: 88,
                        time: '12m ago',
                      },
                      { query: 'Integration with Slack', latency: '456ms', score: 85, time: '1h ago' },
                    ].map((item, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 text-gray-900">{item.query}</td>
                        <td className="py-3 px-3 text-gray-600">{item.latency}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              item.score >= 90
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {item.score}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-600">{item.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6 mt-6">
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Rules</h3>
              <div className="space-y-3">
                {[
                  { name: 'Retrieval Accuracy Drop', condition: '< 90%', enabled: true },
                  { name: 'High Latency', condition: '> 500ms', enabled: true },
                  { name: 'Error Rate Spike', condition: '> 5%', enabled: false },
                ].map((rule, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{rule.name}</p>
                      <p className="text-sm text-gray-600">Threshold: {rule.condition}</p>
                    </div>
                    <input type="checkbox" checked={rule.enabled} readOnly className="w-5 h-5" />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Settings</h3>
              <p className="text-gray-600">Manage application configuration and permissions.</p>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Edit Settings</Button>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
