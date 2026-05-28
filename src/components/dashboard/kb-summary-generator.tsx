'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Copy, RefreshCw } from 'lucide-react';

interface KBSummaryGeneratorProps {
  applicationId: string;
  documentContent: string;
  documentId?: string;
  documentTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (summary: string, llmSuggestion: string) => Promise<void>;
  apiEndpoint?: string;
}

export function KBSummaryGenerator({
  applicationId,
  documentContent,
  documentId,
  documentTitle,
  isOpen,
  onClose,
  onSave,
  apiEndpoint = '/api/knowledge-base/assist/generate-summary',
}: KBSummaryGeneratorProps) {
  const [llmSuggestion, setLlmSuggestion] = useState<string>('');
  const [userEditedVersion, setUserEditedVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const generateSummary = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess(false);

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          documentId,
          contentText: documentContent,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate summary');
      }

      if (!data.data?.suggestion) {
        throw new Error('No summary returned from AI');
      }

      setLlmSuggestion(data.data.suggestion);
      setUserEditedVersion(data.data.suggestion);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate summary';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!userEditedVersion.trim()) {
        setError('Please provide a summary');
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
      const message = err instanceof Error ? err.message : 'Failed to save summary';
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

  const compressionRatio = ((1 - userEditedVersion.length / documentContent.length) * 100).toFixed(1);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate KB Summary</DialogTitle>
          <DialogDescription>
            {documentTitle ? `Create a summary for: ${documentTitle}` : 'AI will generate a summary of this knowledge base content. Edit before saving.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Original Content Info */}
          <Card className="p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Original Content</p>
                <p className="font-semibold">{documentContent.length.toLocaleString()} characters</p>
              </div>
              {llmSuggestion && (
                <div className="text-right">
                  <p className="text-sm text-gray-600">Compression</p>
                  <p className="font-semibold text-green-600">{compressionRatio}% reduction</p>
                </div>
              )}
            </div>
          </Card>

          {/* Step 1: Generate Summary */}
          {!llmSuggestion && (
            <Card className="p-6 border-2 border-dashed">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Generate AI Summary</h3>
                  <p className="text-sm text-gray-600">
                    AI will analyze the document and create a concise, informative summary highlighting key concepts.
                  </p>
                </div>
                <Button onClick={generateSummary} disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Summary
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
                {/* AI Suggestion */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">AI Summary (Read-only)</label>
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words min-h-[250px]">
                      {llmSuggestion}
                    </p>
                  </Card>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                    <Badge variant="outline" className="text-xs">
                      {llmSuggestion.length} chars
                    </Badge>
                  </div>
                </div>

                {/* User Edited Version */}
                <div className="space-y-2">
                  <label htmlFor="edited-summary" className="block text-sm font-medium">
                    Your Version (Edit as needed)
                  </label>
                  <Textarea
                    id="edited-summary"
                    value={userEditedVersion}
                    onChange={(e) => setUserEditedVersion(e.target.value)}
                    placeholder="Edit the summary..."
                    className="min-h-[250px] resize-none"
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

              {/* Comparison Stats */}
              <Card className="p-4 bg-gray-50">
                <div className="grid grid-cols-4 gap-4 text-center text-sm">
                  <div>
                    <p className="text-gray-600">Original</p>
                    <p className="font-semibold">{documentContent.length} chars</p>
                  </div>
                  <div>
                    <p className="text-gray-600">AI Summary</p>
                    <p className="font-semibold">{llmSuggestion.length} chars</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Your Version</p>
                    <p className="font-semibold">{userEditedVersion.length} chars</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reduction</p>
                    <p className="font-semibold text-green-600">{compressionRatio}%</p>
                  </div>
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
                  <p className="text-sm text-green-700">Summary saved successfully</p>
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
                Generate Again
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
                    Save Summary
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
