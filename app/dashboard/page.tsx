'use client';

import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { ApplicationsTable } from '@/src/components/dashboard/applications-table';
import { MetricsDisplay } from '@/src/components/dashboard/metrics-display';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { mockApps, mockAlerts } from '@/src/data/mockData';
import { useAppSelector, useAppDispatch } from '@/src/hooks/useRedux';
import { selectApps } from '@/src/store/slices/appSelectionSlice';
import { useMetricsFetch } from '@/src/hooks/useMetricsFetch';
import Link from 'next/link';

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const dispatch = useAppDispatch();
  const selectedAppIds = useAppSelector((state) => state.appSelection.selectedAppIds);
  const { metrics, isLoading, error, refreshMetrics } = useMetricsFetch();

  // Auto-select first app on mount
  useEffect(() => {
    setMounted(true);
    if (mockApps.length > 0 && selectedAppIds.length === 0) {
      dispatch(selectApps([mockApps[0].id]));
    }
  }, []);

  // Fetch metrics when selected apps change
  useEffect(() => {
    if (selectedAppIds.length > 0) {
      refreshMetrics(selectedAppIds);
    }
  }, [selectedAppIds, refreshMetrics]);

  const handleRefresh = async () => {
    if (selectedAppIds.length > 0) {
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
          <p className="text-gray-600">Monitor metrics for your RAG applications</p>
        </div>

        {/* Applications Table with Multi-Select */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Applications</h2>
            <p className="text-sm text-gray-600">
              {selectedAppIds.length > 0 ? `${selectedAppIds.length} selected` : 'No selection'}
            </p>
          </div>
          <ApplicationsTable
            applications={mockApps}
            onRefresh={handleRefresh}
            isRefreshing={isLoading}
          />
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
