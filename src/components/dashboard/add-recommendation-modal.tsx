'use client';

import { useState, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, Sparkles, TrendingUp, Clock } from 'lucide-react';

interface RawDataRecommendation {
  originalPrompt: string;
  improvedPrompt: string;
  reason: string;
  priority: string;
  estimatedScoreImpact: number;
  metrics?: Record<string, number>;
}

interface AddRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (recommendation: { suggestion: string; priority: string; notes: string }) => Promise<void>;
  recommendation: RawDataRecommendation | null;
  applicationId: string;
}

export function AddRecommendationModal({
  isOpen,
  onClose,
  onSave,
  recommendation,
  applicationId,
}: AddRecommendationModalProps) {
  const [curatedSuggestion, setCuratedSuggestion] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [isCurating, setIsCurating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load initial suggestion from recommendation
  const handleLoadInitial = () => {
    if (recommendation) {
      setCuratedSuggestion(recommendation.reason || '');
      setPriority(recommendation.priority || 'medium');
      setError(null);
    }
  };

  // Fetch LLM-curated suggestion (combines metrics + initial suggestion)
  const handleCurateSuggestion = async () => {
    if (!recommendation) {
      setError('No recommendation available');
      return;
    }

    setIsCurating(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      const response = await fetch(`${apiUrl}/api/ba-review/curate-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          originalPrompt: recommendation.originalPrompt,
          improvedPrompt: recommendation.improvedPrompt,
          initialReason: recommendation.reason,
          metrics: recommendation.metrics,
          priority: recommendation.priority,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to curate suggestion');
      }

      const data = await response.json();

      if (data.success && data.data?.curatedSuggestion) {
        setCuratedSuggestion(data.data.curatedSuggestion);
        console.log('[v0] LLM curated suggestion loaded');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to curate suggestion';
      console.error('[v0] Curation error:', message);
      setError(message);
    } finally {
      setIsCurating(false);
    }
  };

  const handleSave = async () => {
    if (!curatedSuggestion.trim()) {
      setError('Suggestion cannot be empty');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave({
        suggestion: curatedSuggestion,
        priority,
        notes,
      });
      setCuratedSuggestion('');
      setNotes('');
      setPriority('medium');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save recommendation';
      console.error('[v0] Save error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Recommendation</DialogTitle>
          <DialogDescription>Review and curate LLM suggestions from raw data evaluation</DialogDescription>
        </DialogHeader>

        {recommendation ? (
          <div className="space-y-4">
            {/* Original Prompt */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Original Prompt</h3>
              <p className="text-sm text-blue-800">{recommendation.originalPrompt}</p>
            </Card>

            {/* Metrics */}
            {recommendation.metrics && Object.keys(recommendation.metrics).length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">DeepEval Metrics</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(recommendation.metrics).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-xs font-medium text-gray-600">{key}</span>
                      <span className="text-sm font-bold text-gray-900">{(value * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* LLM Suggestion */}
            <Card className="p-4 bg-purple-50 border-purple-200">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-purple-900">LLM Initial Suggestion</h3>
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-sm text-purple-800">{recommendation.reason}</p>
            </Card>

            {/* Priority & Impact */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-3">
                <p className="text-xs text-gray-600 mb-1">Priority</p>
                <Badge className={getPriorityColor(recommendation.priority)}>{recommendation.priority}</Badge>
              </Card>
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs text-gray-600">Est. Score Impact</p>
                    <p className="text-sm font-bold text-green-600">+{(recommendation.estimatedScoreImpact * 100).toFixed(1)}%</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Curated Suggestion */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-900">Curated Recommendation</label>
                <Button
                  onClick={handleCurateSuggestion}
                  disabled={isCurating}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {isCurating ? <Spinner className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  {isCurating ? 'Curating...' : 'Auto-Curate'}
                </Button>
              </div>
              <Textarea
                value={curatedSuggestion}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCuratedSuggestion(e.target.value)}
                placeholder="Edit or enhance the LLM suggestion..."
                className="min-h-[120px]"
                onFocus={handleLoadInitial}
              />
            </div>

            {/* Priority Selection */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">Priority</label>
              <select
                value={priority}
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* BA Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900">BA Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                placeholder="Add any additional context or notes..."
                className="min-h-[80px]"
              />
            </div>

            {/* Error */}
            {error && (
              <Card className="p-3 bg-red-50 border-red-200 flex gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </Card>
            )}

            <DialogFooter>
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isLoading || !curatedSuggestion.trim()} className="gap-2">
                {isLoading ? <Spinner className="w-4 h-4" /> : null}
                Save Recommendation
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">No recommendation loaded</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
