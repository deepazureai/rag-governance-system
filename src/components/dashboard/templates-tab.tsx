'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CrewAITemplate, DistributionTarget } from '@/types/templates';

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
  const handleSynthesisComplete = useCallback((data: any) => {
    setSynthesizedPrompt(data.synthesizedPrompt);
    setCrewAIData(data.crewAITemplate);
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
          <div className="space-y-6">
            <div className="text-sm text-muted-foreground">
              Template creation workflow coming soon - combining KB prompts with approved recommendations via LLM synthesis
            </div>
          </div>
        </TabsContent>

        {/* Template Library Tab */}
        <TabsContent value="library" className="w-full mt-6">
          <div className="text-sm text-muted-foreground">
            Template library and management interface coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
