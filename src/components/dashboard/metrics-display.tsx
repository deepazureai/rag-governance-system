'use client';

import { Card } from '@/components/ui/card';
import { MetricsData } from '@/src/hooks/useMetricsFetch';

interface MetricsDisplayProps {
  metrics: MetricsData | null;
  applicationCount?: number;
  isLoading: boolean;
  isEmpty: boolean;
}

export function MetricsDisplay({ metrics, applicationCount, isLoading, isEmpty }: MetricsDisplayProps) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-white">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card className="p-8 bg-blue-50 border border-blue-200">
        <div className="text-center">
          <p className="text-blue-900 font-medium mb-1">No metrics data available</p>
          <p className="text-sm text-blue-700">Select one or more applications and click Refresh to view metrics</p>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  const metricsArray = [
    { label: 'Groundedness', value: metrics.groundedness },
    { label: 'Coherence', value: metrics.coherence },
    { label: 'Relevance', value: metrics.relevance },
    { label: 'Faithfulness', value: metrics.faithfulness },
    { label: 'Answer Relevancy', value: metrics.answerRelevancy },
    { label: 'Context Precision', value: metrics.contextPrecision },
    { label: 'Context Recall', value: metrics.contextRecall },
  ];

  return (
    <div className="space-y-4">
      {applicationCount && applicationCount > 1 && (
        <Card className="p-3 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Aggregated metrics</span> from {applicationCount} applications (averaged)
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {metricsArray.map((metric) => (
          <Card key={metric.label} className="p-4 bg-white border border-gray-200 hover:shadow-md transition-shadow">
            <p className="text-xs text-gray-600 mb-2 font-medium">{metric.label}</p>
            <p className="text-2xl font-bold text-blue-600">{metric.value.toFixed(1)}</p>
            <p className="text-xs text-gray-500 mt-1">/ 100</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
