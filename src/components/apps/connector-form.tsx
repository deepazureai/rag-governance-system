'use client';

import { DataSourceType } from '@/src/types/dataSource';
import { DatabaseConnectorForm } from './connectors/database-connector';
import { AzureBlobConnectorForm } from './connectors/azure-blob-connector';
import { SplunkConnectorForm } from './connectors/splunk-connector';
import { DatadogConnectorForm } from './connectors/datadog-connector';

interface ConnectorFormProps {
  type: DataSourceType;
  onConfigChange: (config: any) => void;
  onTestResult: (result: any) => void;
}

export function ConnectorForm({ type, onConfigChange, onTestResult }: ConnectorFormProps) {
  switch (type) {
    case 'database':
      return <DatabaseConnectorForm onConfigChange={onConfigChange} onTestResult={onTestResult} />;
    case 'azure_blob':
      return <AzureBlobConnectorForm onConfigChange={onConfigChange} onTestResult={onTestResult} />;
    case 'splunk':
      return <SplunkConnectorForm onConfigChange={onConfigChange} onTestResult={onTestResult} />;
    case 'datadog':
      return <DatadogConnectorForm onConfigChange={onConfigChange} onTestResult={onTestResult} />;
    case 'local_folder':
      return <div>Local Folder Connector - Coming Soon</div>;
    default:
      return <div>Unknown connector type</div>;
  }
}
