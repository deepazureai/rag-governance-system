import { DataSourceConfig, DataSourceTestResult, DataSourceResponse } from '@/src/types/dataSource';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

export const dataSourcesClient = {
  // Get all configurations for an app
  getConfigurations: async (appId: string): Promise<DataSourceResponse<DataSourceConfig[]>> => {
    try {
      const response = await fetch(`${API_BASE}/data-sources?appId=${appId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch configurations');
      return response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  // Get single configuration
  getConfiguration: async (configId: string): Promise<DataSourceResponse<DataSourceConfig>> => {
    try {
      const response = await fetch(`${API_BASE}/data-sources/${configId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to fetch configuration');
      return response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  // Create new configuration
  createConfiguration: async (
    appId: string,
    config: Omit<DataSourceConfig, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<DataSourceResponse<DataSourceConfig>> => {
    try {
      const response = await fetch(`${API_BASE}/data-sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, ...config }),
      });
      if (!response.ok) throw new Error('Failed to create configuration');
      return response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  // Update configuration
  updateConfiguration: async (config: DataSourceConfig): Promise<DataSourceResponse<DataSourceConfig>> => {
    try {
      const response = await fetch(`${API_BASE}/data-sources/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error('Failed to update configuration');
      return response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  // Delete configuration
  deleteConfiguration: async (configId: string): Promise<DataSourceResponse<null>> => {
    try {
      const response = await fetch(`${API_BASE}/data-sources/${configId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to delete configuration');
      return response.json();
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },

  // Test connection
  testConnection: async (configId: string): Promise<DataSourceTestResult> => {
    try {
      const response = await fetch(`${API_BASE}/data-sources/${configId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Connection test failed');
      return response.json();
    } catch (error) {
      return { success: false, message: 'Connection failed', error: String(error) };
    }
  },
};
