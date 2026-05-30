'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateTemplateWizard } from './create-template-wizard';
import { TemplateLibrary } from './template-library';

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
  const [refreshLibrary, setRefreshLibrary] = useState(0);

  const handleTemplateCreated = useCallback((): void => {
    setActiveTab('library');
    setRefreshLibrary((prev) => prev + 1);
  }, []);

  const canCreate = userRole === 'admin' || userRole === 'ba' || userRole === 'analyst';

  return (
    <div className="w-full bg-background p-6">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="create" disabled={!canCreate}>
            Create Template
          </TabsTrigger>
          <TabsTrigger value="library">Template Library</TabsTrigger>
        </TabsList>

        {/* Create Template Tab */}
        {canCreate ? (
          <TabsContent value="create" className="w-full mt-6">
            <CreateTemplateWizard
              applicationId={applicationId}
              userRole={userRole}
              onTemplateCreated={handleTemplateCreated}
            />
          </TabsContent>
        ) : (
          <TabsContent value="create" className="w-full mt-6">
            <div className="p-8 text-center bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800">You don&apos;t have permission to create templates. Contact your administrator.</p>
            </div>
          </TabsContent>
        )}

        {/* Template Library Tab */}
        <TabsContent value="library" className="w-full mt-6">
          <TemplateLibrary applicationId={applicationId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
