'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle, Database, Table2 } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

interface DatabaseConfigProps {
  onConfigure: (config: DatabaseConfigWithMapping) => void;
  isLoading?: boolean;
  onValidationChange?: (isValid: boolean) => void;
}

export interface DatabaseConfigWithMapping {
  type: 'sql_server' | 'postgresql' | 'mysql';
  host: string;
  port: number;
  database: string;
  table: string;
  username: string;
  password: string;
  columnMapping: {
    promptColumn: string;
    contextColumn: string;
    responseColumn: string;
    userIdColumn: string;
    timestampColumn?: string;
  };
}

type Step = 'connection' | 'schema' | 'mapping' | 'complete';

interface TableColumn {
  name: string;
  type: string;
}

export function DatabaseConfig({ onConfigure, isLoading, onValidationChange }: DatabaseConfigProps) {
  const [step, setStep] = useState<Step>('connection');
  const [type, setType] = useState<'sql_server' | 'postgresql' | 'mysql'>('postgresql');
  const [host, setHost] = useState('');
  const [port, setPort] = useState<number>(5432);
  const [database, setDatabase] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [table, setTable] = useState('');
  
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(false);
  
  const [columnMapping, setColumnMapping] = useState({
    promptColumn: '',
    contextColumn: '',
    responseColumn: '',
    userIdColumn: '',
    timestampColumn: '',
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const defaultPorts = {
    sql_server: 1433,
    postgresql: 5432,
    mysql: 3306,
  };

  const handleConnectDatabase = async () => {
    setError('');
    
    if (!host || !database || !username || !password || !table) {
      setError('All connection fields are required');
      return;
    }

    setIsConnecting(true);
    try {
      console.log('[v0] Connecting to database:', { type, host, port, database, table });
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/database/test-connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          host,
          port,
          database,
          username,
          password,
          table,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Database connection failed');
      }

      const result = await response.json();
      console.log('[v0] Database connected, fetching schema...');
      
      setSuccess('Database connected successfully');
      await loadSchemaAndTables();
      setStep('schema');
    } catch (err: any) {
      console.error('[v0] Connection error:', err);
      setError(err.message || 'Failed to connect to database');
      onValidationChange?.(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const loadSchemaAndTables = async () => {
    setIsLoadingSchema(true);
    try {
      console.log('[v0] Loading schema and tables...');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/database/schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          host,
          port,
          database,
          username,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load schema');
      }

      const result = await response.json();
      setAvailableTables(result.tables || []);
    } catch (err: any) {
      console.error('[v0] Schema load error:', err);
      setError('Failed to load database schema');
      onValidationChange?.(false);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleSelectTable = async () => {
    if (!table) {
      setError('Please select a table');
      return;
    }

    setIsLoadingSchema(true);
    try {
      console.log('[v0] Loading table columns for:', table);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001'}/api/database/columns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          host,
          port,
          database,
          username,
          password,
          table,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load table columns');
      }

      const result = await response.json();
      setTableColumns(result.columns || []);
      setSuccess(`Loaded ${result.columns?.length || 0} columns from table`);
      setStep('mapping');
    } catch (err: any) {
      console.error('[v0] Column load error:', err);
      setError('Failed to load table columns');
      onValidationChange?.(false);
    } finally {
      setIsLoadingSchema(false);
    }
  };

  const handleSaveMapping = async () => {
    setError('');
    
    if (!columnMapping.promptColumn || !columnMapping.responseColumn || !columnMapping.userIdColumn) {
      setError('Prompt, Response, and User ID columns are required');
      return;
    }

    setIsConnecting(true);
    setError('');

    try {
      console.log('[v0] Preparing database configuration for application creation...');

      // Prepare the complete database configuration to pass back to the wizard
      const config: DatabaseConfigWithMapping = {
        type,
        host,
        port,
        database,
        table,
        username,
        password,
        columnMapping: {
          promptColumn: columnMapping.promptColumn,
          contextColumn: columnMapping.contextColumn,
          responseColumn: columnMapping.responseColumn,
          userIdColumn: columnMapping.userIdColumn,
          timestampColumn: columnMapping.timestampColumn,
        },
      };

      console.log('[v0] Database config prepared:', config);
      setSuccess('Database configuration ready! Click "Save Application" to create the application.');
      
      // Call the parent callback to pass config back to wizard
      // The wizard will send this to the backend when creating the application
      onConfigure(config);
      
      // Update validation state
      onValidationChange?.(true);
      
      setStep('complete');
    } catch (err: any) {
      console.error('[v0] Error preparing configuration:', err);
      setError(err.message || 'Failed to prepare database configuration');
      onValidationChange?.(false);
    } finally {
      setIsConnecting(false);
    }
  };
        columnMapping,
      };

      onConfigure(config);
      onValidationChange?.(true);
      setStep('complete');
    } catch (err: any) {
      console.error('[v0] Error saving connection:', err);
      setError(err.message || 'Failed to save connection and schema mapping');
      onValidationChange?.(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const ColumnSelect = ({ label, value, onChange, required }: any) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-600">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
      >
        <option value="">Select a column...</option>
        {tableColumns.map((col) => (
          <option key={col.name} value={col.name}>
            {col.name} ({col.type})
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold text-gray-900 mb-2">Database Configuration</h3>
        <p className="text-sm text-gray-600 mb-4">
          {step === 'connection' && 'Connect to your database to fetch raw metrics data.'}
          {step === 'schema' && 'Select the table containing your evaluation data.'}
          {step === 'mapping' && 'Map database columns to evaluation fields (prompt, response, context, user_id).'}
          {step === 'complete' && 'Database configuration complete!'}
        </p>
      </div>

      {/* Step 1: Connection */}
      {step === 'connection' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Database Type</label>
            <select
              value={type}
              onChange={(e) => {
                const newType = e.target.value as 'sql_server' | 'postgresql' | 'mysql';
                setType(newType);
                setPort(defaultPorts[newType]);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sql_server">SQL Server</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
              <Input
                placeholder="localhost or db.example.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
              <Input
                type="number"
                placeholder={String(defaultPorts[type])}
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Database</label>
              <Input
                placeholder="my_database"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
              <Input
                placeholder="metrics_table"
                value={table}
                onChange={(e) => setTable(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <Input
                placeholder="db_user"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Schema Selection */}
      {step === 'schema' && (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 p-3 rounded flex gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-700">Connected to {database} on {host}</p>
          </div>
          <p className="text-sm text-gray-600">Select the table containing your evaluation data:</p>
          <div>
            <select
              value={table}
              onChange={(e) => setTable(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">Choose a table...</option>
              {availableTables.map((tbl) => (
                <option key={tbl} value={tbl}>
                  {tbl}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 3: Column Mapping */}
      {step === 'mapping' && (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
            <p className="text-sm text-blue-700 font-medium">Table: {table}</p>
            <p className="text-xs text-blue-600 mt-1">Map your database columns to evaluation metrics</p>
          </div>
          
          <ColumnSelect
            label="Prompt/Query Column"
            value={columnMapping.promptColumn}
            onChange={(val: string) => setColumnMapping({ ...columnMapping, promptColumn: val })}
            required
          />
          
          <ColumnSelect
            label="Response Column"
            value={columnMapping.responseColumn}
            onChange={(val: string) => setColumnMapping({ ...columnMapping, responseColumn: val })}
            required
          />
          
          <ColumnSelect
            label="Context Column (Optional)"
            value={columnMapping.contextColumn}
            onChange={(val: string) => setColumnMapping({ ...columnMapping, contextColumn: val })}
          />
          
          <ColumnSelect
            label="User ID Column"
            value={columnMapping.userIdColumn}
            onChange={(val: string) => setColumnMapping({ ...columnMapping, userIdColumn: val })}
            required
          />
          
          <ColumnSelect
            label="Timestamp Column (Optional)"
            value={columnMapping.timestampColumn}
            onChange={(val: string) => setColumnMapping({ ...columnMapping, timestampColumn: val })}
          />
        </div>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <div className="bg-green-50 border border-green-200 p-4 rounded space-y-2">
          <div className="flex gap-2">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm font-medium text-green-900">Database configuration completed!</p>
          </div>
          <p className="text-xs text-green-800 ml-7">Your data will be ingested and evaluated after application creation.</p>
        </div>
      )}

      {error && (
        <div className="flex gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && step !== 'complete' && (
        <div className="flex gap-2 p-3 bg-green-50 border border-green-200 rounded">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-4">
        {step !== 'connection' && step !== 'complete' && (
          <Button
            onClick={() => {
              setError('');
              setSuccess('');
              setStep(step === 'schema' ? 'connection' : 'schema');
            }}
            variant="outline"
          >
            Back
          </Button>
        )}
        
        {step === 'connection' && (
          <Button
            onClick={handleConnectDatabase}
            disabled={isConnecting || !host || !database || !username || !password}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Connecting...
              </>
            ) : (
              <>
                <Database className="w-4 h-4 mr-2" />
                Connect to Database
              </>
            )}
          </Button>
        )}

        {step === 'schema' && (
          <Button
            onClick={handleSelectTable}
            disabled={isLoadingSchema || !table}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isLoadingSchema ? (
              <>
                <Spinner className="w-4 h-4 mr-2" />
                Loading Columns...
              </>
            ) : (
              <>
                <Table2 className="w-4 h-4 mr-2" />
                View Columns
              </>
            )}
          </Button>
        )}

        {step === 'mapping' && (
          <Button
            onClick={handleSaveMapping}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Save Configuration
          </Button>
        )}
      </div>
    </Card>
  );
}
