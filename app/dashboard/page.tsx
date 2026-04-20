'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { ApplicationsTable } from '@/src/components/dashboard/applications-table';
import { MetricsDisplay } from '@/src/components/dashboard/metrics-display';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockAlerts } from '@/src/data/mockData';
import { useAppSelector, useAppDispatch } from '@/src/hooks/useRedux';
import { selectApps } from '@/src/store/slices/appSelectionSlice';
import { useMetricsFetch } from '@/src/hooks/useMetricsFetch';
import Link from 'next/link';

interface Application {
  id: string;
  name: string;
  description?: string;
  owner?: string;
  status: 'active' | 'inactive' | 'archived';
  framework?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const selectedAppIds = useAppSelector((state) => state.appSelection.selectedAppIds);
  const { metrics, isLoading, error, refreshMetrics } = useMetricsFetch();

  // Fetch all applications on mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        console.log('[v0] Fetching applications from:', `${apiUrl}/api/applications`);
        
        const response = await fetch(`${apiUrl}/api/applications`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[v0] Applications fetched successfully:', result.data?.length || 0, 'apps');
        setApplications(result.data || []);
        setAppsError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[v0] Error fetching applications:', errorMsg);
        setAppsError(`Unable to load applications. Backend may not be running. Details: ${errorMsg}`);
      } finally {
        setAppsLoading(false);
      }
    };

    setMounted(true);
    fetchApplications();
  }, []);

  // Auto-select first app when applications load
  useEffect(() => {
    if (applications.length > 0 && selectedAppIds.length === 0) {
      console.log('[v0] Auto-selecting first application:', applications[0].id);
      dispatch(selectApps([applications[0].id]));
    }
  }, [applications, selectedAppIds.length, dispatch]);

  // Fetch metrics when selected apps change
  useEffect(() => {
    if (selectedAppIds.length > 0) {
      console.log('[v0] Selected apps changed, fetching metrics for:', selectedAppIds);
      refreshMetrics(selectedAppIds);
    }
  }, [selectedAppIds, refreshMetrics]);

  const handleRefresh = async () => {
    if (selectedAppIds.length > 0) {
      console.log('[v0] Refresh button clicked for apps:', selectedAppIds);
      await refreshMetrics(selectedAppIds);
    }
  };

  const unresolvedAlerts = mockAlerts.filter((a) => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === 'critical');

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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
          <p className="text-gray-600">Select and monitor metrics for your RAG applications</p>
        </div>

        {/* Applications Loading Error */}
        {appsError && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Error loading applications:</span> {appsError}
            </p>
          </Card>
        )}

        {/* Applications Table with Multi-Select */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Applications</h2>
            <div className="flex items-center gap-4">
              {appsLoading && <span className="text-sm text-gray-600">Loading applications...</span>}
              {!appsLoading && (
                <p className="text-sm text-gray-600">
                  {applications.length} available · {selectedAppIds.length > 0 ? `${selectedAppIds.length} selected` : 'No selection'}
                </p>
              )}
            </div>
          </div>
          
          {appsLoading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse" />
          ) : applications.length === 0 ? (
            <Card className="p-12 bg-gray-50 border border-gray-200 text-center">
              <p className="text-gray-700 text-lg">No applications available.</p>
              <p className="text-gray-500 text-sm mt-2">Applications will appear here once they are added from the App Catalog.</p>
            </Card>
          ) : (
            <ApplicationsTable
              applications={applications}
              onRefresh={handleRefresh}
              isRefreshing={isLoading}
            />
          )}
        </div>

        {/* Refresh Button for Selected Apps */}
        {selectedAppIds.length > 0 && (
          <div className="flex gap-2">
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh Metrics'}
            </Button>
            {selectedAppIds.length > 1 && (
              <span className="text-sm text-gray-600 self-center">
                Fetching metrics from {selectedAppIds.length} applications
                {metrics?.type === 'aggregated' ? ' (aggregated/averaged)' : ''}
              </span>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">
              <span className="font-semibold">Error:</span> {error}
            </p>
          </Card>
        )}

        {/* Metrics Display */}
        <MetricsDisplay
          metrics={metrics?.metrics || null}
          applicationCount={metrics?.applicationCount}
          isLoading={isLoading}
          isEmpty={selectedAppIds.length === 0}
        />

        {/* Alerts Section */}
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
      </div>
    </DashboardLayout>
  );
}
