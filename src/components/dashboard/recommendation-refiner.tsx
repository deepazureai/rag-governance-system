'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Copy, RefreshCw } from 'lucide-react';

interface RecommendationRefinerProps {
  applicationId: string;
  originalRecommendation: string;
  queueItemId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (refinedText: string, llmSuggestion: string) => Promise<void>;
  apiEndpoint?: string;
}

export function RecommendationRefiner({
  applicationId,
  originalRecommendation,
  queueItemId,
  isOpen,
  onClose,
  onSave,
  apiEndpoint = '/api/ba-review/assist/refine-recommendation',
}: RecommendationRefinerProps) {
  const [llmSuggestion, setLlmSuggestion] = useState<string>('');
  const [userEditedVersion, setUserEditedVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const generateSuggestion = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess(false);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          queueItemId,
          recommendationText: originalRecommendation,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate suggestion');
      }

      if (!data.data?.suggestion) {
        throw new Error('No suggestion returned from LLM');
      }

      setLlmSuggestion(data.data.suggestion);
      setUserEditedVersion(data.data.suggestion);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to get LLM suggestion';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!userEditedVersion.trim()) {
        setError('Please provide a recommendation');
        return;
      }

      setIsSaving(true);
      setError('');

      await onSave(userEditedVersion, llmSuggestion);
      setSuccess(true);

      setTimeout(() => {
        onClose();
        setLlmSuggestion('');
        setUserEditedVersion('');
        setSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save recommendation';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(userEditedVersion);
  };

  const handleReset = () => {
    setUserEditedVersion(llmSuggestion);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refine Recommendation</DialogTitle>
          <DialogDescription>
            Get AI suggestions to improve your recommendation, then edit before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Recommendation (read-only) */}
          <div>
            <label className="block text-sm font-medium mb-2">Original Recommendation</label>
            <Card className="p-4 bg-gray-50 border-gray-200">
              <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                {originalRecommendation}
              </p>
            </Card>
          </div>

          {/* Step 1: Generate Suggestion */}
          {!llmSuggestion && (
            <Card className="p-6 border-2 border-dashed">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Get AI Suggestion</h3>
                  <p className="text-sm text-gray-600">
                    Let AI improve the clarity and professionalism of this recommendation.
                  </p>
                </div>
                <Button onClick={generateSuggestion} disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Get Suggestion
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}

          {/* Step 2: Review and Edit */}
          {llmSuggestion && (
            <>
              <div className="grid grid-cols-2 gap-4">
                {/* LLM Suggestion */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">AI Suggestion (Read-only)</label>
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words min-h-[180px]">
                      {llmSuggestion}
                    </p>
                  </Card>
                  <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                </div>

                {/* User Edited Version */}
                <div className="space-y-2">
                  <label htmlFor="edited-recommendation" className="block text-sm font-medium">
                    Your Version (Edit as needed)
                  </label>
                  <Textarea
                    id="edited-recommendation"
                    value={userEditedVersion}
                    onChange={(e) => setUserEditedVersion(e.target.value)}
                    placeholder="Edit the suggestion..."
                    className="min-h-[180px] resize-none"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCopy} variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button onClick={handleReset} variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reset
                    </Button>
                  </div>
                </div>
              </div>

              {/* Character Count */}
              <Card className="p-3 bg-gray-50 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Original: {originalRecommendation.length} chars</span>
                  <span className="text-gray-600">Your Version: {userEditedVersion.length} chars</span>
                  <span className="font-medium">
                    {userEditedVersion === llmSuggestion ? 'No changes' : 'Edited'}
                  </span>
                </div>
              </Card>
            </>
          )}

          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-50 border-red-200">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-900">Error</p>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Success Message */}
          {success && (
            <Card className="p-4 bg-green-50 border-green-200">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="font-medium text-green-900">Success!</p>
                  <p className="text-sm text-green-700">Recommendation saved</p>
                </div>
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading || isSaving}
            >
              Cancel
            </Button>
            {llmSuggestion && (
              <Button
                onClick={() => setLlmSuggestion('')}
                disabled={isLoading || isSaving}
                variant="outline"
              >
                Try Again
              </Button>
            )}
            {llmSuggestion && (
              <Button
                onClick={handleSave}
                disabled={isSaving || !userEditedVersion.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
