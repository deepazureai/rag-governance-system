'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LLMConfigTab } from '@/src/components/settings/llm-config-tab';
import { KBLLMSettings } from '@/src/components/settings/KBLLMSettings';
import { KBEmbeddingSettings } from '@/src/components/settings/KBEmbeddingSettings';

interface SettingsPageProps {
  applicationId?: string;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ applicationId }) => {
  const [activeTab, setActiveTab] = useState('llm-provider');

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">Manage your account and application preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="llm-provider">LLM</TabsTrigger>
            <TabsTrigger value="kb-embedding">KB Embedding</TabsTrigger>
            <TabsTrigger value="kb-llm">KB Chat</TabsTrigger>
          </TabsList>

          {/* LLM Provider Tab */}
          <TabsContent value="llm-provider" className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <LLMConfigTab />
            </div>
          </TabsContent>

          {/* Knowledge Base Embedding Tab */}
          <TabsContent value="kb-embedding" className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {applicationId && <KBEmbeddingSettings applicationId={applicationId} />}
            </div>
          </TabsContent>

          {/* Knowledge Base LLM Tab */}
          <TabsContent value="kb-llm" className="mt-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {applicationId && <KBLLMSettings applicationId={applicationId} />}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default SettingsPage;
