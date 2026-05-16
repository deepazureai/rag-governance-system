'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Database, Search, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
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

export function KnowledgeBaseTab({ applicationId }: { applicationId: string }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'search'>('upload');
  const [sources, setSources] = useState<DocumentSource[]>([
    {
      id: '1',
      name: 'Product Docs.pdf',
      type: 'document',
      status: 'active',
      itemCount: 145,
      lastSync: '2 hours ago',
    },
    {
      id: '2',
      name: 'customer_data',
      type: 'postgresql',
      status: 'active',
      itemCount: 3250,
      lastSync: '1 hour ago',
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setSearchResults([
      {
        id: '1',
        title: 'Groundedness Definition',
        content: 'Groundedness measures whether the generated text is grounded in the provided context...',
        source: 'document',
        relevanceScore: 0.94,
        fileName: 'Product Docs.pdf',
      },
      {
        id: '2',
        title: 'Customer Support Policy',
        content: 'Our support policy requires all responses to include source citations and timestamps...',
        source: 'postgresql',
        relevanceScore: 0.87,
        tableName: 'customer_data',
      },
      {
        id: '3',
        title: 'Best Practices',
        content: 'Always structure responses with clear sections, numbered lists, and explicit sourcing...',
        source: 'document',
        relevanceScore: 0.82,
        fileName: 'Best Practices.pdf',
      },
    ]);

    setIsSearching(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setUploadProgress(0);

        // Mock add new source
        setSources((prev) => [
          ...prev,
          {
            id: String(prev.length + 1),
            name: files[0].name,
            type: 'document',
            status: 'active',
            itemCount: 0,
            lastSync: 'just now',
          },
        ]);
      }
      setUploadProgress(progress);
    }, 200);
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'upload' | 'search')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload & Connect
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Search Knowledge Base
          </TabsTrigger>
        </TabsList>

        {/* Upload & Connect Tab */}
        <TabsContent value="upload" className="space-y-6 mt-4">
          {/* Document Upload Section */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-start gap-4">
              <Upload className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Upload Documents</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload PDF, TXT, JSON, or CSV files. We'll automatically extract text, generate embeddings,
                  and index them for semantic + full-text search.
                </p>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.txt,.json,.csv"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                      <div>
                        <p className="font-medium text-gray-900">Drag files here or click to upload</p>
                        <p className="text-xs text-gray-600 mt-1">Supports PDF, TXT, JSON, CSV (Max 100MB per file)</p>
                      </div>
                    </div>
                  </label>
                </div>

                {uploadProgress > 0 && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Uploading and generating embeddings...</span>
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

          {/* PostgreSQL Connection Section */}
          <Card className="p-6 bg-white border border-gray-200">
            <div className="flex items-start gap-4">
              <Database className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">Connect PostgreSQL Database</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Select specific tables or columns from your PostgreSQL database. We'll sync the data and
                  generate embeddings for semantic search.
                </p>

                <div className="space-y-3">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    <Database className="w-4 h-4 mr-2" />
                    Configure PostgreSQL Connection
                  </Button>
                  <p className="text-xs text-gray-500">
                    You'll be able to select specific tables, columns, and set up automatic daily syncing.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Active Sources */}
          <Card className="p-6 bg-white border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Active Data Sources</h3>

            {sources.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No data sources configured yet. Upload documents or connect a database.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sources.map((source) => (
                  <div
                    key={source.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {source.type === 'document' ? (
                        <Upload className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Database className="w-4 h-4 text-green-600" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{source.name}</p>
                        <p className="text-xs text-gray-600">
                          {source.itemCount.toLocaleString()} items · Last synced {source.lastSync}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {source.status === 'active' && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Active
                        </Badge>
                      )}
                      {source.status === 'syncing' && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Syncing
                        </Badge>
                      )}
                      {source.status === 'failed' && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </Badge>
                      )}
                    </div>
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
            <p className="text-sm text-gray-600 mb-4">
              Search across all uploaded documents and connected databases using semantic + text search combined.
              Compare results with your dashboard monitoring data for validation.
            </p>

            <div className="flex gap-2">
              <Input
                placeholder="Search documents and database... (e.g., 'groundedness best practices')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isSearching} className="bg-blue-600 hover:bg-blue-700">
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-gray-900">Found {searchResults.length} results</p>
                {searchResults.map((result) => (
                  <Card key={result.id} className="p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{result.title}</h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">{result.content}</p>
                        </div>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {Math.round(result.relevanceScore * 100)}% match
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {result.source === 'document' && (
                          <>
                            <Upload className="w-3 h-3" />
                            <span>Document: {result.fileName}</span>
                          </>
                        )}
                        {result.source === 'postgresql' && (
                          <>
                            <Database className="w-3 h-3" />
                            <span>Database: {result.tableName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {searchQuery && !isSearching && searchResults.length === 0 && (
              <div className="mt-6 text-center py-8 text-gray-600">
                <Search className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                <p>No results found. Try different search terms.</p>
              </div>
            )}

            {!searchQuery && (
              <div className="mt-6 text-center py-8 text-gray-600">
                <Search className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                <p>Enter a search query to find documents and database records.</p>
              </div>
            )}
          </Card>

          {/* Search Tips */}
          <Card className="p-4 bg-blue-50 border border-blue-200">
            <p className="text-sm font-medium text-blue-900 mb-2">Search Tips:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Use natural language queries like "how to improve groundedness"</li>
              <li>• Results show relevance score (higher = better match)</li>
              <li>• Click a result to see side-by-side comparison with dashboard data</li>
              <li>• Combine results with debug analysis to validate your prompts</li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
