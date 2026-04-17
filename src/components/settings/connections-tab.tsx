'use client';

import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/src/hooks/useRedux';
import {
  selectApp,
  selectConnection,
  setConnections,
  deleteConnection,
  setTestingConnection,
  updateConnectionTestStatus,
  updateConnection,
} from '@/src/store/slices/connectionsSlice';
import { mockApps } from '@/src/data/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, CheckCircle, XCircle, Clock, Edit2 } from 'lucide-react';
import { connectionsClient } from '@/src/api/connectionsClient';
import { EditConnectionModal } from './edit-connection-modal';

export function ConnectionsTab() {
  const dispatch = useAppDispatch();
  const { connections, selectedAppId, selectedConnectionId, testingConnectionId } = useAppSelector(
    (state) => state.connections
  );
  const [loading, setLoading] = useState(false);
  const [editingConnection, setEditingConnection] = useState<any>(null);

  const selectedApp = selectedAppId ? mockApps.find((app) => app.id === selectedAppId) : null;
  const appConnections = selectedAppId ? connections.filter((c) => c.appId === selectedAppId) : [];

  useEffect(() => {
    // Load mock connections
    const mockConnections = [
      {
        id: '1',
        appId: '1',
        appName: 'Customer Support RAG',
        dataSourceType: 'database' as const,
        connectionName: 'Primary DB',
        isEnabled: true,
        lastTested: '2024-04-15T10:30:00',
        testStatus: 'success' as const,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      },
      {
        id: '2',
        appId: '2',
        appName: 'Document Q&A',
        dataSourceType: 'azure-blob' as const,
        connectionName: 'Logs Storage',
        isEnabled: true,
        lastTested: '2024-04-14T15:45:00',
        testStatus: 'success' as const,
        createdAt: '2024-02-01',
        updatedAt: '2024-02-01',
      },
      {
        id: '3',
        appId: '3',
        appName: 'Legal Document Analyzer',
        dataSourceType: 'splunk' as const,
        connectionName: 'Splunk Cloud',
        isEnabled: false,
        lastTested: '2024-04-10T08:20:00',
        testStatus: 'failed' as const,
        createdAt: '2024-03-10',
        updatedAt: '2024-03-10',
      },
    ];
    dispatch(setConnections(mockConnections));
  }, [dispatch]);

  const handleTestConnection = async (connectionId: string) => {
    dispatch(setTestingConnection(connectionId));
    try {
      const result = await connectionsClient.testConnection(connectionId);
      dispatch(
        updateConnectionTestStatus({
          connectionId,
          status: result.success ? 'success' : 'failed',
          timestamp: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('[v0] Test connection error:', error);
      dispatch(
        updateConnectionTestStatus({
          connectionId,
          status: 'failed',
          timestamp: new Date().toISOString(),
        })
      );
    } finally {
      dispatch(setTestingConnection(null));
    }
  };

  const handleDeleteConnection = async (connectionId: string) => {
    if (!confirm('Are you sure you want to delete this connection?')) return;
    try {
      await connectionsClient.deleteConnection(connectionId);
      dispatch(deleteConnection(connectionId));
    } catch (error) {
      console.error('[v0] Delete connection error:', error);
      alert('Failed to delete connection');
    }
  };

  const handleEditConnection = (connection: any) => {
    setEditingConnection(connection);
  };

  const handleSaveConnection = async (updatedConnection: any) => {
    try {
      await connectionsClient.updateConnection(updatedConnection.id, updatedConnection);
      dispatch(updateConnection(updatedConnection));
      setEditingConnection(null);
      alert('Connection updated successfully');
    } catch (error) {
      console.error('[v0] Update connection error:', error);
      alert('Failed to update connection');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Application Connections</h2>
      <p className="text-gray-600">Manage data source connections for each application</p>

      {/* App List */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Application</h3>
        <div className="flex flex-wrap gap-2 overflow-x-auto pb-2">
          {mockApps.map((app) => (
            <button
              key={app.id}
              onClick={() => dispatch(selectApp(app.id))}
              className={`px-4 py-2 rounded-lg border-2 transition-all whitespace-nowrap ${
                selectedAppId === app.id
                  ? 'border-blue-600 bg-blue-50 text-blue-900'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              {app.name}
            </button>
          ))}
        </div>
      </div>

      {/* Connections List */}
      {selectedApp && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Connections for {selectedApp.name}
          </h3>

          {appConnections.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">No connections configured for this application</p>
              <Button className="mt-4 gap-2" variant="outline">
                Add Connection
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {appConnections.map((connection) => (
                <Card key={connection.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">{connection.connectionName}</h4>
                        <Badge variant={connection.isEnabled ? 'default' : 'secondary'}>
                          {connection.isEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Type: {connection.dataSourceType.replace('-', ' ').toUpperCase()}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        {connection.testStatus === 'success' && (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        {connection.testStatus === 'failed' && (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                        {connection.testStatus === 'pending' && (
                          <Clock className="w-4 h-4 text-gray-600" />
                        )}
                        {connection.lastTested && (
                          <span className="text-gray-600">
                            Last tested: {new Date(connection.lastTested).toLocaleString('en-US')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditConnection(connection)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(connection.id)}
                        disabled={testingConnectionId === connection.id}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteConnection(connection.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {!selectedApp && (
        <Card className="p-8 text-center text-gray-500">
          Select an application to view its connections
        </Card>
      )}

      {/* Edit Connection Modal */}
      {editingConnection && (
        <EditConnectionModal
          connection={editingConnection}
          onSave={handleSaveConnection}
          onClose={() => setEditingConnection(null)}
        />
      )}
    </div>
  );
}
