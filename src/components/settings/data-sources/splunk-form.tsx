import React from 'react';
import { SplunkConfig } from '@/src/types/dataSource';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SPLUNK_PORTS } from '@/src/constants/dataSources';

interface SplunkFormProps {
  config?: SplunkConfig;
  onSave: (config: any) => void;
  onTest: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string };
}

export function SplunkForm({ config, onSave, onTest, isTesting, testResult }: SplunkFormProps) {
  const [formData, setFormData] = React.useState(
    config?.config || {
      host: '',
      port: SPLUNK_PORTS.default,
      username: '',
      password: '',
      index: 'main',
      searchQuery: '',
      sslEnabled: true,
    }
  );

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  return (
    <div className="space-y-4">
      <Card className="p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Splunk Configuration</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
            <Input
              value={formData.host}
              onChange={(e) => handleChange('host', e.target.value)}
              placeholder="splunk.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <Input
              type="number"
              value={formData.port}
              onChange={(e) => handleChange('port', parseInt(e.target.value))}
              placeholder="8089"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <Input
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="admin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Index</label>
            <Input
              value={formData.index}
              onChange={(e) => handleChange('index', e.target.value)}
              placeholder="main"
            />
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.sslEnabled}
                onChange={(e) => handleChange('sslEnabled', e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <span className="text-sm font-medium text-gray-700">Enable SSL/TLS</span>
            </label>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Query (Optional)</label>
            <Textarea
              value={formData.searchQuery}
              onChange={(e) => handleChange('searchQuery', e.target.value)}
              placeholder="index=main sourcetype=rag_metrics | stats..."
              className="h-20 font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">SPL (Search Processing Language) query</p>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Configuration
          </Button>
          <Button
            onClick={onTest}
            disabled={isTesting}
            variant="outline"
            className="border-gray-300"
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>

        {testResult && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm font-medium ${
                testResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {testResult.message}
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
