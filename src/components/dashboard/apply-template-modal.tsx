'use client';

import { useState, useEffect } from 'react';
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
import { Search, Loader2, Copy, CheckCircle } from 'lucide-react';
import { LoadingState, ErrorFeedback } from '@/src/components/common/loading-states';

interface Template {
  id: string;
  name: string;
  description: string;
  promptText: string;
  tags: string[];
  category: string;
  metrics?: {
    averageScore: number;
  };
  usageCount: number;
}

interface ApplyTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: string;
  onApply: (template: Template) => void;
}

export function ApplyTemplateModal({
  isOpen,
  onClose,
  applicationId,
  onApply,
}: ApplyTemplateModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filtered, setFiltered] = useState<Template[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedTemplate, setAppliedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, applicationId]);

  useEffect(() => {
    let result = templates;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'All') {
      result = result.filter((t) => t.category === selectedCategory);
    }

    setFiltered(result);
  }, [searchQuery, selectedCategory, templates]);

  const fetchTemplates = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates?applicationId=${applicationId}`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data.templates || []);
      setFiltered(data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (template: Template) => {
    setAppliedTemplate(template.id);
    setTimeout(() => {
      onApply(template);
      setAppliedTemplate(null);
      onClose();
    }, 500);
  };

  const categories = ['All', ...new Set(templates.map((t) => t.category))];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Prompt Template</DialogTitle>
          <DialogDescription>
            Choose a template to use as a starting point for your new prompt
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          {loading ? (
            <LoadingState message="Loading templates..." />
          ) : error ? (
            <ErrorFeedback title="Error" message={error} />
          ) : filtered.length === 0 ? (
            <Card className="p-8 text-center bg-gray-50">
              <p className="text-gray-600">No templates found</p>
            </Card>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {filtered.map((template) => (
                <Card
                  key={template.id}
                  className="p-4 border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                    </div>
                    <Button
                      onClick={() => handleApply(template)}
                      size="sm"
                      variant={appliedTemplate === template.id ? 'default' : 'outline'}
                      disabled={appliedTemplate !== null}
                      className="gap-2"
                    >
                      {appliedTemplate === template.id ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Applying...
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Apply
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex gap-4 text-xs mb-2">
                    <span className="text-gray-500">
                      Category: <span className="font-medium text-gray-700">{template.category}</span>
                    </span>
                    <span className="text-gray-500">
                      Used: <span className="font-medium text-gray-700">{template.usageCount} times</span>
                    </span>
                    {template.metrics?.averageScore && (
                      <span className="text-gray-500">
                        Avg Score:{' '}
                        <span className="font-medium text-gray-700">
                          {template.metrics.averageScore.toFixed(1)}/100
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Close Button */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
