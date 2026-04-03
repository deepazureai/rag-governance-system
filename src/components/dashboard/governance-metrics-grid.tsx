'use client';

import { GovernanceMetric } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface GovernanceMetricsGridProps {
  metrics: GovernanceMetric[];
}

export function GovernanceMetricsGrid({ metrics }: GovernanceMetricsGridProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const categoryColors: Record<string, string> = {
    tokens: 'bg-purple-100 text-purple-800',
    performance: 'bg-blue-100 text-blue-800',
    throughput: 'bg-indigo-100 text-indigo-800',
    latency: 'bg-orange-100 text-orange-800',
    cost: 'bg-pink-100 text-pink-800',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card
          key={metric.id}
          className={`p-4 border-l-4 ${getStatusColor(metric.status)}`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{metric.name}</p>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
              <Badge className={categoryColors[metric.category as keyof typeof categoryColors]}>
                {metric.category}
              </Badge>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value.toLocaleString()}
                </p>
                <p className="text-xs text-gray-600">{metric.unit}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  <span className={`text-xs font-medium ${metric.trend === 'up' ? 'text-red-600' : 'text-green-600'}`}>
                    {metric.trendPercentage}%
                  </span>
                </div>
                {metric.threshold && (
                  <p className="text-xs text-gray-500">
                    Threshold: {metric.threshold.toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
