'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Zap } from 'lucide-react';

interface DatabaseConnectorFormProps {
  onConfigChange: (config: any) => void;
  onTestResult: (result: any) => void;
}

export function DatabaseConnectorForm({ onConfigChange, onTestResult }: DatabaseConnectorFormProps) {
  const [dbType, setDbType] = useState('postgresql');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(dbType === 'postgresql' ? '5432' : dbType === 'mysql' ? '3306' : '1433');
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [sslEnabled, setSslEnabled] = useState(true);
  const [testing, setTesting] = useState(false);

  const handleConfigChange = () => {
    const config = {
      dbType,
      host,
      port: parseInt(port),
      database,
      username,
      password,
      sslEnabled,
    };
    onConfigChange(config);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      // Mock test - will be replaced with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      onTestResult({
        success: true,
        message: `Successfully connected to ${dbType} database at ${host}:${port}`,
      });
    } catch (error) {
      onTestResult({
        success: false,
        message: 'Failed to connect to database',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-2">Database Type</Label>
        <Select value={dbType} onValueChange={setDbType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="postgresql">PostgreSQL</SelectItem>
            <SelectItem value="mysql">MySQL</SelectItem>
            <SelectItem value="sqlserver">SQL Server</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Host</Label>
          <Input
            placeholder="localhost or IP address"
            value={host}
            onChange={(e) => setHost(e.target.value)}
            onBlur={handleConfigChange}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Port</Label>
          <Input
            placeholder="Port number"
            type="number"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            onBlur={handleConfigChange}
          />
        </div>
      </div>

      <div>
        <Label className="block text-sm font-medium text-gray-700 mb-1">Database Name</Label>
        <Input
          placeholder="Database name"
          value={database}
          onChange={(e) => setDatabase(e.target.value)}
          onBlur={handleConfigChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Username</Label>
          <Input
            placeholder="Database username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={handleConfigChange}
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">Password</Label>
          <Input
            type="password"
            placeholder="Database password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={handleConfigChange}
          />
        </div>
      </div>

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <Label className="text-sm font-medium text-gray-700">Enable SSL/TLS</Label>
          <p className="text-xs text-gray-600 mt-1">Recommended for production environments</p>
        </div>
        <Switch checked={sslEnabled} onCheckedChange={(checked) => {
          setSslEnabled(checked);
          handleConfigChange();
        }} />
      </div>

      <Button onClick={handleTestConnection} disabled={testing} className="w-full gap-2">
        <Zap className="w-4 h-4" />
        {testing ? 'Testing...' : 'Test Connection'}
      </Button>
    </div>
  );
}
