'use client';

import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { mockAlerts, mockApps } from '@/src/data/mockData';
import { getSeverityColor, formatDateTime } from '@/src/utils/format';
import { AlertTriangle, CheckCircle, Bell, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState('unresolved');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [appFilter, setAppFilter] = useState<string>('all');

  const filteredAlerts = useMemo(() => {
    let filtered = mockAlerts;

    // Tab filter
    if (activeTab === 'unresolved') {
      filtered = filtered.filter((a) => !a.resolved);
    } else if (activeTab === 'resolved') {
      filtered = filtered.filter((a) => a.resolved);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter((a) => a.severity === severityFilter);
    }

    // App filter
    if (appFilter !== 'all') {
      filtered = filtered.filter((a) => a.appId === appFilter);
    }

    return filtered;
  }, [activeTab, severityFilter, appFilter]);

  const unresolvedCount = mockAlerts.filter((a) => !a.resolved).length;
  const criticalCount = mockAlerts.filter((a) => a.severity === 'critical' && !a.resolved).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Alerts & Notifications</h1>
          <p className="text-gray-600">Monitor and manage system alerts and notifications</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6 bg-white border-l-4 border-l-red-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Unresolved Alerts</p>
                <h3 className="text-3xl font-bold text-gray-900">{unresolvedCount}</h3>
              </div>
              <Bell className="w-8 h-8 text-red-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-orange-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Critical Alerts</p>
                <h3 className="text-3xl font-bold text-gray-900">{criticalCount}</h3>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600 opacity-20" />
            </div>
          </Card>

          <Card className="p-6 bg-white border-l-4 border-l-blue-600">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Resolved Today</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {mockAlerts.filter((a) => a.resolved).length}
                </h3>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-600 opacity-20" />
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application</label>
              <Select value={appFilter} onValueChange={setAppFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Apps</SelectItem>
                  {mockApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Results: {filteredAlerts.length}
              </label>
              <Button
                variant="outline"
                onClick={() => {
                  setSeverityFilter('all');
                  setAppFilter('all');
                }}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Alerts Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white border-b border-gray-200 rounded-none">
            <TabsTrigger value="unresolved">
              Unresolved ({mockAlerts.filter((a) => !a.resolved).length})
            </TabsTrigger>
            <TabsTrigger value="resolved">
              Resolved ({mockAlerts.filter((a) => a.resolved).length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({mockAlerts.length})</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6 space-y-4">
            {filteredAlerts.length > 0 ? (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const app = mockApps.find((a) => a.id === alert.appId);
                  return (
                    <Card
                      key={alert.id}
                      className={`p-4 border-l-4 ${
                        alert.severity === 'critical'
                          ? 'border-l-red-600'
                          : alert.severity === 'warning'
                          ? 'border-l-yellow-600'
                          : 'border-l-blue-600'
                      } bg-white hover:shadow-md transition-shadow`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 mt-1">
                          {alert.severity === 'critical' && (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          {alert.severity === 'warning' && (
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          )}
                          {alert.severity === 'info' && (
                            <Bell className="w-5 h-5 text-blue-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-gray-900">{alert.message}</h3>
                            <span
                              className={`text-xs font-semibold px-2 py-1 rounded ${getSeverityColor(
                                alert.severity
                              )}`}
                            >
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            Application: <span className="font-medium">{app?.name || 'Unknown'}</span>
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDateTime(alert.timestamp)} •{' '}
                            {alert.resolved ? (
                              <span className="text-green-600 font-medium">Resolved</span>
                            ) : (
                              <span className="text-orange-600 font-medium">Active</span>
                            )}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!alert.resolved && (
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200">
                              Resolve
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="p-12 bg-white text-center">
                <p className="text-gray-500">No alerts found</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
