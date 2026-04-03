'use client';

import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { mockBenchmarks, mockApps } from '@/src/data/mockData';
import { Plus, TrendingUp } from 'lucide-react';

export default function BenchmarksPage() {
  const benchmark = mockBenchmarks[0];

  const radarData = benchmark.metrics.map((m) => ({
    name: m.appName.split(' ')[0],
    retrieval: m.retrieval,
    generation: m.generation,
    overall: m.overall,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Benchmarks</h1>
            <p className="text-gray-600">Compare performance across your RAG applications</p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Benchmark
          </Button>
        </div>

        {/* Active Benchmark */}
        {benchmark && (
          <>
            {/* Benchmark Info */}
            <Card className="p-6 bg-white">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">{benchmark.name}</h2>
                  <p className="text-gray-600">{benchmark.description}</p>
                </div>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {benchmark.appIds.length} Apps
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                Created: {new Date(benchmark.createdAt).toLocaleDateString()} • Updated:{' '}
                {new Date(benchmark.updatedAt).toLocaleDateString()}
              </div>
            </Card>

        {/* Metrics Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart Comparison */}
          <Card className="p-6 bg-white">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Performance Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={benchmark.metrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="appName" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="retrieval" fill="#3b82f6" name="Retrieval Accuracy" />
                <Bar dataKey="generation" fill="#8b5cf6" name="Generation Quality" />
                <Bar dataKey="overall" fill="#10b981" name="Overall Score" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

              {/* Radar Chart */}
              <Card className="p-6 bg-white">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Profile</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} />
                    <Radar name="Overall Score" dataKey="overall" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Detailed Metrics Table */}
            <Card className="p-6 bg-white">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Metrics</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Application</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Retrieval Score</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Generation Score</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Overall Score</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Query Volume</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">Rank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benchmark.metrics
                      .sort((a, b) => b.overall - a.overall)
                      .map((metric, idx) => (
                        <tr key={metric.appId} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{metric.appName}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-600"
                                  style={{ width: `${metric.retrieval}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                                {metric.retrieval}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-600"
                                  style={{ width: `${metric.generation}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-700 w-8 text-right">
                                {metric.generation}%
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                                metric.overall >= 90
                                  ? 'bg-green-100 text-green-800'
                                  : metric.overall >= 80
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              <TrendingUp className="w-3 h-3" />
                              {metric.overall}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center text-gray-700 font-medium">
                            {metric.queryCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge
                              className={
                                idx === 0
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                  : idx === 1
                                  ? 'bg-gray-100 text-gray-800 border-gray-300'
                                  : 'bg-orange-100 text-orange-800 border-orange-300'
                              }
                            >
                              #{idx + 1}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Insights */}
            <Card className="p-6 bg-blue-50 border border-blue-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Key Insights</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>
                    <span className="font-semibold">Top Performer:</span> Legal Document Analyzer leads
                    with 93.5% overall score
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>
                    <span className="font-semibold">Retrieval Strength:</span> All apps maintain 88%+ retrieval
                    accuracy
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">→</span>
                  <span>
                    <span className="font-semibold">High Volume:</span> Customer Support RAG processes 77% of
                    total queries
                  </span>
                </li>
              </ul>
            </Card>
          </>
        )}

        {/* All Benchmarks */}
        <Card className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">All Benchmarks</h3>
          <div className="space-y-3">
            {mockBenchmarks.map((bench) => (
              <div
                key={bench.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 group-hover:text-blue-600">{bench.name}</p>
                  <p className="text-sm text-gray-600">
                    {bench.appIds.length} applications • {bench.metrics.length} metrics
                  </p>
                </div>
                <Button variant="outline" size="sm">
                  View
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
