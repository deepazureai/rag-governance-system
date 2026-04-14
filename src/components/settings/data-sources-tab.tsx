import React, { useEffect } from 'react';
import { useDataSources } from '@/src/hooks/useDataSources';
import { mockApps } from '@/src/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Check, X } from 'lucide-react';
import { DATA_SOURCE_TYPES } from '@/src/constants/dataSources';
import { DatabaseForm } from './database-form';
import { AzureLogsForm } from './azure-logs-form';
import { AzureBlobForm } from './azure-blob-form';
import { SplunkForm } from './splunk-form';
import { DatadogForm } from './datadog-form';
import { DataSourceConfig, DataSourceType } from '@/src/types/dataSource';

export function DataSourcesTab() {
  const {
    configurations,
    selectedAppId,
    loading,
    error,
    testingConfigId,
    testResults,
    fetchConfigurations,
    saveConfiguration,
    removeConfiguration,
    testConnection,
    selectAppForConfiguration,
    getConfigurationsForApp,
  } = useDataSources();

  const [newConfigType, setNewConfigType] = React.useState<DataSourceType | null>(null);
  const [editingConfig, setEditingConfig] = React.useState<DataSourceConfig | null>(null);

  useEffect(() => {
    if (selectedAppId) {
      fetchConfigurations(selectedAppId);
    }
  }, [selectedAppId, fetchConfigurations]);

  const handleSaveConfig = async (configData: any) => {
    if (!selectedAppId) return;

    const config: any = editingConfig
      ? { ...editingConfig, config: configData }
      : {
          name: `${DATA_SOURCE_TYPES[newConfigType!].label} Configuration`,
          appId: selectedAppId,
          type: newConfigType,
          isEnabled: true,
          config: configData,
        };

    await saveConfiguration(config);
    setEditingConfig(null);
    setNewConfigType(null);
  };

  const handleTestConnection = (configId: string) => {
    testConnection(configId);
  };

  const handleDeleteConfig = async (configId: string) => {
    if (confirm('Are you sure you want to delete this configuration?')) {
      await removeConfiguration(configId);
    }
  };

  const appConfigs = selectedAppId ? getConfigurationsForApp(selectedAppId) : [];

  const renderFormComponent = (type: DataSourceType, config?: DataSourceConfig) => {
    const formProps = {
      config,
      onSave: handleSaveConfig,
      onTest: () => handleTestConnection(config?.id || ''),
      isTesting: testingConfigId === config?.id,
      testResult: config ? testResults[config.id] : undefined,
    };

    switch (type) {
      case 'database':
        return <DatabaseForm {...formProps} />;
      case 'azure-logs':
        return <AzureLogsForm {...formProps} />;
      case 'azure-blob':
        return <AzureBlobForm {...formProps} />;
      case 'splunk':
        return <SplunkForm {...formProps} />;
      case 'datadog':
        return <DatadogForm {...formProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* App Selector */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Application</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {mockApps.map((app) => (
            <button
              key={app.id}
              onClick={() => selectAppForConfiguration(app.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedAppId === app.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {app.name}
            </button>
          ))}
        </div>
      </div>

      {!selectedAppId ? (
        <Card className="p-8 bg-gray-50 text-center">
          <p className="text-gray-500">Select an application to configure data sources</p>
        </Card>
      ) : (
        <>
          {error && (
            <Card className="p-4 bg-red-50 border border-red-200">
              <p className="text-red-800 text-sm">{error}</p>
            </Card>
          )}

          {/* Existing Configurations */}
          {appConfigs.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Configurations</h3>
              <div className="space-y-3">
                {appConfigs.map((config) => (
                  <Card key={config.id} className="p-4 bg-white border border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-gray-900">{config.name}</h4>
                          <Badge variant={config.isEnabled ? 'default' : 'secondary'}>
                            {config.isEnabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                          <Badge variant="outline">{DATA_SOURCE_TYPES[config.type].label}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{DATA_SOURCE_TYPES[config.type].description}</p>

                        {testResults[config.id] && (
                          <div className="mt-2 flex items-center gap-2 text-sm">
                            {testResults[config.id].success ? (
                              <>
                                <Check className="w-4 h-4 text-green-600" />
                                <span className="text-green-700">{testResults[config.id].message}</span>
                              </>
                            ) : (
                              <>
                                <X className="w-4 h-4 text-red-600" />
                                <span className="text-red-700">{testResults[config.id].message}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => setEditingConfig(config)}
                          size="sm"
                          variant="outline"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleTestConnection(config.id)}
                          size="sm"
                          variant="outline"
                          disabled={testingConfigId === config.id}
                        >
                          {testingConfigId === config.id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteConfig(config.id)}
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Add New Configuration */}
          {!newConfigType && !editingConfig && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Data Source</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(Object.entries(DATA_SOURCE_TYPES) as Array<[DataSourceType, any]>).map(([type, info]) => (
                  <button
                    key={type}
                    onClick={() => setNewConfigType(type)}
                    className="p-4 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
                  >
                    <h4 className="font-semibold text-gray-900 mb-1">{info.label}</h4>
                    <p className="text-sm text-gray-600">{info.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Display */}
          {newConfigType && !editingConfig && renderFormComponent(newConfigType)}
          {editingConfig && renderFormComponent(editingConfig.type, editingConfig)}
        </>
      )}
    </div>
  );
}
