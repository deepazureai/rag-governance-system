'use client';

import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { formatNumber, formatPercentage } from '@/src/utils/format';
import { EvaluationMetric } from '@/src/types';

interface MetricCardProps {
  metric: EvaluationMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const isPositive = metric.trend === 'up';
  const isNegative = metric.trend === 'down';

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{metric.name}</p>
          <h3 className="text-3xl font-bold text-gray-900 mb-2">
            {metric.unit === '%' ? formatPercentage(metric.value) : formatNumber(metric.value)}
          </h3>
          <p className="text-xs text-gray-500">{metric.description}</p>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
            isPositive
              ? 'bg-green-50 text-green-700'
              : isNegative
              ? 'bg-red-50 text-red-700'
              : 'bg-gray-50 text-gray-700'
          }`}
        >
          {isPositive && <ArrowUpRight className="w-4 h-4" />}
          {isNegative && <ArrowDownRight className="w-4 h-4" />}
          {metric.trend === 'stable' && <TrendingUp className="w-4 h-4" />}
          <span className="text-sm font-semibold">{formatPercentage(metric.trendPercentage)}</span>
        </div>
      </div>
    </Card>
  );
}
