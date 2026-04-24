'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, ChevronDown, MessageSquare } from 'lucide-react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import Link from 'next/link';

interface Alert {
  _id: string;
  alertId: string;
  applicationId: string;
  alertLevel: 'row' | 'aggregated';
  metricName: string;
  actualValue: number;
  slaThreshold: number;
  deviation: number;
  status: 'open' | 'acknowledged' | 'dismissed';
  userComment?: string;
  createdAt: string;
  updatedAt: string;
}

interface Application {
  _id: string;
  applicationId: string;
  name: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'open':
      return 'bg-red-100 text-red-800';
    case 'acknowledged':
      return 'bg-yellow-100 text-yellow-800';
    case 'dismissed':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'open':
      return <AlertTriangle className="w-4 h-4" />;
    case 'acknowledged':
      return <ChevronDown className="w-4 h-4" />;
    case 'dismissed':
      return <Check className="w-4 h-4" />;
    default:
      return null;
  }
};

export default function AlertsPage() {
  const [mounted, setMounted] = useState(false);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAlerts, setSelectedAlerts] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('open');
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [bulkAction, setBulkAction] = useState<'close' | 'acknowledge' | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({ open: 0, acknowledged: 0, dismissed: 0 });

  // Fetch applications on mount
  useEffect(() => {
    setMounted(true);
    fetchApplications();
  }, []);

  // Fetch alerts when app selection changes
  useEffect(() => {
    if (selectedAppIds.length > 0 && mounted) {
      fetchAlerts();
    }
  }, [selectedAppIds, activeFilter, page, mounted]);

  const fetchApplications = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/applications`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setApplications(result.data);
          // Auto-select first app if available
          if (result.data.length > 0 && selectedAppIds.length === 0) {
            setSelectedAppIds([result.data[0].applicationId]);
          }
        }
      }
    } catch (error) {
      console.error('[v0] Error fetching applications:', error);
    }
  };

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      // Fetch alerts for each selected app
      const alertPromises = selectedAppIds.map((appId) =>
        fetch(
          `${apiUrl}/api/alerts/applications/${appId}?status=${activeFilter}&page=${page}&pageSize=${pageSize}`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        ).then((res) => res.json())
      );

      const results = await Promise.all(alertPromises);
      const allAlerts: Alert[] = [];
      let totalRecords = 0;

      results.forEach((result) => {
        if (result.success && Array.isArray(result.data.alerts)) {
          allAlerts.push(...result.data.alerts);
          totalRecords = result.data.pagination?.total || 0;
        }
      });

      setAlerts(allAlerts);
      setTotalCount(totalRecords);

      // Fetch summary for selected apps
      const summaryPromises = selectedAppIds.map((appId) =>
        fetch(`${apiUrl}/api/alerts/summary/${appId}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }).then((res) => res.json())
      );

      const summaryResults = await Promise.all(summaryPromises);
      let totalOpen = 0,
        totalAck = 0,
        totalDismissed = 0;

      summaryResults.forEach((result) => {
        if (result.success && result.data.summary) {
          totalOpen += result.data.summary.open || 0;
          totalAck += result.data.summary.acknowledged || 0;
          totalDismissed += result.data.summary.dismissed || 0;
        }
      });

      setSummary({ open: totalOpen, acknowledged: totalAck, dismissed: totalDismissed });
      setSelectedAlerts(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('[v0] Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertSelect = (alertId: string) => {
    const newSelected = new Set(selectedAlerts);
    if (newSelected.has(alertId)) {
      newSelected.delete(alertId);
    } else {
      newSelected.add(alertId);
    }
    setSelectedAlerts(newSelected);
    setSelectAll(false);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedAlerts(new Set());
      setSelectAll(false);
    } else {
      const allIds = new Set(alerts.map((a) => a.alertId));
      setSelectedAlerts(allIds);
      setSelectAll(true);
    }
  };

  const handleBulkAction = async (action: 'close' | 'acknowledge') => {
    setBulkAction(action);
    setShowCommentModal(true);
  };

  const submitBulkAction = async () => {
    if (!bulkAction || selectedAlerts.size === 0) return;

    setIsLoading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      // Process bulk action for each selected app
      for (const appId of selectedAppIds) {
        await fetch(`${apiUrl}/api/alerts/bulk-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            applicationId: appId,
            action: bulkAction,
            alertIds: Array.from(selectedAlerts),
            userComment: commentText,
            actionBy: 'user',
          }),
        });
      }

      setShowCommentModal(false);
      setCommentText('');
      setBulkAction(null);
      setSelectedAlerts(new Set());
      setSelectAll(false);
      await fetchAlerts();
    } catch (error) {
      console.error('[v0] Error performing bulk action:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alerts Management</h1>
          <p className="text-gray-600 mt-2">Monitor and manage SLA deviations and system alerts</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-l-red-500">
            <p className="text-sm text-gray-600">Open Alerts</p>
            <p className="text-2xl font-bold text-red-600">{summary.open}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-yellow-500">
            <p className="text-sm text-gray-600">Acknowledged</p>
            <p className="text-2xl font-bold text-yellow-600">{summary.acknowledged}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-green-500">
            <p className="text-sm text-gray-600">Dismissed</p>
            <p className="text-2xl font-bold text-green-600">{summary.dismissed}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Applications</label>
              <div className="flex flex-wrap gap-2">
                {applications.map((app) => (
                  <Button
                    key={app.applicationId}
                    onClick={() =>
                      setSelectedAppIds(
                        selectedAppIds.includes(app.applicationId)
                          ? selectedAppIds.filter((id) => id !== app.applicationId)
                          : [...selectedAppIds, app.applicationId]
                      )
                    }
                    className={
                      selectedAppIds.includes(app.applicationId)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }
                  >
                    {app.name}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <div className="flex gap-2">
                {['open', 'acknowledged', 'dismissed'].map((status) => (
                  <Button
                    key={status}
                    onClick={() => {
                      setActiveFilter(status);
                      setPage(1);
                    }}
                    className={
                      activeFilter === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Alerts Table */}
        <Card className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No alerts found</p>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              {selectedAlerts.size > 0 && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">
                    {selectedAlerts.size} alert{selectedAlerts.size !== 1 ? 's' : ''} selected
                  </span>
                  <div className="space-x-2">
                    <Button
                      onClick={() => handleBulkAction('acknowledge')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white"
                    >
                      Acknowledge All
                    </Button>
                    <Button
                      onClick={() => handleBulkAction('close')}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Close All
                    </Button>
                  </div>
                </div>
              )}

              {/* Alerts Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 border-b">
                    <tr>
                      <th className="text-left py-2 px-4">
                        <input
                          type="checkbox"
                          checked={selectAll}
                          onChange={handleSelectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="text-left py-2 px-4 font-semibold">Metric</th>
                      <th className="text-left py-2 px-4 font-semibold">Value</th>
                      <th className="text-left py-2 px-4 font-semibold">SLA</th>
                      <th className="text-left py-2 px-4 font-semibold">Deviation</th>
                      <th className="text-left py-2 px-4 font-semibold">Status</th>
                      <th className="text-left py-2 px-4 font-semibold">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.map((alert) => (
                      <tr key={alert.alertId} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={selectedAlerts.has(alert.alertId)}
                            onChange={() => handleAlertSelect(alert.alertId)}
                            className="rounded"
                          />
                        </td>
                        <td className="py-3 px-4 font-medium">{alert.metricName}</td>
                        <td className="py-3 px-4">{alert.actualValue.toFixed(2)}</td>
                        <td className="py-3 px-4">{alert.slaThreshold.toFixed(2)}</td>
                        <td className="py-3 px-4 text-red-600 font-medium">-{alert.deviation}%</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getStatusColor(alert.status)}`}>
                            {getStatusIcon(alert.status)}
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-500">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages} ({totalCount} total)
                </span>
                <div className="space-x-2">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="bg-gray-200 text-gray-800 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* Comment Modal */}
        {showCommentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-96 p-6 space-y-4">
              <h2 className="text-lg font-bold">
                {bulkAction === 'close' ? 'Close' : 'Acknowledge'} Alerts
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Optional Comment
                </label>
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-2 border rounded text-sm"
                  rows={3}
                  placeholder="Add a comment..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  onClick={() => setShowCommentModal(false)}
                  className="bg-gray-200 text-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitBulkAction}
                  disabled={isLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? <Spinner className="w-4 h-4" /> : 'Confirm'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
