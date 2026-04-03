'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockApps } from '@/data/mockData';
import { Zap, Send, Copy } from 'lucide-react';

export default function ExplorePage() {
  const [selectedApp, setSelectedApp] = useState<string>(mockApps[0].id);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string; response: string }>>([]);

  const handleExecuteQuery = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const mockResponse = `Based on the query "${query.substring(0, 50)}...", the system retrieved 5 relevant documents with an average relevance score of 92.3%. The generated response synthesizes information from: 

1. Document A (95% relevance) - Contains primary information
2. Document B (89% relevance) - Provides supporting context  
3. Document C (87% relevance) - Additional details

Response Time: 245ms | Confidence: 92.3% | Token Usage: 487/2048`;

    setResponse(mockResponse);
    setQueryHistory([{ query, response: mockResponse }, ...queryHistory]);
    setQuery('');
    setIsLoading(false);
  };

  const app = mockApps.find((a) => a.id === selectedApp);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Explore & Query</h1>
          <p className="text-gray-600">
            Test and explore your RAG applications with real queries
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Query Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* App Selection */}
            <Card className="p-6 bg-white">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Application
              </label>
              <Select value={selectedApp} onValueChange={setSelectedApp}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {mockApps.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {app && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">Framework:</span> {app.ragFramework}
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    <span className="font-semibold">Status:</span>{' '}
                    <Badge
                      className={
                        app.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }
                    >
                      {app.status}
                    </Badge>
                  </p>
                </div>
              )}
            </Card>

            {/* Query Input */}
            <Card className="p-6 bg-white">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Enter Your Query
              </label>
              <Textarea
                placeholder="Ask a question about your application..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-4 min-h-24"
                disabled={isLoading}
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleExecuteQuery}
                  disabled={!query.trim() || isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? 'Processing...' : 'Execute Query'}
                </Button>
              </div>
            </Card>

            {/* Response */}
            {response && (
              <Card className="p-6 bg-white border-l-4 border-l-green-600">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Response</h3>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => navigator.clipboard.writeText(response)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 whitespace-pre-wrap text-sm text-gray-700">
                  {response}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar - Query History */}
          <div className="space-y-6">
            <Card className="p-6 bg-white">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Query History</h3>
              </div>

              {queryHistory.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {queryHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 cursor-pointer transition-colors group"
                      onClick={() => {
                        setQuery(item.query);
                        setResponse(item.response);
                      }}
                    >
                      <p className="text-xs text-gray-600 line-clamp-3">{item.query}</p>
                      <p className="text-xs text-gray-500 mt-2">Click to review</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">
                  No queries yet. Start by executing a query above.
                </p>
              )}

              {queryHistory.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setQueryHistory([])}
                >
                  Clear History
                </Button>
              )}
            </Card>

            {/* Quick Tips */}
            <Card className="p-6 bg-blue-50 border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-3">Tips for Better Results</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  Be specific with your queries
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  Use natural language
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  Include context when needed
                </li>
                <li className="flex gap-2">
                  <span className="text-blue-600 font-bold">•</span>
                  Review retrieval scores
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
