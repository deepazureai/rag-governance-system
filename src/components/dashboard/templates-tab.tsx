'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { CrewAITemplate, DistributionTarget } from '@/types/templates';
import { AlertCircle } from 'lucide-react';

interface TemplatesTabProps {
  applicationId: string;
  userRole: string;
  userId: string;
}

type TabValue = 'create' | 'library';

/**
 * Templates Tab Component
 * Main hub for template creation, editing, and distribution
 */
export function TemplatesTab({
  applicationId,
  userRole,
  userId,
}: TemplatesTabProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<TabValue>('create');
  const [synthesizedPrompt, setSynthesizedPrompt] = useState<string>('');
  const [crewAIData, setCrewAIData] = useState<CrewAITemplate | null>(null);

  // Handle successful synthesis
  const handleSynthesisComplete = useCallback((data: unknown): void => {
    if (data && typeof data === 'object') {
      const synthesisData = data as { synthesizedPrompt?: string; crewAITemplate?: CrewAITemplate };
      if (typeof synthesisData.synthesizedPrompt === 'string') {
        setSynthesizedPrompt(synthesisData.synthesizedPrompt);
      }
      if (synthesisData.crewAITemplate) {
        setCrewAIData(synthesisData.crewAITemplate);
      }
    }
  }, []);

  // Handle template finalization
  const handleTemplateFinalize = useCallback(() => {
    setActiveTab('library');
    setSynthesizedPrompt('');
    setCrewAIData(null);
  }, []);

  const canCreate = userRole === 'admin' || userRole === 'ba' || userRole === 'analyst';

  return (
    <div className="w-full h-full bg-background p-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create" disabled={!canCreate}>
            Create Template
          </TabsTrigger>
          <TabsTrigger value="library">Template Library</TabsTrigger>
        </TabsList>

        {/* Create Template Tab */}
        <TabsContent value="create" className="w-full mt-6">
          <Card className="p-12 bg-blue-50 border border-blue-200">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="bg-blue-100 p-3 rounded-full">
                <AlertCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Create Template</h3>
                <p className="text-sm text-blue-700 max-w-md">
                  Template creation workflow coming soon. This feature will combine knowledge base prompts with approved recommendations via LLM synthesis to generate optimized evaluation templates.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Template Library Tab */}
        <TabsContent value="library" className="w-full mt-6">
          <Card className="p-12 bg-purple-50 border border-purple-200">
            <div className="flex flex-col items-center justify-center text-center gap-4">
              <div className="bg-purple-100 p-3 rounded-full">
                <AlertCircle className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Template Library</h3>
                <p className="text-sm text-purple-700 max-w-md">
                  Template library and management interface coming soon. Browse, organize, and manage your saved templates with advanced search and filtering capabilities.
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
