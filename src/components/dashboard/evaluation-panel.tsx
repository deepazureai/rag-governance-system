'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { evaluationClient } from '@/api/evaluation-client';
import { RawDataRecordDetail } from '@/types/index';

interface EvaluationPanelProps {
  record: RawDataRecordDetail;
  onEvaluationComplete?: (scores: any) => void;
}

export function EvaluationPanel({ record, onEvaluationComplete }: EvaluationPanelProps) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationScores, setEvaluationScores] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    setError(null);

    try {
      console.log('[v0] Starting DeepEval evaluation for record:', record._id);

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

      if (result.evaluation?.scores) {
        setEvaluationScores(result.evaluation.scores);
        onEvaluationComplete?.(result.evaluation.scores);
      }
    } catch (err: any) {
      console.error('[v0] Evaluation error:', err.message);
      setError(err.message || 'Failed to evaluate record');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Determine score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-4 mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-600" />
          DeepEval Evaluation
        </h3>
        <Button
          onClick={handleEvaluate}
          disabled={isEvaluating}
          variant="default"
          size="sm"
        >
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

      {error && (
        <Card className="p-3 bg-red-50 border-red-200">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </Card>
      )}

      {isHealthy === false && (
        <Card className="p-3 bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            DeepEval service is offline. Ensure Docker containers are running with: <code className="bg-white px-2 py-1 rounded text-xs">docker-compose up</code>
          </p>
        </Card>
      )}

      {evaluationScores && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">Evaluation Complete</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Faithfulness</p>
              <p className={`text-lg font-bold ${getScoreColor(evaluationScores.faithfulness)}`}>
                {evaluationScores.faithfulness.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Answer Relevancy</p>
              <p className={`text-lg font-bold ${getScoreColor(evaluationScores.answer_relevancy)}`}>
                {evaluationScores.answer_relevancy.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Context Relevancy</p>
              <p className={`text-lg font-bold ${getScoreColor(evaluationScores.contextual_relevancy)}`}>
                {evaluationScores.contextual_relevancy.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Toxicity</p>
              <p className={`text-lg font-bold ${getScoreColor(1 - evaluationScores.toxicity_score)}`}>
                {evaluationScores.toxicity_score.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Bias Score</p>
              <p className={`text-lg font-bold ${getScoreColor(1 - evaluationScores.bias_score)}`}>
                {evaluationScores.bias_score.toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-3 rounded border border-gray-200">
              <p className="text-xs text-gray-600 mb-1">Explainability</p>
              <p className={`text-lg font-bold ${getScoreColor(evaluationScores.explainability_score)}`}>
                {evaluationScores.explainability_score.toFixed(2)}
              </p>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Scores are now saved to the record and will appear alongside RAGAS metrics in the dashboard.
          </p>
        </div>
      )}
    </div>
  );
}
