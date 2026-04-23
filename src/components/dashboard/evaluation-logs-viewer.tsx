'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EvaluationRecord, EvaluationMetric } from '@/src/hooks/useApplicationMetrics';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

interface EvaluationLogsViewerProps {
  records: EvaluationRecord[];
  isLoading: boolean;
}

// SLA Thresholds
const SLA_THRESHOLDS = {
  HEALTHY: 70, // >= 70% = Healthy (green)
  WARNING: 50, // 50-69% = Warning (yellow)
  CRITICAL: 0, // < 50% = Critical (red)
};

function getHealthStatus(score: number) {
  if (score >= SLA_THRESHOLDS.HEALTHY) return 'healthy';
  if (score >= SLA_THRESHOLDS.WARNING) return 'warning';
  return 'critical';
}

function getStatusColor(status: string) {
  switch (status) {
    case 'healthy':
      return 'bg-green-50 border-green-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    case 'warning':
      return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    case 'critical':
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    default:
      return null;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'healthy':
      return 'Excellent';
    case 'warning':
      return 'Good';
    case 'critical':
      return 'Needs Improvement';
    default:
      return 'Unknown';
  }
}

function MetricRow({ label, value }: { label: string; value: number }) {
  const healthStatus = getHealthStatus(value);
  const bgColor =
    healthStatus === 'healthy'
      ? 'bg-green-100'
      : healthStatus === 'warning'
        ? 'bg-yellow-100'
        : 'bg-red-100';

  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <div className={`${bgColor} px-2 py-1 rounded text-xs font-semibold`}>
          {value.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export function EvaluationLogsViewer({ records, isLoading }: EvaluationLogsViewerProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!records || records.length === 0) {
    return (
      <Card className="p-8 text-center bg-gray-50 border border-gray-200">
        <p className="text-gray-600">No evaluation records available</p>
      </Card>
    );
  }

  // Group records by health status
  const groupedRecords = {
    healthy: records.filter(r => getHealthStatus(r.evaluation?.overall_score || 0) === 'healthy'),
    warning: records.filter(r => getHealthStatus(r.evaluation?.overall_score || 0) === 'warning'),
    critical: records.filter(r => getHealthStatus(r.evaluation?.overall_score || 0) === 'critical'),
  };

  return (
    <div className="space-y-6">
      {/* Distribution Summary */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200">
        <h3 className="font-semibold text-gray-900 mb-3">Record Distribution by SLA Health</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{groupedRecords.healthy.length}</div>
            <p className="text-xs text-gray-600 mt-1">Excellent (≥70%)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{groupedRecords.warning.length}</div>
            <p className="text-xs text-gray-600 mt-1">Good (50-69%)</p>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{groupedRecords.critical.length}</div>
            <p className="text-xs text-gray-600 mt-1">Needs Improvement (&lt;50%)</p>
          </div>
        </div>
      </Card>

      {/* Excellent Records */}
      {groupedRecords.healthy.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Excellent Performing Records ({groupedRecords.healthy.length})
          </h3>
          <div className="space-y-3">
            {groupedRecords.healthy.map((record) => (
              <RecordCard key={record._id} record={record} status="healthy" />
            ))}
          </div>
        </div>
      )}

      {/* Warning Records */}
      {groupedRecords.warning.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-yellow-900 mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Good Performing Records ({groupedRecords.warning.length})
          </h3>
          <div className="space-y-3">
            {groupedRecords.warning.map((record) => (
              <RecordCard key={record._id} record={record} status="warning" />
            ))}
          </div>
        </div>
      )}

      {/* Critical Records */}
      {groupedRecords.critical.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Needs Improvement ({groupedRecords.critical.length})
          </h3>
          <div className="space-y-3">
            {groupedRecords.critical.map((record) => (
              <RecordCard key={record._id} record={record} status="critical" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RecordCard({ record, status }: { record: EvaluationRecord; status: string }) {
  const overallScore = record.evaluation?.overall_score || 0;

  return (
    <Card className={`p-4 border ${getStatusColor(status)}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 mt-1">{getStatusIcon(status)}</div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <Badge className={`text-xs ${
              status === 'healthy'
                ? 'bg-green-200 text-green-800'
                : status === 'warning'
                  ? 'bg-yellow-200 text-yellow-800'
                  : 'bg-red-200 text-red-800'
            }`}>
              {getStatusLabel(status)} • {overallScore.toFixed(1)}%
            </Badge>
          </div>

          {/* Query and Response */}
          <div className="space-y-2 mb-3">
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Query</p>
              <p className="text-sm text-gray-700 line-clamp-2">{record.query}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Response</p>
              <p className="text-sm text-gray-700 line-clamp-2">{record.response}</p>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="bg-white bg-opacity-50 rounded p-3 space-y-1">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <MetricRow label="Faithfulness" value={record.evaluation?.faithfulness || 0} />
              <MetricRow label="Answer Relevancy" value={record.evaluation?.answer_relevancy || 0} />
              <MetricRow label="Context Relevancy" value={record.evaluation?.context_relevancy || 0} />
              <MetricRow label="Context Precision" value={record.evaluation?.context_precision || 0} />
              <MetricRow label="Context Recall" value={record.evaluation?.context_recall || 0} />
              <MetricRow label="Correctness" value={record.evaluation?.correctness || 0} />
            </div>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-gray-500 mt-3">
            {new Date(record.evaluatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </Card>
  );
}
