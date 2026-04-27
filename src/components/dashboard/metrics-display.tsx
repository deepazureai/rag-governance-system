'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MetricsData } from '@/src/hooks/useMetricsFetch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface MetricsDisplayProps {
  metrics: MetricsData | null;
  applicationCount?: number;
  isLoading: boolean;
  isEmpty: boolean;
  frameworksUsed?: string[];
  slaCompliance?: number;
}

type FrameworkType = 'ragas' | 'bleu_rouge' | 'llamaindex';

export function MetricsDisplay({ metrics, applicationCount, isLoading, isEmpty, frameworksUsed = [], slaCompliance }: MetricsDisplayProps) {
  const [selectedFramework, setSelectedFramework] = useState<FrameworkType>('ragas');

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
    return (
      <Card className="p-8 bg-amber-50 border border-amber-200">
        <div className="text-center">
          <p className="text-amber-900 font-medium mb-1">No metrics data available yet</p>
          <p className="text-sm text-amber-700">Upload raw data and run the batch process to generate evaluation metrics. Metrics will appear here after processing completes.</p>
        </div>
      </Card>
    );
  }

  // Metrics for each framework
  const ragasMetrics = [
    { label: 'Groundedness', value: metrics.groundedness },
    { label: 'Coherence', value: metrics.coherence },
    { label: 'Relevance', value: metrics.relevance },
    { label: 'Faithfulness', value: metrics.faithfulness },
    { label: 'Answer Relevancy', value: metrics.answerRelevancy },
    { label: 'Context Precision', value: metrics.contextPrecision },
    { label: 'Context Recall', value: metrics.contextRecall },
  ];

  const bleuRougeMetrics = [
    { label: 'BLEU Score', value: metrics.bleuScore ?? 0 },
    { label: 'ROUGE-L', value: metrics.rougeL ?? 0 },
    { label: 'Precision', value: metrics.precision ?? 0 },
    { label: 'Recall', value: metrics.recall ?? 0 },
  ];

  const llamaIndexMetrics = [
    { label: 'Correctness', value: metrics.llamaCorrectness ?? 0 },
    { label: 'Relevancy', value: metrics.llamaRelevancy ?? 0 },
    { label: 'Faithfulness', value: metrics.llamaFaithfulness ?? 0 },
    { label: 'Overall Score', value: metrics.overallScore ?? 0 },
  ];

  // Get metrics to display based on selected framework
  const getDisplayMetrics = () => {
    switch (selectedFramework) {
      case 'bleu_rouge':
        return bleuRougeMetrics;
      case 'llamaindex':
        return llamaIndexMetrics;
      case 'ragas':
      default:
        return ragasMetrics;
    }
  };

  // Get SLA status color
  const getSLAStatusColor = (compliance: number) => {
    if (compliance >= 85) return 'bg-green-100 border-green-300 text-green-900';
    if (compliance >= 70) return 'bg-yellow-100 border-yellow-300 text-yellow-900';
    return 'bg-red-100 border-red-300 text-red-900';
  };

  // Get framework button colors
  const getFrameworkButtonStyle = (framework: FrameworkType, isSelected: boolean) => {
    if (!isSelected) return 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50';
    
    const colors: Record<FrameworkType, string> = {
      ragas: 'bg-blue-100 text-blue-800 border-blue-300',
      bleu_rouge: 'bg-purple-100 text-purple-800 border-purple-300',
      llamaindex: 'bg-orange-100 text-orange-800 border-orange-300',
    };
    return colors[framework];
  };

  const getFrameworkLabel = (framework: string) => {
    if (framework === 'bleu_rouge') return 'BLEU/ROUGE';
    return framework.charAt(0).toUpperCase() + framework.slice(1);
  };

  return (
    <div className="space-y-4">
      {applicationCount && applicationCount > 1 && (
        <Card className="p-3 bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Aggregated metrics</span> from {applicationCount} applications (averaged)
          </p>
        </Card>
      )}

      {/* Framework and SLA Summary Row */}
      <Card className="p-4 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Evaluation Frameworks</h3>
              <div className="flex flex-wrap gap-2">
                {frameworksUsed.length > 0 ? (
                  frameworksUsed.map((framework) => (
                    <Button
                      key={framework}
                      onClick={() => setSelectedFramework(framework as FrameworkType)}
                      variant="outline"
                      size="sm"
                      className={`border ${getFrameworkButtonStyle(framework as FrameworkType, selectedFramework === framework)}`}
                    >
                      {getFrameworkLabel(framework)}
                    </Button>
                  ))
                ) : (
                  <span className="text-xs text-slate-600">No frameworks specified</span>
                )}
              </div>
            </div>

            {slaCompliance !== undefined && (
              <div className="flex flex-col items-end">
                <p className="text-xs font-semibold text-slate-600 mb-2">SLA Compliance</p>
                <div className={`px-3 py-2 rounded-lg border ${getSLAStatusColor(slaCompliance)}`}>
                  <p className="text-lg font-bold">{slaCompliance.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </div>

          {/* Framework description */}
          <div className="text-xs text-slate-600">
            {selectedFramework === 'ragas' && 'Showing RAGAS framework metrics (Reliability, Adaptability, Generalization, and Scalability)'}
            {selectedFramework === 'bleu_rouge' && 'Showing BLEU/ROUGE metrics (text similarity and n-gram overlap scores)'}
            {selectedFramework === 'llamaindex' && 'Showing LLamaIndex metrics (LLM-based evaluation results)'}
          </div>
        </div>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {getDisplayMetrics().map((metric) => (
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
