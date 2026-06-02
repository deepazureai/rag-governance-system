'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, MessageSquare } from 'lucide-react';
import { KnowledgeBaseUpload } from './knowledge-base-upload';
import { KnowledgeBaseChat } from './knowledge-base-chat';

export function KnowledgeBaseTab({ applicationId }: { applicationId: string }) {
  const [activeTab, setActiveTab] = useState<'upload' | 'chat'>('upload');

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={(value: string) => setActiveTab(value as 'upload' | 'chat')}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
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
        </TabsList>

        <TabsContent value="upload" className="mt-0">
          <KnowledgeBaseUpload applicationId={applicationId} />
        </TabsContent>

        <TabsContent value="chat" className="mt-0">
          <KnowledgeBaseChat applicationId={applicationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
