'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertCircle, CheckCircle, Zap, TrendingDown } from 'lucide-react';

interface LowScorePrompt {
  _id: string;
  userPrompt: string;
  currentScore: number;
  priority: string;
  llmSuggestion: string;
}

interface BulkProcessingProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcessingComplete?: () => void;
}

export function BulkProcessing({
  applicationId,
  isOpen,
  onClose,
  onProcessingComplete,
}: BulkProcessingProps) {
  const [prompts, setPrompts] = useState<LowScorePrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [processedCount, setProcessedCount] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Fetch low-score prompts
  const fetchLowScorePrompts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

      const response = await fetch(`${apiUrl}/api/ba-review/low-score-prompts/${applicationId}?threshold=70`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch low-score prompts');
      }

      const data = await response.json();
      const lowScorePrompts = Array.isArray(data.data) ? data.data : [];

      setPrompts(lowScorePrompts);
      setSelectedPrompts(new Set(lowScorePrompts.map((p: LowScorePrompt) => p._id)));

      console.log('[v0] Loaded', lowScorePrompts.length, 'low-score prompts');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load prompts';
      console.error('[v0] Error fetching low-score prompts:', message);
      setError(message);
      setPrompts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Process all selected prompts
  const handleBulkProcess = async () => {
    if (selectedPrompts.size === 0) {
      setError('Please select at least one prompt');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedCount(0);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
      const selectedArray = Array.from(selectedPrompts);

      for (const promptId of selectedArray) {
        const prompt = prompts.find((p) => p._id === promptId);
        if (!prompt) continue;

        try {
          const response = await fetch(`${apiUrl}/api/ba-review/process-low-score-prompt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              applicationId,
              promptId,
              userPrompt: prompt.userPrompt,
              currentScore: prompt.currentScore,
              llmSuggestion: prompt.llmSuggestion,
            }),
          });

          if (response.ok) {
            setProcessedCount((prev) => prev + 1);
            console.log('[v0] Processed prompt:', promptId);
          }
        } catch (err) {
          console.error('[v0] Error processing prompt:', promptId, err);
        }
      }

      setShowResults(true);
      console.log('[v0] Bulk processing completed');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bulk processing failed';
      console.error('[v0] Bulk processing error:', message);
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const togglePromptSelection = (promptId: string) => {
    const newSelected = new Set(selectedPrompts);
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId);
    } else {
      newSelected.add(promptId);
    }
    setSelectedPrompts(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedPrompts.size === prompts.length) {
      setSelectedPrompts(new Set());
    } else {
      setSelectedPrompts(new Set(prompts.map((p) => p._id)));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Process Low-Score Prompts</DialogTitle>
          <DialogDescription>Find and process all prompts with score below 70%</DialogDescription>
        </DialogHeader>

        {showResults ? (
          <div className="space-y-4">
            {/* Results Summary */}
            <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <div className="flex items-start gap-4">
                <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Bulk Processing Complete</h3>
                  <p className="text-green-700 mt-1">
                    Successfully processed {processedCount} out of {selectedPrompts.size} prompts
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    All processed prompts have been added to the review queue for BA approval
                  </p>
                </div>
              </div>
            </Card>

            <DialogFooter>
              <Button
                onClick={() => {
                  onProcessingComplete?.();
                  onClose();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Load Button */}
            {prompts.length === 0 && !error && (
              <Button onClick={fetchLowScorePrompts} disabled={isLoading} className="gap-2 w-full">
                {isLoading ? <Spinner className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {isLoading ? 'Loading...' : 'Find Low-Score Prompts'}
              </Button>
            )}

            {/* Error */}
            {error && (
              <Card className="p-4 bg-red-50 border-red-200 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </Card>
            )}

            {/* Prompts List */}
            {prompts.length > 0 && (
              <div className="space-y-4">
                {/* Select All */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedPrompts.size === prompts.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedPrompts.size === 0 ? 'Select All' : `${selectedPrompts.size} Selected`}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {prompts.length} low-score prompts
                  </Badge>
                </div>

                {/* Prompt List */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {prompts.map((prompt) => (
                    <Card key={prompt._id} className="p-3 border border-gray-200">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedPrompts.has(prompt._id)}
                          onChange={() => togglePromptSelection(prompt._id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2">{prompt.userPrompt}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                            <span>Score: {(prompt.currentScore * 100).toFixed(0)}%</span>
                            <Badge className="bg-yellow-100 text-yellow-800">{prompt.priority}</Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Action Buttons */}
                <DialogFooter>
                  <Button onClick={onClose} variant="outline">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleBulkProcess}
                    disabled={isProcessing || selectedPrompts.size === 0}
                    className="gap-2"
                  >
                    {isProcessing ? <Spinner className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
                    {isProcessing ? 'Processing...' : `Process ${selectedPrompts.size} Prompts`}
                  </Button>
                </DialogFooter>
              </div>
            )}

            {/* Empty State */}
            {prompts.length === 0 && !isLoading && !error && (
              <Card className="p-8 text-center bg-gray-50 border-gray-200">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">All prompts are healthy</p>
                <p className="text-gray-500 text-sm mt-1">No prompts found with score below 70%</p>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
