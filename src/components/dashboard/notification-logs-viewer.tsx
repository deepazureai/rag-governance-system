'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, Download, Mail, Webhook } from 'lucide-react';
import { NotificationLog } from '@/src/types/index';

interface NotificationLogsViewerProps {
  appId?: string;
  limit?: number;
}

export function NotificationLogsViewer({ appId, limit = 50 }: NotificationLogsViewerProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'sent' | 'failed' | 'pending'>('all');
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, [appId, filter, pageIndex]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        ...(appId && { appId }),
        ...(filter !== 'all' && { status: filter }),
        limit: limit.toString(),
        skip: (pageIndex * limit).toString(),
      });

      const res = await fetch(`/api/notifications/logs?${query}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error('[v0] Error fetching notification logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async (logId: string) => {
    try {
      const res = await fetch(`/api/notifications/logs/${logId}/resend`, {
        method: 'POST',
      });

      if (res.ok) {
        alert('Notification queued for resend');
        await fetchLogs();
      }
    } catch (error) {
      console.error('[v0] Error resending notification:', error);
    }
  };

  const handleExport = () => {
    const csv = [
      ['Timestamp', 'App ID', 'Status', 'Channel', 'Message', 'Attempts'],
      ...logs.map((log) => [
        new Date(log.createdAt).toLocaleString(),
        log.appId,
        log.status,
        log.channelType,
        log.message.substring(0, 50),
        log.attempts,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
      case 'retrying':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="w-4 h-4" />;
      case 'webhook':
        return <Webhook className="w-4 h-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notification History</h3>
          <p className="text-sm text-gray-600 mt-1">Track all sent and failed notifications</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {(['all', 'sent', 'failed', 'pending'] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              setFilter(status);
              setPageIndex(0);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] ${
              filter === status
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Logs table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin">
              <RefreshCw className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        ) : logs.length === 0 ? (
          <Card className="p-12 bg-gray-50 text-center">
            <p className="text-gray-600">No notification logs found.</p>
          </Card>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Timestamp</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Channel</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Message</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Attempts</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <Badge className={`text-xs ${getStatusBadgeVariant(log.status)}`}>
                        {log.status}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-900">
                      {getChannelIcon(log.channelType)}
                      {log.channelType}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">
                    {log.message}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{log.attempts}</td>
                  <td className="px-4 py-3">
                    {log.status === 'failed' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResend(log.id)}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        Resend
                      </Button>
                    )}
                    {log.errorMessage && (
                      <div title={log.errorMessage} className="text-xs text-red-600 cursor-help">
                        Error
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && logs.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {pageIndex * limit + 1} - {pageIndex * limit + logs.length} logs
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
              disabled={pageIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex(pageIndex + 1)}
              disabled={logs.length < limit}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
