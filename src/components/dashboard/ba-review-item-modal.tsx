'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Copy, RefreshCw } from 'lucide-react';
import { BAReviewQueueItem } from '@/types/index';

interface BAReviewItemModalProps {
  item: BAReviewQueueItem;
  isOpen: boolean;
  onClose: () => void;
  onImproveSubmitted: () => void;
}

export function BAReviewItemModal({
  item,
  isOpen,
  onClose,
  onImproveSubmitted,
}: BAReviewItemModalProps) {
  const [improvedPrompt, setImprovedPrompt] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [estimatedScoreImpact, setEstimatedScoreImpact] = useState<number>(0.05);

  const handleCopyOriginal = () => {
    navigator.clipboard.writeText(item.userPrompt);
  };

  const handleSubmitImprovement = async () => {
    if (!improvedPrompt.trim() || !reason.trim()) {
      setError('Please provide both improved prompt and reason');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const response = await fetch(`${apiUrl}/api/ba-review/add-improvement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawDataRecordId: item.rawDataRecordId,
          improvedPrompt,
          reason,
          estimatedScoreImpact,
          baEmail: 'current-ba@company.com', // Should come from auth context
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save improvement');
      }

      setSuccess(true);
      setTimeout(() => {
        onImproveSubmitted();
        resetForm();
      }, 2000);
    } catch (err: any) {
      console.error('[v0] Error submitting improvement:', err);
      setError(err.message || 'Failed to save improvement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setImprovedPrompt('');
    setReason('');
    setEstimatedScoreImpact(0.05);
    setSuccess(false);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Review & Improve Prompt
            <Badge className={getPriorityColor(item.priority)}>
              {item.priority.toUpperCase()}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Compare the original prompt with your improved version and add reasoning for the change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Original Prompt */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Original User Prompt</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyOriginal}
                className="text-gray-500 hover:text-gray-700"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
            </div>
            <Card className="p-4 bg-gray-50 border-gray-200">
              <p className="text-sm text-gray-900 font-mono whitespace-pre-wrap">{item.userPrompt}</p>
            </Card>
          </div>

          {/* Metrics & Feedback */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {item.averageScore !== undefined && (
              <Card className="p-3">
                <p className="text-xs text-gray-500 font-medium uppercase">Score</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{item.averageScore.toFixed(2)}</p>
              </Card>
            )}
            {item.latency !== undefined && (
              <Card className="p-3">
                <p className="text-xs text-gray-500 font-medium uppercase">Latency</p>
                <p className="text-lg font-bold text-gray-900 mt-1">{item.latency}ms</p>
              </Card>
            )}
            {item.userFeedback && (
              <Card className="p-3">
                <p className="text-xs text-gray-500 font-medium uppercase">Feedback</p>
                <Badge className={item.userFeedback === 'negative' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'} >
                  {item.userFeedback.toUpperCase()}
                </Badge>
              </Card>
            )}
            <Card className="p-3">
              <p className="text-xs text-gray-500 font-medium uppercase">Reason</p>
              <p className="text-xs text-gray-700 mt-1 capitalize">{item.priorityReason.replace(/_/g, ' ')}</p>
            </Card>
          </div>

          {/* Improved Prompt */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Your Improved Prompt</h3>
            <textarea
              value={improvedPrompt}
              onChange={(e) => setImprovedPrompt(e.target.value)}
              placeholder="Enter your improved version of the prompt here..."
              className="w-full p-3 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Keep the original intent but make it clearer and more specific.
            </p>
          </div>

          {/* Reason */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Reason for Improvement</h3>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this improvement better? What did you change and why?"
              className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Estimated Score Impact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Estimated Score Improvement</h3>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="0.2"
                step="0.01"
                value={estimatedScoreImpact}
                onChange={(e) => setEstimatedScoreImpact(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-bold text-green-600 w-20 text-right">
                +{estimatedScoreImpact.toFixed(3)}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Estimate how much you expect the score to improve (0-0.2 scale)
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <Card className="p-3 bg-red-50 border-red-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </Card>
          )}

          {/* Success Message */}
          {success && (
            <Card className="p-3 bg-green-50 border-green-200">
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">Improvement saved successfully! Proceeding to next item...</p>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitImprovement}
              disabled={isSubmitting || !improvedPrompt.trim() || !reason.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Save Improvement
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
