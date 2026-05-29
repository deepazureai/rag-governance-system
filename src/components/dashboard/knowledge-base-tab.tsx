'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, MessageSquare, Search } from 'lucide-react';
import { KnowledgeBaseUpload } from './knowledge-base-upload';

export function KnowledgeBaseTab({ applicationId }: { applicationId: string }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'chat' | 'search'>('upload');

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'upload' | 'chat' | 'search')}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload & Manage</span>
            <span className="sm:hidden">Upload</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Knowledge Chat</span>
            <span className="sm:hidden">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search & Validate</span>
            <span className="sm:hidden">Search</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <KnowledgeBaseUpload applicationId={applicationId} />
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Knowledge Base Chat feature coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="search" className="mt-0">
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Search & Validate feature coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
