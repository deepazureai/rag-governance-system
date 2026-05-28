'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle, CheckCircle, Copy, RefreshCw } from 'lucide-react';
import { promptTemplateClient } from '@/src/api/prompt-template-client';

interface LLMTemplateAssistantProps {
  applicationId: string;
  selectedPromptIds: string[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (finalTemplate: string, llmSuggestion: string) => Promise<void>;
}

export function LLMTemplateAssistant({
  applicationId,
  selectedPromptIds,
  isOpen,
  onClose,
  onSave,
}: LLMTemplateAssistantProps) {
  const [llmSuggestion, setLlmSuggestion] = useState<string>('');
  const [userEditedVersion, setUserEditedVersion] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const generateSuggestion = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess(false);

      const response = await promptTemplateClient.generateLLMSuggestion(applicationId, selectedPromptIds);

      if (!response.success || !response.data?.suggestion) {
        throw new Error(response.message || 'Failed to generate suggestion');
      }

      setLlmSuggestion(response.data.suggestion);
      setUserEditedVersion(response.data.suggestion);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to generate LLM suggestion';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!userEditedVersion.trim()) {
        setError('Please provide a template prompt');
        return;
      }

      setIsSaving(true);
      setError('');

      await onSave(userEditedVersion, llmSuggestion);
      setSuccess(true);

      // Close after short delay
      setTimeout(() => {
        onClose();
        setLlmSuggestion('');
        setUserEditedVersion('');
        setSuccess(false);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save template';
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
          <DialogTitle>LLM-Assisted Template Generation</DialogTitle>
          <DialogDescription>
            Let AI help combine and improve your selected prompts, then refine the suggestion before saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Generate Suggestion */}
          {!llmSuggestion && (
            <Card className="p-6 border-2 border-dashed">
              <div className="text-center space-y-4">
                <div>
                  <h3 className="font-semibold text-lg mb-2">Generate LLM Suggestion</h3>
                  <p className="text-sm text-gray-600">
                    Selected {selectedPromptIds.length} prompt{selectedPromptIds.length !== 1 ? 's' : ''} for combination.
                    Click to get an AI-assisted suggestion.
                  </p>
                </div>
                <Button onClick={generateSuggestion} disabled={isLoading} size="lg">
                  {isLoading ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Suggestion
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
                {/* LLM Suggestion (read-only) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium">LLM Suggestion (Read-only)</label>
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words min-h-[200px]">
                      {llmSuggestion}
                    </p>
                  </Card>
                  <Badge variant="secondary" className="text-xs">AI Generated</Badge>
                </div>

                {/* User Edited Version */}
                <div className="space-y-2">
                  <label htmlFor="edited-template" className="block text-sm font-medium">
                    Your Version (Edit as needed)
                  </label>
                  <Textarea
                    id="edited-template"
                    value={userEditedVersion}
                    onChange={(e) => setUserEditedVersion(e.target.value)}
                    placeholder="Edit the suggestion here..."
                    className="min-h-[200px] resize-none"
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

              {/* Metrics */}
              <Card className="p-4 bg-gray-50">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Original Length:</span>
                    <span className="font-semibold ml-2">{llmSuggestion.length} chars</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Your Version:</span>
                    <span className="font-semibold ml-2">{userEditedVersion.length} chars</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Change:</span>
                    <span className="font-semibold ml-2">
                      {userEditedVersion === llmSuggestion ? 'No changes' : 'Edited'}
                    </span>
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
                  <p className="text-sm text-green-700">Template saved successfully</p>
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
                    Save Template
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
