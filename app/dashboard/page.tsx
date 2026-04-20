'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { ApplicationsTable } from '@/src/components/dashboard/applications-table';
import { MetricsDisplay } from '@/src/components/dashboard/metrics-display';
import { AlertsDisplay, CollectiveAlertsSummary } from '@/src/components/dashboard/alerts-display';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppSelector, useAppDispatch } from '@/src/hooks/useRedux';
import { selectApps } from '@/src/store/slices/appSelectionSlice';
import { useMetricsFetch } from '@/src/hooks/useMetricsFetch';
import { useAlerts } from '@/src/hooks/useAlerts';
import { getFetchErrorMessage, getEmptyStateMessage } from '@/src/utils/apiErrorHandler';
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
  const { alerts, calculateAlertsForApp, getAggregatedAlerts, getAppAlerts, resolveAlert } = useAlerts();

  // Fetch all applications on mount
  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const endpoint = `${apiUrl}/api/applications`;
        console.log('[v0] Fetching applications from:', endpoint);
        
        const response = await fetch(endpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        
        console.log('[v0] Response status:', response.status);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        console.log('[v0] Applications response:', result);
        
        if (result.success) {
          setApplications(result.data || []);
          setAppsError(null);
        } else {
          throw new Error(result.message || 'Failed to fetch applications');
        }
      } catch (err) {
        let errorMsg = getFetchErrorMessage(err, 'load applications');
        
        // Add diagnostic information for network errors
        if (err instanceof TypeError && err.message.includes('fetch')) {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
          errorMsg = `Unable to connect to backend at ${apiUrl}. Make sure the backend server is running. Error: ${err.message}`;
        }
        
        console.error('[v0] Error fetching applications:', err);
        console.error('[v0] Error details:', { errorMsg, apiUrl: process.env.NEXT_PUBLIC_API_URL });
        setAppsError(errorMsg);
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

  // Calculate alerts when metrics update
  useEffect(() => {
    if (metrics && selectedAppIds.length > 0) {
      selectedAppIds.forEach((appId) => {
        if (metrics.metrics) {
          calculateAlertsForApp(appId, metrics.metrics);
        }
      });
    }
  }, [metrics, selectedAppIds, calculateAlertsForApp]);

  const handleRefresh = async () => {
    if (selectedAppIds.length > 0) {
      console.log('[v0] Refresh button clicked for apps:', selectedAppIds);
      await refreshMetrics(selectedAppIds);
    }
  };

  const allAlerts = getAggregatedAlerts();
  const unresolvedAlerts = allAlerts.filter((a) => !a.resolved);
  const criticalAlerts = unresolvedAlerts.filter((a) => a.severity === 'critical');
  const warningAlerts = unresolvedAlerts.filter((a) => a.severity === 'warning');

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
              <span className="font-semibold">Error:</span> {appsError}
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
              <p className="text-gray-700 text-lg">{getEmptyStateMessage('applications')}</p>
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

        {/* Collective Alerts Summary */}
        <CollectiveAlertsSummary
          totalUnresolved={unresolvedAlerts.length}
          criticalCount={criticalAlerts.length}
          warningCount={warningAlerts.length}
          healthyCount={unresolvedAlerts.length === 0 ? selectedAppIds.length : 0}
        />

        {/* Alerts Section */}
        {unresolvedAlerts.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Active Alerts</h2>
            <AlertsDisplay
              alerts={unresolvedAlerts.slice(0, 5)}
              onResolve={resolveAlert}
            />
            {unresolvedAlerts.length > 5 && (
              <Link href="/alerts">
                <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
                  View All {unresolvedAlerts.length} Alerts
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
