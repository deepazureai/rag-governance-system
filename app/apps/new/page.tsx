'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/src/components/layout/dashboard-layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { DataSourceType } from '@/src/types/dataSource';
import { ConnectorForm } from '@/src/components/apps/connector-form';
import { DataSourceSelector } from '@/src/components/apps/data-source-selector';
import { LocalFolderConfig } from '@/src/components/apps/local-folder-config';
import { DatabaseConfig } from '@/src/components/apps/database-config';
import { AzureBlobConfig } from '@/src/components/apps/azure-blob-config';
import { ProcessingPreview } from '@/src/components/apps/processing-preview';

type WizardStep = 'app-info' | 'data-source' | 'connector-config' | 'review';

export default function NewApplicationPage() {
  const [step, setStep] = useState<WizardStep>('app-info');
  const [appData, setAppData] = useState({
    name: '',
    description: '',
    ragFramework: '',
    owner: '',
  });
  const [selectedDataSource, setSelectedDataSource] = useState<string | null>(null);
  const [connectorConfig, setConnectorConfig] = useState<any>(null);
  const [dataSourceConfig, setDataSourceConfig] = useState<any>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [processingPreview, setProcessingPreview] = useState<any>(null);

  const handleNext = () => {
    if (step === 'app-info') {
      if (!appData.name || !appData.description) {
        alert('Please fill in all required fields');
        return;
      }
      setStep('data-source');
    } else if (step === 'data-source') {
      if (!selectedDataSource) {
        alert('Please select a data source type (Local Folder, Database, or Azure Blob)');
        return;
      }
      setStep('connector-config');
    } else if (step === 'connector-config') {
      if (!connectorConfig && !dataSourceConfig) {
        alert('Please configure the connector');
        return;
      }
      setStep('review');
    }
  };

  const handleBack = () => {
    if (step === 'data-source') setStep('app-info');
    else if (step === 'connector-config') setStep('data-source');
    else if (step === 'review') setStep('connector-config');
  };

  const handleCreate = async () => {
    try {
      const applicationPayload = {
        name: appData.name,
        description: appData.description,
        framework: appData.ragFramework,
        owner: appData.owner,
        dataSource: {
          type: selectedDataSource,
          config: dataSourceConfig || connectorConfig,
        },
      };
      
      console.log('[v0] Creating application with data:', applicationPayload);
      
      // API call to create application and trigger ingestion
      const response = await fetch('/api/applications/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(applicationPayload),
      });
      
      if (!response.ok) throw new Error('Failed to create application');
      
      const result = await response.json();
      console.log('[v0] Application created successfully:', result);
      
      alert('Application created successfully! Data ingestion has been initiated.');
      window.location.href = '/apps';
    } catch (error) {
      console.error('[v0] Error creating application:', error);
      alert('Failed to create application. Please try again.');
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/apps">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create New Application</h1>
            <p className="text-gray-600">Set up a new RAG application with data source connection</p>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-between items-center">
          {(['app-info', 'data-source', 'connector-config', 'review'] as WizardStep[]).map((s, idx) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step === s
                    ? 'bg-blue-600 text-white'
                    : ['app-info', 'data-source', 'connector-config', 'review'].indexOf(step) > idx
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {['app-info', 'data-source', 'connector-config', 'review'].indexOf(step) > idx ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < 3 && <div className="flex-1 h-1 mx-2 bg-gray-200" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="p-8">
          {step === 'app-info' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Application Information</h2>
              <div className="space-y-4">
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Application Name</Label>
                  <Input
                    placeholder="e.g., Customer Support RAG"
                    value={appData.name}
                    onChange={(e) => setAppData({ ...appData, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Description</Label>
                  <Textarea
                    placeholder="Describe the purpose and functionality of this application"
                    value={appData.description}
                    onChange={(e) => setAppData({ ...appData, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">RAG Framework</Label>
                  <Select value={appData.ragFramework} onValueChange={(val) => setAppData({ ...appData, ragFramework: val })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select framework" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="langchain">LangChain</SelectItem>
                      <SelectItem value="llamaindex">LlamaIndex</SelectItem>
                      <SelectItem value="semantic-router">Semantic Router</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="block text-sm font-medium text-gray-700 mb-1">Owner</Label>
                  <Input
                    placeholder="e.g., Support Team"
                    value={appData.owner}
                    onChange={(e) => setAppData({ ...appData, owner: e.target.value })}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 'data-source' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Select Data Source Type</h2>
              <p className="text-gray-600">Choose where your RAG application will fetch raw metrics data from.</p>
              <DataSourceSelector
                selected={selectedDataSource}
                onSelect={setSelectedDataSource}
              />
              {selectedDataSource === 'local_folder' && (
                <LocalFolderConfig
                  onChange={setDataSourceConfig}
                />
              )}
              {selectedDataSource === 'database' && (
                <DatabaseConfig
                  onChange={setDataSourceConfig}
                />
              )}
              {selectedDataSource === 'azure_blob' && (
                <AzureBlobConfig
                  onChange={setDataSourceConfig}
                />
              )}
            </div>
          )}

          {step === 'connector-config' && selectedDataSource && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Configure Connection</h2>
              <ConnectorForm
                type={selectedDataSource as DataSourceType}
                onConfigChange={setConnectorConfig}
                onTestResult={setTestResult}
              />
              {testResult && (
                <div
                  className={`p-4 rounded-lg border flex gap-3 ${
                    testResult.success
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={testResult.success ? 'text-green-900 font-semibold' : 'text-red-900 font-semibold'}>
                      {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                    </p>
                    <p className={testResult.success ? 'text-green-800 text-sm' : 'text-red-800 text-sm'}>
                      {testResult.message}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'review' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Review & Create</h2>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Application Name</p>
                  <p className="font-semibold text-gray-900">{appData.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Description</p>
                  <p className="font-semibold text-gray-900">{appData.description}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data Source Type</p>
                  <p className="font-semibold text-gray-900">
                    {selectedDataSource === 'local_folder' && 'Local Folder'}
                    {selectedDataSource === 'database' && 'SQL Database'}
                    {selectedDataSource === 'azure_blob' && 'Azure Blob Storage'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

  {/* Action Buttons */}
  <div className="flex justify-between">
    <Button
      variant="outline"
      onClick={handleBack}
      disabled={step === 'app-info'}
      className="gap-2"
    >
      <ArrowLeft className="w-4 h-4" />
      Previous
    </Button>
          {step !== 'review' && (
            <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white">
              Next
            </Button>
          )}
          {step === 'review' && (
            <Button onClick={handleCreate} className="bg-green-600 hover:bg-green-700 text-white">
              Create Application
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
