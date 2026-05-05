'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronLeft, Download, Share2, CheckCircle } from 'lucide-react';
import { promptTemplateClient } from '@/src/api/prompt-template-client';
import { Spinner } from '@/components/ui/spinner';

interface TemplateBuilderWizardProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
  baEmail: string;
  similarPrompts?: Array<{
    id: string;
    prompt: string;
    improvement: string;
    score: number;
  }>;
}

type WizardStep = 'select' | 'define' | 'guidelines' | 'review';

export function TemplateBuilderWizard({
  applicationId,
  isOpen,
  onClose,
  baEmail,
  similarPrompts = [],
}: TemplateBuilderWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [qualityGuidelines, setQualityGuidelines] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [autoApply, setAutoApply] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSelectPrompt = (promptId: string) => {
    const newSelected = new Set(selectedPrompts);
    if (newSelected.has(promptId)) {
      newSelected.delete(promptId);
    } else {
      newSelected.add(promptId);
    }
    setSelectedPrompts(newSelected);
  };

  const handleNext = () => {
    setError('');
    if (step === 'select') {
      if (selectedPrompts.size === 0) {
        setError('Please select at least one prompt');
        return;
      }
      setStep('define');
    } else if (step === 'define') {
      if (!templateName || !promptTemplate) {
        setError('Template name and prompt template are required');
        return;
      }
      setStep('guidelines');
    } else if (step === 'guidelines') {
      if (!qualityGuidelines) {
        setError('Quality guidelines are required');
        return;
      }
      setStep('review');
    }
  };

  const handlePrevious = () => {
    if (step === 'define') setStep('select');
    else if (step === 'guidelines') setStep('define');
    else if (step === 'review') setStep('guidelines');
  };

  const handleCreateTemplate = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await promptTemplateClient.createTemplate(applicationId, {
        templateName,
        description,
        promptTemplate,
        qualityGuidelines,
        category: category || undefined,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        baEmail,
        autoApply,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to create template');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep('select');
    setSelectedPrompts(new Set());
    setTemplateName('');
    setDescription('');
    setPromptTemplate('');
    setQualityGuidelines('');
    setCategory('');
    setTags('');
    setAutoApply(false);
    setError('');
    setSuccess(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Prompt Template</DialogTitle>
          <DialogDescription>
            Build a reusable template from similar prompts you've reviewed. Step {['select', 'define', 'guidelines', 'review'].indexOf(step) + 1} of 4
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
            <p className="text-lg font-semibold text-green-900 mb-2">Template Created Successfully!</p>
            <p className="text-sm text-gray-600">Your prompt template is ready to be published</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Progress Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {['select', 'define', 'guidelines', 'review'].map((s, idx) => (
                  <div key={s} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        ['select', 'define', 'guidelines', 'review'].indexOf(step) >= idx
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    {idx < 3 && <div className="w-8 h-1 mx-1 bg-gray-200" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            <div className="space-y-4 min-h-96">
              {step === 'select' && (
                <div>
                  <h3 className="font-semibold mb-4">Step 1: Select Similar Prompts</h3>
                  <p className="text-sm text-gray-600 mb-4">Select 1 or more prompts that will form the basis of this template</p>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {similarPrompts.map((prompt) => (
                      <Card
                        key={prompt.id}
                        className={`p-4 cursor-pointer transition-colors ${
                          selectedPrompts.has(prompt.id) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => handleSelectPrompt(prompt.id)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedPrompts.has(prompt.id)}
                            onChange={() => {}}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-sm">{prompt.prompt}</p>
                            <p className="text-xs text-gray-600 mt-2 line-clamp-2">Improvement: {prompt.improvement}</p>
                            <Badge className="mt-2" variant="secondary">
                              Score: {prompt.score.toFixed(2)}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {step === 'define' && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Step 2: Define Template Structure</h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">Template Name *</label>
                    <Input
                      placeholder="e.g., Customer Support Query Template"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Description</label>
                    <textarea
                      placeholder="What is this template used for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Prompt Template *</label>
                    <textarea
                      placeholder="Define the prompt structure. Use {variable} for dynamic placeholders"
                      value={promptTemplate}
                      onChange={(e) => setPromptTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={5}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Category</label>
                      <Input
                        placeholder="e.g., customer-support"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Tags (comma-separated)</label>
                      <Input
                        placeholder="e.g., urgent, common, high-priority"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {step === 'guidelines' && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Step 3: Quality Guidelines</h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality Guidelines *</label>
                    <textarea
                      placeholder="Define quality standards and best practices for using this template..."
                      value={qualityGuidelines}
                      onChange={(e) => setQualityGuidelines(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoApply"
                      checked={autoApply}
                      onChange={(e) => setAutoApply(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="autoApply" className="text-sm">
                      Auto-apply this template to matching user queries
                    </label>
                  </div>
                </div>
              )}

              {step === 'review' && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Step 4: Review & Publish</h3>
                  <Card className="p-4 bg-gray-50">
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-700">Template Name</p>
                        <p className="text-gray-900">{templateName}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Description</p>
                        <p className="text-gray-900">{description || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Selected Prompts</p>
                        <p className="text-gray-900">{selectedPrompts.size} prompt(s)</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Category</p>
                        <p className="text-gray-900">{category || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-700">Auto-Apply</p>
                        <Badge variant={autoApply ? 'default' : 'secondary'}>
                          {autoApply ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between gap-3">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={step === 'select' || isSubmitting}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              {step === 'review' ? (
                <Button
                  onClick={handleCreateTemplate}
                  disabled={isSubmitting}
                  className="flex items-center gap-2"
                >
                  {isSubmitting ? <Spinner className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  {isSubmitting ? 'Creating...' : 'Create Template'}
                </Button>
              ) : (
                <Button onClick={handleNext} disabled={isSubmitting}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
