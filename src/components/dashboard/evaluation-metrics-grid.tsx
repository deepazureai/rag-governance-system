'use client';

import { EvaluationMetric } from '@/src/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EvaluationMetricsGridProps {
  metrics: EvaluationMetric[];
}

export function EvaluationMetricsGrid({ metrics }: EvaluationMetricsGridProps) {
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'quality':
        return 'bg-blue-100 text-blue-800';
      case 'safety':
        return 'bg-red-100 text-red-800';
      case 'relevance':
        return 'bg-green-100 text-green-800';
      case 'performance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{metric.name}</p>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
              {metric.category && (
                <Badge className={getCategoryColor(metric.category)}>
                  {metric.category}
                </Badge>
              )}
            </div>

            <div className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold text-gray-900">{metric.value.toFixed(1)}</p>
                <p className="text-xs text-gray-600">{metric.unit}</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(metric.trend)}
                <span className={`text-sm font-semibold ${metric.trend === 'up' ? 'text-green-600' : metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {metric.trendPercentage > 0 ? '+' : ''}{metric.trendPercentage}%
                </span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
