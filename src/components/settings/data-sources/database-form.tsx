import React from 'react';
import { DatabaseConfig } from '@/src/types/dataSource';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DB_PORTS } from '@/src/constants/dataSources';

interface DatabaseFormProps {
  config?: DatabaseConfig;
  onSave: (config: any) => void;
  onTest: () => void;
  isTesting?: boolean;
  testResult?: { success: boolean; message: string };
}

export function DatabaseForm({ config, onSave, onTest, isTesting, testResult }: DatabaseFormProps) {
  const [formData, setFormData] = React.useState(
    config?.config || {
      host: '',
      port: DB_PORTS.postgres,
      database: '',
      username: '',
      password: '',
      sslEnabled: true,
      connectionTimeout: 30,
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Database Configuration</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
            <Input
              value={formData.host}
              onChange={(e) => handleChange('host', e.target.value)}
              placeholder="localhost or database.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
            <Input
              type="number"
              value={formData.port}
              onChange={(e) => handleChange('port', parseInt(e.target.value))}
              placeholder="5432"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
            <Input
              value={formData.database}
              onChange={(e) => handleChange('database', e.target.value)}
              placeholder="database_name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <Input
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              placeholder="db_user"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Connection Timeout (seconds)</label>
            <Input
              type="number"
              value={formData.connectionTimeout}
              onChange={(e) => handleChange('connectionTimeout', parseInt(e.target.value))}
              placeholder="30"
            />
          </div>

          <div className="col-span-2">
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
