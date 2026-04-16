import axios from 'axios';
import { AppConnection } from '@/src/store/slices/connectionsSlice';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api';

export const connectionsClient = {
  async getConnectionsByApp(appId: string): Promise<AppConnection[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/connections/app/${appId}`);
      return response.data;
    } catch (error) {
      console.error('[v0] Failed to fetch connections:', error);
      throw error;
    }
  },

  async getConnection(connectionId: string): Promise<AppConnection> {
    try {
      const response = await axios.get(`${API_BASE_URL}/connections/${connectionId}`);
      return response.data;
    } catch (error) {
      console.error('[v0] Failed to fetch connection:', error);
      throw error;
    }
  },

  async createConnection(appId: string, connectionData: any): Promise<AppConnection> {
    try {
      const response = await axios.post(`${API_BASE_URL}/connections`, {
        appId,
        ...connectionData,
      });
      return response.data;
    } catch (error) {
      console.error('[v0] Failed to create connection:', error);
      throw error;
    }
  },

  async updateConnection(connectionId: string, connectionData: any): Promise<AppConnection> {
    try {
      const response = await axios.put(`${API_BASE_URL}/connections/${connectionId}`, connectionData);
      return response.data;
    } catch (error) {
      console.error('[v0] Failed to update connection:', error);
      throw error;
    }
  },

  async deleteConnection(connectionId: string): Promise<void> {
    try {
      await axios.delete(`${API_BASE_URL}/connections/${connectionId}`);
    } catch (error) {
      console.error('[v0] Failed to delete connection:', error);
      throw error;
    }
  },

  async testConnection(connectionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/connections/${connectionId}/test`);
      return response.data;
    } catch (error) {
      console.error('[v0] Failed to test connection:', error);
      throw error;
    }
  },

  async validateConnection(connectionData: any): Promise<{ valid: boolean; errors?: string[] }> {
    try {
      const response = await axios.post(`${API_BASE_URL}/connections/validate`, connectionData);
      return response.data;
    } catch (error) {
      console.error('[v0] Failed to validate connection:', error);
      throw error;
    }
  },
};
