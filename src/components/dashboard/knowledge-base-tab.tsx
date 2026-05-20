'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Database, Search, AlertCircle, CheckCircle2, Loader2, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DocumentSource {
  id: string;
  name: string;
  type: 'document' | 'postgresql';
  status: 'active' | 'syncing' | 'failed';
  itemCount: number;
  lastSync: string;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: 'document' | 'postgresql' | 'external';
  relevanceScore: number;
  fileName?: string;
  tableName?: string;
}

interface ValidationResult {
  groundednessScore: number;
  interpretation: string;
  matchedTerms: string[];
  supportingDocuments: Array<{
    preview: string;
    relevance: number;
    source: string;
  }>;
}

export function KnowledgeBaseTab({ applicationId }: { applicationId: string }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'search' | 'validate'>('upload');
  const [sources, setSources] = useState<DocumentSource[]>([
    {
      id: '1',
      name: 'Product Docs.pdf',
      type: 'document',
      status: 'active',
      itemCount: 145,
      lastSync: '2 hours ago',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Validation state
  const [validationPrompt, setValidationPrompt] = useState('');
  const [validationResponse, setValidationResponse] = useState('');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    try {
      const response = await fetch(`/api/knowledge-base/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          query: searchQuery,
          k: 5,
        }),
      });

      if (!response.ok) throw new Error('Search failed');
      const data = await response.json();

      setSearchResults(
        data.results.map((r: any) => ({
          id: r.id,
          title: `${r.source} - Chunk ${r.chunkIndex}`,
          content: r.content,
          source: 'document',
          relevanceScore: r.relevanceScore,
          fileName: r.source,
        }))
      );
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleValidateResponse = async () => {
    if (!validationPrompt.trim() || !validationResponse.trim()) {
      alert('Please enter both prompt and response');
      return;
    }

    setIsValidating(true);

    try {
      const response = await fetch(`/api/knowledge-base/validate-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          userPrompt: validationPrompt,
          llmResponse: validationResponse,
          topK: 3,
        }),
      });

      if (!response.ok) throw new Error('Validation failed');
      const data = await response.json();

      setValidationResult(data.validationResults);
    } catch (error) {
      console.error('Validation error:', error);
      alert('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    formData.append('applicationId', applicationId);
    formData.append('namespace', 'default');

    try {
      const response = await fetch(`/api/knowledge-base/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      const data = await response.json();

      // Add new sources to list
      for (const result of data.results) {
        if (result.status === 'success') {
          setSources((prev) => [
            ...prev,
            {
              id: `${Date.now()}-${Math.random()}`,
              name: result.filename,
              type: 'document',
              status: 'active',
              itemCount: result.chunksCreated || 0,
              lastSync: 'just now',
            },
          ]);
        }
      }

      setUploadProgress(100);
      setTimeout(() => {
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      alert('Upload failed');
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="validate" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Validate
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6 mt-4">
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-start gap-4">
              <Upload className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Upload Documents</h3>
                <p className="text-sm text-gray-600 mb-4">Upload PDF, TXT, JSON, or CSV files for knowledge base vectorization.</p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.txt,.json,.csv"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <div>
                        <p className="font-medium text-gray-900">Drag files here or click to upload</p>
                        <p className="text-xs text-gray-600 mt-1">Supports PDF, TXT, JSON, CSV (Max 100MB)</p>
                      </div>
                    </div>
                  </label>
                </div>

                {uploadProgress > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uploading and vectorizing...</span>
                      <span className="font-medium text-gray-900">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Active Sources */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Active Data Sources ({sources.length})</h3>
            {sources.length === 0 ? (
              <p className="text-gray-600">No data sources yet. Upload documents above.</p>
            ) : (
              <div className="space-y-3">
                {sources.map((source) => (
                  <div key={source.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900">{source.name}</p>
                      <p className="text-xs text-gray-600">{source.itemCount} chunks · {source.lastSync}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="space-y-6 mt-4">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Hybrid Search</h3>

            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 hover:bg-blue-700">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-900">Found {searchResults.length} results</p>
                {searchResults.map((result) => (
                  <Card key={result.id} className="p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-gray-900">{result.title}</h4>
                      <Badge variant="outline">{Math.round(result.relevanceScore * 100)}% match</Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{result.content}</p>
                  </Card>
                ))}
              </div>
            )}

            {!searchQuery && <p className="text-center py-8 text-gray-600">Enter a search query</p>}
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validate" className="space-y-6 mt-4">
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Validate Response Against Knowledge Base</h3>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">User Prompt</label>
                <Input
                  placeholder="Enter the user prompt..."
                  value={validationPrompt}
                  onChange={(e) => setValidationPrompt(e.target.value)}
                  className="min-h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">LLM Response</label>
                <textarea
                  placeholder="Enter the LLM response..."
                  value={validationResponse}
                  onChange={(e) => setValidationResponse(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg font-mono text-sm min-h-24"
                />
              </div>

              <Button onClick={handleValidateResponse} disabled={isValidating} className="w-full bg-blue-600 hover:bg-blue-700">
                {isValidating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                Validate Response
              </Button>
            </div>

            {validationResult && (
              <div className="space-y-4 mt-6 border-t pt-6">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div>
                    <p className="text-sm font-medium text-blue-900">Groundedness Score</p>
                    <p className="text-2xl font-bold text-blue-900">{validationResult.groundednessScore}%</p>
                  </div>
                  <CheckCircle2 className={`w-8 h-8 ${validationResult.groundednessScore >= 80 ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-600">{validationResult.interpretation}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Matched Terms: {validationResult.matchedTerms.length}</p>
                  <div className="flex flex-wrap gap-2">
                    {validationResult.matchedTerms.map((term) => (
                      <Badge key={term} className="bg-green-100 text-green-800">
                        {term}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">Supporting Documents</p>
                  <div className="space-y-2">
                    {validationResult.supportingDocuments.map((doc, idx) => (
                      <Card key={idx} className="p-3 bg-gray-50 border border-gray-200">
                        <p className="text-xs text-gray-600 mb-2">{doc.source} - {doc.relevance}% relevance</p>
                        <p className="text-sm text-gray-700 line-clamp-2">{doc.preview}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

