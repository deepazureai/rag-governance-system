'use client';

import { useState } from 'react';
import { AppConnection } from '@/src/store/slices/connectionsSlice';
import { DataSourceType } from '@/src/types/dataSource';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ConnectorForm } from './connector-edit-form';

interface EditConnectionModalProps {
  connection: AppConnection;
  onSave: (connection: any) => void;
  onClose: () => void;
}

export function EditConnectionModal({ connection, onSave, onClose }: EditConnectionModalProps) {
  const [connectionName, setConnectionName] = useState(connection.connectionName);
  const [isEnabled, setIsEnabled] = useState(connection.isEnabled);
  const [dataSourceType, setDataSourceType] = useState<DataSourceType>(connection.dataSourceType);
  const [connectorConfig, setConnectorConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConnection = {
        ...connection,
        connectionName,
        isEnabled,
        dataSourceType,
        config: connectorConfig || {},
        updatedAt: new Date().toISOString(),
      };
      onSave(updatedConnection);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Connection</DialogTitle>
          <DialogDescription>
            Modify the connection parameters or change the data source type
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Name */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Connection Name</Label>
            <Input
              placeholder="e.g., Primary DB"
              value={connectionName}
              onChange={(e) => setConnectionName(e.target.value)}
            />
          </div>

          {/* Data Source Type */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Data Source Type</Label>
            <Select value={dataSourceType} onValueChange={(val) => setDataSourceType(val as DataSourceType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="database">Database (PostgreSQL, MySQL, SQL Server)</SelectItem>
                <SelectItem value="azure-logs">Azure Log Analytics</SelectItem>
                <SelectItem value="azure-blob">Azure Blob Storage</SelectItem>
                <SelectItem value="splunk">Splunk</SelectItem>
                <SelectItem value="datadog">Datadog</SelectItem>
              </SelectContent>
            </Select>
            {dataSourceType !== connection.dataSourceType && (
              <p className="text-sm text-amber-600 mt-2">
                Warning: Changing the data source type will require reconfiguring the connection parameters.
              </p>
            )}
          </div>

          {/* Connection Configuration Form */}
          <div className="border-t pt-6">
            <Label className="text-sm font-medium text-gray-700 mb-4 block">
              Connection Parameters
            </Label>
            <ConnectorForm
              type={dataSourceType}
              onConfigChange={setConnectorConfig}
            />
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-sm font-medium text-gray-700">Enable Connection</Label>
              <p className="text-xs text-gray-600 mt-1">Disable to temporarily stop metrics collection</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
