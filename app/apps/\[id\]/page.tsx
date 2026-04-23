'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RefreshCw, Settings } from 'lucide-react';
import Link from 'next/link';
import { EvaluationLogsViewer } from '@/src/components/dashboard/evaluation-logs-viewer';
import { useApplicationMetrics } from '@/src/hooks/useApplicationMetrics';
import { useApplicationSLA } from '@/src/hooks/useApplicationSLA';

interface Application {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  status: 'active' | 'inactive' | 'archived';
  framework?: string;
  dataSource: {
    type: string;
    config?: any;
  };
  metricsCount: number;
  initialDataProcessingStatus: string;
  createdAt: string;
  updatedAt: string;
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const applicationId = params.id as string;
  
  const [app, setApp] = useState<Application | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { records, metrics, isLoading: metricsLoading, error: metricsError } = useApplicationMetrics(applicationId);
  const { slaConfig, isLoading: slaLoading } = useApplicationSLA(applicationId);

  // Fetch application details
  useEffect(() => {
    if (!applicationId) return;

    const fetchApplication = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const response = await fetch(`${apiUrl}/api/applications/${applicationId}`, {
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch application: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.success) {
          setApp(result.data);
          setAppError(null);
        } else {
          throw new Error(result.message || 'Failed to load application');
        }
      } catch (err: any) {
        console.error('[v0] Error fetching application:', err);
        setAppError(err.message || 'Failed to load application');
      } finally {
        setAppLoading(false);
      }
    };

    fetchApplication();
  }, [applicationId]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Trigger re-evaluation
      await new Promise(resolve => setTimeout(resolve, 1000));
      window.location.reload();
    } finally {
      setRefreshing(false);
    }
  };

  if (appLoading) {
    return (
      <DashboardLayout>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-12 bg-gray-200 rounded" />
        </div>
      </DashboardLayout>
    );
  }

  if (appError || !app) {
    return (
      <DashboardLayout>
        <Card className="p-6 bg-red-50 border border-red-200">
          <p className="text-red-800">{appError || 'Application not found'}</p>
          <Link href="/apps">
            <Button className="mt-4">Back to Applications</Button>
          </Link>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/apps">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{app.name}</h1>
              <Badge className={`text-xs ${
                app.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : app.status === 'inactive'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
              }`}>
                {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
              </Badge>
            </div>
            <p className="text-gray-600">{app.description}</p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 mr-2"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link href={`/apps/${applicationId}/settings`}>
            <Button variant="outline" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>

        {/* Application Info Card */}
        <Card className="p-6 bg-white border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Application Information</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Owner</p>
              <p className="text-sm text-gray-900">{app.owner || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Framework</p>
              <p className="text-sm text-gray-900">{app.framework || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Data Source</p>
              <p className="text-sm text-gray-900 capitalize">{app.dataSource?.type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Metrics Count</p>
              <p className="text-sm text-gray-900 font-bold text-blue-600">{app.metricsCount || 0}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Processing Status</p>
              <Badge className="text-xs mt-1">{app.initialDataProcessingStatus}</Badge>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1">Created</p>
              <p className="text-sm text-gray-900">{new Date(app.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </Card>

        {/* Metrics Tabs */}
        {app.metricsCount > 0 && metrics && (
          <Card className="p-6 bg-white border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluation Metrics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-xs text-blue-600 font-semibold mb-1">Faithfulness</p>
                <p className="text-2xl font-bold text-blue-700">{metrics.averageMetrics.faithfulness.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-purple-50 rounded border border-purple-200">
                <p className="text-xs text-purple-600 font-semibold mb-1">Answer Relevancy</p>
                <p className="text-2xl font-bold text-purple-700">{metrics.averageMetrics.answer_relevancy.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-green-50 rounded border border-green-200">
                <p className="text-xs text-green-600 font-semibold mb-1">Context Relevancy</p>
                <p className="text-2xl font-bold text-green-700">{metrics.averageMetrics.context_relevancy.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-xs text-yellow-600 font-semibold mb-1">Context Precision</p>
                <p className="text-2xl font-bold text-yellow-700">{metrics.averageMetrics.context_precision.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-pink-50 rounded border border-pink-200">
                <p className="text-xs text-pink-600 font-semibold mb-1">Context Recall</p>
                <p className="text-2xl font-bold text-pink-700">{metrics.averageMetrics.context_recall.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
                <p className="text-xs text-indigo-600 font-semibold mb-1">Correctness</p>
                <p className="text-2xl font-bold text-indigo-700">{metrics.averageMetrics.correctness.toFixed(1)}</p>
              </div>
              <div className={`p-3 rounded border ${
                metrics.slaCompliance >= 70
                  ? 'bg-green-50 border-green-200'
                  : metrics.slaCompliance >= 50
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-red-50 border-red-200'
              }`}>
                <p className="text-xs font-semibold mb-1">{metrics.slaCompliance >= 70 ? 'SLA' : 'SLA'} Compliance</p>
                <p className={`text-2xl font-bold ${
                  metrics.slaCompliance >= 70
                    ? 'text-green-700'
                    : metrics.slaCompliance >= 50
                      ? 'text-yellow-700'
                      : 'text-red-700'
                }`}>
                  {metrics.slaCompliance.toFixed(1)}%
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Tabs for Overview and Raw Data */}
        {app.metricsCount > 0 && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="logs">Evaluation Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="p-6 bg-white border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Summary</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-green-50 rounded border border-green-200">
                    <p className="text-sm text-green-600 font-semibold">Excellent</p>
                    <p className="text-3xl font-bold text-green-700 mt-2">{metrics?.healthyRecords || 0}</p>
                    <p className="text-xs text-green-600 mt-1">≥70% SLA</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                    <p className="text-sm text-yellow-600 font-semibold">Good</p>
                    <p className="text-3xl font-bold text-yellow-700 mt-2">{metrics?.warningRecords || 0}</p>
                    <p className="text-xs text-yellow-600 mt-1">50-69% SLA</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded border border-red-200">
                    <p className="text-sm text-red-600 font-semibold">Needs Improvement</p>
                    <p className="text-3xl font-bold text-red-700 mt-2">{metrics?.criticalRecords || 0}</p>
                    <p className="text-xs text-red-600 mt-1">&lt;50% SLA</p>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <EvaluationLogsViewer 
                records={records} 
                isLoading={metricsLoading}
                applicationSLA={slaConfig}
              />
            </TabsContent>
          </Tabs>
        )}

        {app.metricsCount === 0 && (
          <Card className="p-8 text-center bg-blue-50 border border-blue-200">
            <p className="text-blue-900 font-medium">No evaluation data available yet</p>
            <p className="text-sm text-blue-700 mt-2">Data will appear here once evaluation metrics are processed</p>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
