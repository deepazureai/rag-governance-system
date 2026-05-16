'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Copy,
  GitFork,
  Download,
  Share2,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { LoadingState, ErrorFeedback, SuccessFeedback } from '@/src/components/common/loading-states';

interface Template {
  id: string;
  name: string;
  description: string;
  promptText: string;
  tags: string[];
  category: string;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
  metrics?: {
    averageScore: number;
  };
  isPublic: boolean;
  forkedFrom?: string;
}

interface TemplatesTabProps {
  applicationId: string;
}

export function TemplatesTab({ applicationId }: TemplatesTabProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [applicationId]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/templates/app/${applicationId}/list`);
      const data = await response.json();

      if (data.status === 'success') {
        setTemplates(data.data.templates || []);
      } else {
        setError(data.error?.message || 'Failed to load templates');
      }
    } catch (err) {
      setError('Error loading templates. Please try again.');
      console.error('[v0] Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCloneTemplate = async (templateId: string) => {
    try {
      const name = prompt('Enter a name for the cloned template:');
      if (!name) return;

      const response = await fetch(`/api/templates/${templateId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: name, appId: applicationId }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setFeedback({ type: 'success', message: 'Template cloned successfully' });
        await fetchTemplates();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Clone failed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error cloning template' });
    }
  };

  const handleForkTemplate = async (templateId: string) => {
    try {
      const name = prompt('Enter a name for the forked template:');
      if (!name) return;

      const response = await fetch(`/api/templates/${templateId}/fork`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName: name, appId: applicationId }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        setFeedback({ type: 'success', message: 'Template forked successfully' });
        await fetchTemplates();
      } else {
        setFeedback({ type: 'error', message: data.error?.message || 'Fork failed' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error forking template' });
    }
  };

  const handleDownload = async (templateId: string, format: 'json' | 'yaml' | 'csv') => {
    try {
      const response = await fetch('/api/templates/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateIds: [templateId], format }),
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `template.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Error downloading template' });
    }
  };

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || t.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  return (
    <div className="space-y-6">
      {/* Feedback Messages */}
      {feedback && (
        <div>
          {feedback.type === 'success' ? (
            <SuccessFeedback message={feedback.message} />
          ) : (
            <ErrorFeedback message={feedback.message} onDismiss={() => setFeedback(null)} />
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Prompt Templates</h3>
          <p className="text-sm text-gray-600 mt-1">
            Create, manage, and share reusable prompt templates
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Total Templates</p>
          <p className="text-2xl font-bold text-blue-600">{templates.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Categories</p>
          <p className="text-2xl font-bold text-purple-600">{categories.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Most Used</p>
          <p className="text-2xl font-bold text-green-600">
            {Math.max(...templates.map((t) => t.usageCount), 0)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-600 mb-1">Avg Score</p>
          <p className="text-2xl font-bold text-orange-600">
            {templates.length > 0
              ? (
                  templates.reduce((sum, t) => sum + (t.metrics?.averageScore || 0), 0) / templates.length
                ).toFixed(1)
              : 'N/A'}
          </p>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search templates by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-600" />
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  !selectedCategory
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Templates List */}
      <LoadingState
        isLoading={loading}
        error={error}
        isEmpty={templates.length === 0}
        emptyMessage="No templates yet. Create one to get started."
        onRetry={fetchTemplates}
      >
        <div className="space-y-3">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900 truncate">{template.name}</h4>
                    {template.forkedFrom && (
                      <Badge variant="secondary" className="text-xs">
                        Forked
                      </Badge>
                    )}
                    {template.isPublic && (
                      <Badge className="text-xs bg-green-100 text-green-800">
                        Public
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-6 mt-3 text-xs text-gray-500">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(template.createdAt).toLocaleDateString()}
                        </TooltipTrigger>
                        <TooltipContent>Created by {template.createdBy}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {template.usageCount > 0 && (
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {template.usageCount} uses
                      </div>
                    )}

                    {template.metrics?.averageScore && (
                      <div className="flex items-center gap-1 font-semibold text-blue-600">
                        Score: {template.metrics.averageScore.toFixed(1)}/100
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleCloneTemplate(template.id)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Clone</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleForkTemplate(template.id)}
                        >
                          <GitFork className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Fork</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <div className="relative group">
                    <Button size="sm" variant="ghost">
                      <Download className="w-4 h-4" />
                    </Button>
                    <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => handleDownload(template.id, 'json')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        JSON
                      </button>
                      <button
                        onClick={() => handleDownload(template.id, 'yaml')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        YAML
                      </button>
                      <button
                        onClick={() => handleDownload(template.id, 'csv')}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        CSV
                      </button>
                    </div>
                  </div>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <Share2 className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Share</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View Details</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </LoadingState>
    </div>
  );
}
