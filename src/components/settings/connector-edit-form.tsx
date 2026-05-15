'use client';

import { DataSourceType } from '@/src/types/dataSource';
import { DatabaseConnectorForm } from '@/src/components/apps/connectors/database-connector';
import { AzureBlobConnectorForm } from '@/src/components/apps/connectors/azure-blob-connector';
import { SplunkConnectorForm } from '@/src/components/apps/connectors/splunk-connector';
import { DatadogConnectorForm } from '@/src/components/apps/connectors/datadog-connector';

interface ConnectorEditFormProps {
  type: DataSourceType;
  onConfigChange: (config: any) => void;
}

export function ConnectorForm({ type, onConfigChange }: ConnectorEditFormProps) {
  // Reuse existing connector forms from apps module
  switch (type) {
    case 'database':
      return <DatabaseConnectorForm onConfigChange={onConfigChange} onTestResult={() => {}} />;
    case 'azure_blob':
      return <AzureBlobConnectorForm onConfigChange={onConfigChange} onTestResult={() => {}} />;
    case 'splunk':
      return <SplunkConnectorForm onConfigChange={onConfigChange} onTestResult={() => {}} />;
    case 'datadog':
      return <DatadogConnectorForm onConfigChange={onConfigChange} onTestResult={() => {}} />;
    case 'local_folder':
      return <div>Local Folder Connector - Coming Soon</div>;
    default:
      return <div>Unknown connector type</div>;
  }
}
