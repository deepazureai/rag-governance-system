import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';

interface DatabaseConfigProps {
  onConfigure: (config: DatabaseConfig) => void;
  isLoading?: boolean;
}

export interface DatabaseConfig {
  type: 'sql_server' | 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  table: string;
  username: string;
  password: string;
  query?: string;
}

export function DatabaseConfig({ onConfigure, isLoading }: DatabaseConfigProps) {
  const [type, setType] = useState<'sql_server' | 'postgresql' | 'mysql'>('postgresql');
  const [host, setHost] = useState('');
  const [port, setPort] = useState<number>(type === 'sql_server' ? 1433 : type === 'postgresql' ? 5432 : 3306);
  const [database, setDatabase] = useState('');
  const [table, setTable] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (!host.trim()) {
      setError('Host is required');
      return;
    }

    if (!database.trim()) {
      setError('Database name is required');
      return;
    }

    if (!table.trim()) {
      setError('Table name is required');
      return;
    }

    if (!username.trim()) {
      setError('Username is required');
      return;
    }

    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    onConfigure({
      type,
      host,
      port,
      database,
      table,
      username,
      password,
      query: query || undefined,
    });
  };

  const defaultPorts = {
    sql_server: 1433,
    postgresql: 5432,
    mysql: 3306,
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">Database Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect to your database and specify the table containing raw metrics data.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Database Type
          </label>
          <select
            value={type}
            onChange={(e) => {
              const newType = e.target.value as 'sql_server' | 'postgresql' | 'mysql';
              setType(newType);
              setPort(defaultPorts[newType]);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            disabled={isLoading}
          >
            <option value="postgresql">PostgreSQL</option>
            <option value="mysql">MySQL</option>
            <option value="sql_server">SQL Server</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Host
            </label>
            <Input
              placeholder="localhost"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Port
            </label>
            <Input
              type="number"
              placeholder={String(defaultPorts[type])}
              value={port}
              onChange={(e) => setPort(parseInt(e.target.value))}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Database
            </label>
            <Input
              placeholder="my_database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Table
            </label>
            <Input
              placeholder="ai_metrics"
              value={table}
              onChange={(e) => setTable(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <Input
              placeholder="db_user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Query (Optional)
          </label>
          <textarea
            placeholder="SELECT * FROM ai_metrics WHERE created_at > NOW() - INTERVAL 7 day"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
          />
          <p className="text-xs text-gray-500 mt-1">
            If not specified, all records from the table will be fetched
          </p>
        </div>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <Button
        onClick={handleSubmit}
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? 'Connecting...' : 'Connect & Process Data'}
      </Button>
    </Card>
  );
}
