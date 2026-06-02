'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Download, Share2, Trash2, Archive, FileJson, FileText, RefreshCw, Eye, Code } from 'lucide-react';
import { promptTemplateClient } from '@/src/api/prompt-template-client';
import { Spinner } from '@/components/ui/spinner';
import { PromptTemplate } from '@/src/types/index';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

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
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [viewDetailOpen, setViewDetailOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownloadTemplate = async (template: PromptTemplate) => {
    try {
      setDownloadingId(template._id);
      
      // Create template JSON payload
      const templateData = {
        name: template.templateName,
        description: template.description,
        promptTemplate: template.promptTemplate,
        qualityGuidelines: template.qualityGuidelines,
        category: template.category,
        tags: template.tags,
        expectedQualityScore: template.expectedQualityScore,
        expectedUserSatisfaction: template.expectedUserSatisfaction,
        version: template.currentVersion,
        status: template.status,
        exportedAt: new Date().toISOString(),
        applicationId: applicationId,
      };

      const jsonString = JSON.stringify(templateData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `template-${template.templateName.replace(/\s+/g, '-')}-${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('[v0] Template downloaded:', template.templateName);
    } catch (err: any) {
      setError(err.message || 'Failed to download template');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleViewDetails = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setViewDetailOpen(true);
  };

  const filteredTemplates = templates.filter((t) =>
    t.templateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Prompt Templates</h2>
            <p className="text-sm text-gray-600 mt-1">
              {statusFilter === 'published' ? 'Finalized templates from BA Review' : 'Browse and manage your prompt templates'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('json')} disabled={isExporting || templates.length === 0}>
              {isExporting ? <Spinner className="w-4 h-4 mr-2" /> : <FileJson className="w-4 h-4 mr-2" />}
              JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')} disabled={isExporting || templates.length === 0}>
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
                    <p className="text-sm text-gray-600 line-clamp-2">{template.description || 'No description provided'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4 text-sm py-3 border-t border-b border-gray-200">
                  <div>
                    <p className="text-gray-600">Usage</p>
                    <p className="font-semibold text-gray-900">{template.usageMetrics?.totalUsageCount || 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg Score</p>
                    <p className="font-semibold text-gray-900">
                      {template.usageMetrics?.averageQualityScore?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Version</p>
                    <p className="font-semibold text-gray-900">v{template.currentVersion || 1}</p>
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
                    {template.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {template.tags && template.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">+{template.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(template)}
                      title="View template details"
                      className="gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadTemplate(template)}
                      disabled={downloadingId === template._id}
                      title="Download template as JSON"
                      className="gap-1"
                    >
                      {downloadingId === template._id ? (
                        <Spinner className="w-4 h-4" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Download
                    </Button>

                    {template.status === 'draft' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePublish(template._id)}
                        title="Publish template"
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

      {/* Template Detail Modal */}
      {selectedTemplate && (
        <Dialog open={viewDetailOpen} onOpenChange={setViewDetailOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                {selectedTemplate.templateName}
              </DialogTitle>
              <DialogDescription>
                {selectedTemplate.description || 'No description provided'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Status</p>
                  <Badge className={getStatusColor(selectedTemplate.status)}>
                    {selectedTemplate.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Category</p>
                  <p className="font-medium text-gray-900">{selectedTemplate.category || 'Uncategorized'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Version</p>
                  <p className="font-medium text-gray-900">v{selectedTemplate.currentVersion || 1}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Created Date</p>
                  <p className="font-medium text-gray-900">{new Date(selectedTemplate.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Tags */}
              {selectedTemplate.tags && selectedTemplate.tags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality Guidelines */}
              {selectedTemplate.qualityGuidelines && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Quality Guidelines</p>
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTemplate.qualityGuidelines}</p>
                  </Card>
                </div>
              )}

              {/* Prompt Template */}
              <div>
                <p className="text-sm font-semibold text-gray-900 mb-2">Prompt Template</p>
                <Card className="p-4 bg-gray-50 border-gray-200">
                  <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap break-words max-h-64 overflow-y-auto">
                    {selectedTemplate.promptTemplate}
                  </pre>
                </Card>
              </div>

              {/* Usage Metrics */}
              {selectedTemplate.usageMetrics && (
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Usage Metrics</p>
                  <Card className="p-4 bg-green-50 border-green-200 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Total Usage</p>
                      <p className="text-lg font-semibold text-gray-900">{selectedTemplate.usageMetrics.totalUsageCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Avg Quality Score</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {selectedTemplate.usageMetrics.averageQualityScore?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Last Used</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTemplate.usageMetrics.lastUsedAt
                          ? new Date(selectedTemplate.usageMetrics.lastUsedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Success Rate</p>
                      <p className="text-sm font-medium text-gray-900">
                        {selectedTemplate.usageMetrics.successRate ? `${(selectedTemplate.usageMetrics.successRate * 100).toFixed(1)}%` : 'N/A'}
                      </p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadTemplate(selectedTemplate)}
                  disabled={downloadingId === selectedTemplate._id}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloadingId === selectedTemplate._id ? 'Downloading...' : 'Download Template'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setViewDetailOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
