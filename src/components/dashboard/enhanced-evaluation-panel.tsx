'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  AlertCircle,
  CheckCircle,
  Zap,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { evaluationClient } from '@/src/api/evaluation-client';
import { RawDataRecordDetail } from '@/types/index';

interface EvaluationScore {
  metric: string;
  score: number;
  reasoning: string;
  confidence: number;
}

interface ImprovementSuggestion {
  metric: string;
  current_score: number;
  category: string;
  problem: string;
  suggestion: string;
  expected_improvement: number;
}

interface EnhancedEvaluationPanelProps {
  record: RawDataRecordDetail;
  onEvaluationComplete?: (scores: any) => void;
}

export function EnhancedEvaluationPanel({
  record,
  onEvaluationComplete,
}: EnhancedEvaluationPanelProps) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationScores, setEvaluationScores] = useState<Record<string, EvaluationScore> | null>(
    null
  );
  const [improvements, setImprovements] = useState<Record<string, ImprovementSuggestion[]> | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [expandedMetrics, setExpandedMetrics] = useState<Record<string, boolean>>({});
  const [loadingImprovements, setLoadingImprovements] = useState(false);

  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600 bg-green-50';
    if (score >= 0.6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getToxicityColor = (score: number): string => {
    // For toxicity, lower is better
    if (score <= 0.2) return 'text-green-600 bg-green-50';
    if (score <= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getColorClass = (metric: string, score: number): string => {
    if (metric.includes('toxicity') || metric.includes('bias')) {
      return getToxicityColor(score);
    }
    return getScoreColor(score);
  };

  const toggleMetric = (metric: string) => {
    setExpandedMetrics((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);
    setImprovements(null);

    try {
      console.log('[v0] Starting enhanced DeepEval evaluation for record:', record._id);

      // Check service health first
      const healthy = await evaluationClient.healthCheck();
      setIsHealthy(healthy);

      if (!healthy) {
        setError('DeepEval service is currently unavailable. Please try again later.');
        setIsEvaluating(false);
        return;
      }

      // Call evaluation endpoint
      const result = await evaluationClient.evaluateRecord(record.applicationId, record._id);

      console.log('[v0] Evaluation result:', result);

      if (result.evaluation?.details) {
        setEvaluationScores(result.evaluation.details);
        onEvaluationComplete?.(result.evaluation.scores);

        // Automatically generate improvements for low scores
        setLoadingImprovements(true);
        try {
          const improvementsResult = await evaluationClient.getImprovements(
            record.applicationId,
            {
              user_prompt: record.userPrompt,
              context: (record.contextRetrieved?.map((c) => c.content) ?? []).join('\n'),
              llm_response: record.llmResponse,
              scores: result.evaluation.scores,
              record_id: record._id,
            }
          );

          if (improvementsResult.improvements) {
            setImprovements(improvementsResult.improvements);
          }
        } catch (err) {
          console.error('[v0] Error getting improvements:', err);
        } finally {
          setLoadingImprovements(false);
        }
      }
    } catch (err: any) {
      console.error('[v0] Evaluation error:', err.message);
      setError(err.message || 'Failed to evaluate record');
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="space-y-4 mt-6 p-4 bg-gray-950 border border-gray-800 rounded-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-100 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          DeepEval Evaluation v2
        </h3>
        <Button onClick={handleEvaluate} disabled={isEvaluating} variant="default" size="sm">
          {isEvaluating ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Evaluating...
            </>
          ) : (
            'Evaluate Now'
          )}
        </Button>
      </div>

      {/* Error State */}
      {error && (
        <Card className="p-3 bg-red-900 border-red-700">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-200 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        </Card>
      )}

      {/* Service Health */}
      {isHealthy === false && (
        <Card className="p-3 bg-yellow-900 border-yellow-700">
          <p className="text-sm text-yellow-200">
            DeepEval service is offline. Ensure Docker containers are running with:{' '}
            <code className="bg-yellow-950 px-2 py-1 rounded text-xs">docker-compose up</code>
          </p>
        </Card>
      )}

      {/* Evaluation Scores */}
      {evaluationScores && (
        <div className="space-y-2">
          <div className="text-sm font-mono text-green-400">EVALUATION_SCORES</div>

          <div className="grid grid-cols-2 gap-2">
            {Object.entries(evaluationScores).map(([metric, scoreObj]) => (
              <div key={metric} className="border border-gray-700 rounded overflow-hidden bg-black">
                <button
                  onClick={() => toggleMetric(metric)}
                  className="w-full px-3 py-2 bg-gray-900 hover:bg-gray-800 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="font-mono text-gray-300">{metric}</span>
                    <Badge
                      className={`text-xs ${getColorClass(metric, scoreObj.score)}`}
                      variant="outline"
                    >
                      {(scoreObj.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  {expandedMetrics[metric] ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {expandedMetrics[metric] && (
                  <div className="px-3 py-2 border-t border-gray-700 space-y-2 bg-gray-950">
                    <div className="text-xs text-gray-400">
                      <span className="text-gray-500">Score: </span>
                      <span className="text-gray-200 font-mono">
                        {scoreObj.score.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      <span className="text-gray-500">Confidence: </span>
                      <span className="text-gray-200 font-mono">
                        {(scoreObj.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      <p className="text-gray-500 mb-1">Reasoning:</p>
                      <p className="text-gray-300 italic">{scoreObj.reasoning}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading Improvements */}
      {loadingImprovements && (
        <Card className="p-3 bg-blue-900 border-blue-700">
          <div className="flex gap-2">
            <Spinner className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-200">Generating improvement suggestions...</p>
          </div>
        </Card>
      )}

      {/* Improvement Suggestions */}
      {improvements && Object.keys(improvements).length > 0 && (
        <div className="border border-purple-700 rounded overflow-hidden bg-gray-900">
          <div className="px-4 py-3 bg-purple-900 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-purple-300" />
            <span className="font-mono text-sm text-purple-300">
              IMPROVEMENT_SUGGESTIONS ({Object.keys(improvements).length} metrics with suggestions)
            </span>
          </div>

          <div className="px-4 py-3 space-y-3 bg-gray-950">
            {Object.entries(improvements).map(([metric, suggestions]) => (
              <div key={metric} className="border border-gray-700 rounded p-3 bg-black">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span className="font-mono text-xs text-purple-400">{metric}</span>
                </div>

                <div className="space-y-2">
                  {suggestions.map((suggestion, idx) => (
                    <div key={idx} className="border-l-2 border-purple-700 pl-3 py-1">
                      <div className="flex items-start gap-2 mb-1">
                        <AlertTriangle className="w-3 h-3 text-orange-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-gray-300">
                            <span className="text-gray-500">Problem: </span>
                            {suggestion.problem}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-300 ml-5">
                        <span className="text-gray-500">Suggestion: </span>
                        {suggestion.suggestion}
                      </div>
                      <div className="text-xs text-gray-300 ml-5 mt-1">
                        <Badge
                          className="text-xs bg-green-900 text-green-200"
                          variant="outline"
                        >
                          +{(suggestion.expected_improvement * 100).toFixed(0)}% expected
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!evaluationScores && !isEvaluating && (
        <div className="text-center py-4 text-gray-400 text-sm">
          Click &quot;Evaluate Now&quot; to run comprehensive evaluation with reasoning and improvement suggestions
        </div>
      )}
    </div>
  );
}
