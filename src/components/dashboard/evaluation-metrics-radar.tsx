'use client';

import { DetailedEvaluationMetrics } from '@/types';
import { Card } from '@/components/ui/card';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface EvaluationMetricsRadarProps {
  metrics: DetailedEvaluationMetrics;
  title?: string;
}

export function EvaluationMetricsRadar({ metrics, title = 'Evaluation Metrics' }: EvaluationMetricsRadarProps) {
  const radarData = [
    { name: 'Groundedness', value: metrics.groundedness },
    { name: 'Relevance', value: metrics.relevance },
    { name: 'Fluency', value: metrics.fluency },
    { name: 'Safety', value: metrics.safety },
    { name: 'Coherence', value: metrics.coherence },
    { name: 'Completeness', value: metrics.completeness },
    { name: 'Factuality', value: metrics.factuality },
  ];

  return (
    <Card className="p-6 bg-white">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={350}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Radar name="Score" dataKey="value" stroke="#2563eb" fill="#3b82f6" fillOpacity={0.6} />
        </RadarChart>
      </ResponsiveContainer>
    </Card>
  );
}
