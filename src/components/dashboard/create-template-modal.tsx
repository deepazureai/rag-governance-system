'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { X, Plus, Loader2 } from 'lucide-react';
import { useApiCall } from '@/src/hooks/useApiCall';
import { SuccessFeedback, ErrorFeedback } from '@/src/components/common/loading-states';

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
  analysis: {
    rootCauses: Array<{
      metric: string;
      issue: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
    }>;
  };
  metrics: Record<string, number>;
  applicationId: string;
  onSuccess?: (template: any) => void;
}

export function CreateTemplateModal({
  isOpen,
  onClose,
  promptText,
  analysis,
  metrics,
  applicationId,
  onSuccess,
}: CreateTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [category, setCategory] = useState('General');

  const { execute: createTemplate, loading, error, success } = useApiCall();

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!templateName.trim()) {
      alert('Template name is required');
      return;
    }

    const templateData = {
      name: templateName,
      description: templateDesc,
      promptText,
      tags,
      category,
      applicationId,
      metrics: {
        averageScore: Object.values(metrics).reduce((a, b) => a + b, 0) / Object.keys(metrics).length,
      },
      analysis: {
        rootCauses: analysis.rootCauses,
        recommendations: analysis.recommendations,
      },
    };

    await createTemplate('/api/templates', {
      method: 'POST',
      body: JSON.stringify(templateData),
    });

    if (!error) {
      setTemplateName('');
      setTemplateDesc('');
      setTags([]);
      setCategory('General');
      setTimeout(() => {
        onClose();
        onSuccess?.(templateData);
      }, 1500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Prompt Template</DialogTitle>
          <DialogDescription>
            Save this successful prompt as a reusable template for your team
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Template Name *
              </label>
              <Input
                placeholder="e.g., Customer Support Response"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Description
              </label>
              <textarea
                placeholder="Describe when and how to use this template..."
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                disabled={loading}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
                className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>General</option>
                <option>Customer Support</option>
                <option>Content Generation</option>
                <option>Code Generation</option>
                <option>Analysis</option>
                <option>Summarization</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add a tag..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  disabled={loading}
                />
                <Button
                  onClick={handleAddTag}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600"
                      disabled={loading}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Original Prompt Preview */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Original Prompt
            </label>
            <Card className="p-3 bg-gray-50 border border-gray-200">
              <p className="text-sm text-gray-700 line-clamp-3">{promptText}</p>
            </Card>
          </div>

          {/* Metrics Summary */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              Performance Metrics
            </label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(metrics).map(([metric, score]) => (
                <Card key={metric} className="p-2 bg-blue-50 border border-blue-200">
                  <p className="text-xs text-gray-600">{metric}</p>
                  <p className="text-lg font-bold text-blue-600">{score.toFixed(1)}/100</p>
                </Card>
              ))}
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <ErrorFeedback
              title="Failed to create template"
              message={error instanceof Error ? error.message : 'Unknown error'}
            />
          )}

          {success && (
            <SuccessFeedback
              title="Template Created"
              message="Your template has been saved successfully"
            />
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !templateName.trim()}
              className="gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Template
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
