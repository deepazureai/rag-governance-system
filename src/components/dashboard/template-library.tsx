'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, Share2, Trash2, Archive, FileJson, FileText, RefreshCw } from 'lucide-react';
import { promptTemplateClient } from '@/src/api/prompt-template-client';
import { Spinner } from '@/components/ui/spinner';
import { PromptTemplate } from '@/src/types/index';

interface TemplateLibraryProps {
  applicationId: string;
}

export function TemplateLibrary({ applicationId }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('published');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [applicationId, statusFilter]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { templates } = await promptTemplateClient.getTemplates(applicationId, {
        status: statusFilter === 'all' ? undefined : (statusFilter as any),
      });
      setTemplates(templates);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePublish = async (templateId: string) => {
    try {
      await promptTemplateClient.publishTemplate(templateId, 'user@company.com');
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleArchive = async (templateId: string) => {
    try {
      await promptTemplateClient.archiveTemplate(templateId);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await promptTemplateClient.deleteTemplate(templateId);
      fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    setIsExporting(true);
    try {
      await promptTemplateClient.downloadTemplates(
        applicationId,
        format,
        statusFilter === 'all' ? undefined : (statusFilter as any)
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTemplates = templates.filter((t) =>
    t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Prompt Templates</h2>
          <p className="text-sm text-gray-600 mt-1">Manage and share reusable prompt templates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('json')} disabled={isExporting}>
            {isExporting ? <Spinner className="w-4 h-4 mr-2" /> : <FileJson className="w-4 h-4 mr-2" />}
            JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting}>
            {isExporting ? <Spinner className="w-4 h-4 mr-2" /> : <FileText className="w-4 h-4 mr-2" />}
            CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Input
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
        <div className="flex items-center gap-2">
          {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={fetchTemplates} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error && (
        <Card className="p-4 bg-red-50 border border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {/* Templates Grid */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8 text-blue-600" />
          </div>
        ) : filteredTemplates.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">No templates found</p>
          </Card>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template._id} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{template.templateName}</h3>
                    <Badge className={getStatusColor(template.status)}>{template.status}</Badge>
                    {template.category && <Badge variant="secondary">{template.category}</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4 text-sm py-3 border-t border-b border-gray-200">
                <div>
                  <p className="text-gray-600">Usage</p>
                  <p className="font-semibold text-gray-900">{template.usageMetrics.totalUsageCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Score</p>
                  <p className="font-semibold text-gray-900">
                    {template.usageMetrics.averageQualityScore?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Version</p>
                  <p className="font-semibold text-gray-900">v{template.currentVersion}</p>
                </div>
                <div>
                  <p className="text-gray-600">Created</p>
                  <p className="font-semibold text-gray-900 text-xs">
                    {new Date(template.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {template.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {template.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePublish(template._id)}
                    >
                      Publish
                    </Button>
                  )}
                  {template.status !== 'archived' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleArchive(template._id)}
                      title="Archive"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(template._id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
