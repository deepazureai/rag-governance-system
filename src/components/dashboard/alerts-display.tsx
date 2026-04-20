'use client';

import { Alert } from '@/src/types/index';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, CheckCircle, X } from 'lucide-react';
import Link from 'next/link';

interface AlertsDisplayProps {
  alerts: Alert[];
  isLoading?: boolean;
  onResolve?: (alertId: string) => Promise<void>;
  appName?: string;
}

export function AlertsDisplay({ alerts, isLoading = false, onResolve, appName }: AlertsDisplayProps) {
  if (isLoading) {
    return <div className="h-32 bg-gray-100 rounded-lg animate-pulse" />;
  }

  if (!alerts || alerts.length === 0) {
    return (
      <Card className="p-8 bg-green-50 border border-green-200 text-center">
        <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
        <p className="text-green-800 font-medium">All metrics healthy</p>
        <p className="text-green-700 text-sm mt-1">No alerts currently active</p>
      </Card>
    );
  }

  // Group alerts by severity
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
  const warningAlerts = alerts.filter((a) => a.severity === 'warning');

  return (
    <div className="space-y-3">
      {/* Critical Alerts */}
      {criticalAlerts.map((alert) => (
        <Card key={alert.id} className="p-4 bg-red-50 border border-red-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900">Critical Alert</h4>
                <p className="text-sm text-red-800 mt-1">{alert.message}</p>
                <div className="flex gap-4 mt-2 text-xs text-red-700">
                  <span>Metric Value: {alert.metricValue.toFixed(2)}</span>
                  <span>Threshold: {alert.threshold.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {onResolve && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onResolve(alert.id)}
                className="text-red-600 hover:bg-red-100"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      ))}

      {/* Warning Alerts */}
      {warningAlerts.map((alert) => (
        <Card key={alert.id} className="p-4 bg-yellow-50 border border-yellow-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900">Warning</h4>
                <p className="text-sm text-yellow-800 mt-1">{alert.message}</p>
                <div className="flex gap-4 mt-2 text-xs text-yellow-700">
                  <span>Metric Value: {alert.metricValue.toFixed(2)}</span>
                  <span>Threshold: {alert.threshold.toFixed(2)}</span>
                </div>
              </div>
            </div>
            {onResolve && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onResolve(alert.id)}
                className="text-yellow-600 hover:bg-yellow-100"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      ))}

      {/* View All Button */}
      {alerts.length > 3 && (
        <Link href="/alerts">
          <Button variant="outline" className="w-full border-gray-300 text-gray-700 hover:bg-gray-50">
            View All {alerts.length} Alerts
          </Button>
        </Link>
      )}
    </div>
  );
}

/**
 * Collective Alerts Summary - Shows overview across all applications
 */
interface CollectiveAlertsSummaryProps {
  totalUnresolved: number;
  criticalCount: number;
  warningCount: number;
  healthyCount: number;
}

export function CollectiveAlertsSummary({
  totalUnresolved,
  criticalCount,
  warningCount,
  healthyCount,
}: CollectiveAlertsSummaryProps) {
  const severity =
    criticalCount > 0 ? ('critical' as const) : warningCount > 0 ? ('warning' as const) : ('healthy' as const);

  return (
    <Card className={`p-4 border-l-4 ${
      severity === 'critical'
        ? 'bg-red-50 border-red-400'
        : severity === 'warning'
          ? 'bg-yellow-50 border-yellow-400'
          : 'bg-green-50 border-green-400'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {severity === 'critical' ? (
            <AlertTriangle className="w-6 h-6 text-red-600" />
          ) : severity === 'warning' ? (
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          ) : (
            <CheckCircle className="w-6 h-6 text-green-600" />
          )}
          <div>
            <h3 className={`font-semibold ${
              severity === 'critical'
                ? 'text-red-900'
                : severity === 'warning'
                  ? 'text-yellow-900'
                  : 'text-green-900'
            }`}>
              Platform Status
            </h3>
            <p className={`text-sm ${
              severity === 'critical'
                ? 'text-red-700'
                : severity === 'warning'
                  ? 'text-yellow-700'
                  : 'text-green-700'
            }`}>
              {severity === 'critical'
                ? `${criticalCount} critical alert${criticalCount !== 1 ? 's' : ''} active`
                : severity === 'warning'
                  ? `${warningCount} warning${warningCount !== 1 ? 's' : ''}, all systems monitored`
                  : 'All systems healthy'}
            </p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-xs text-gray-600">Critical</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{warningCount}</div>
            <div className="text-xs text-gray-600">Warning</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{healthyCount}</div>
            <div className="text-xs text-gray-600">Healthy</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
