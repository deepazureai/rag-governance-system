import axios, { AxiosInstance, AxiosError } from 'axios';
import { MockApiHandler } from './mock-handler';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

class ApiClient {
  private client: AxiosInstance;
  private useMockApi: boolean;

  constructor() {
    this.useMockApi = USE_MOCK_API;
    
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor with fallback to mock API
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // If network error and mock API is enabled, fallback to mock
        if (this.useMockApi && (!error.response || error.code === 'ECONNREFUSED')) {
          console.log('[API] Backend unavailable, using mock API');
          return Promise.reject(error);
        }

        if (error.response?.status === 401) {
          // Handle unauthorized
          if (typeof window !== 'undefined') {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  setMockMode(enabled: boolean): void {
    this.useMockApi = enabled;
  }

  isMockMode(): boolean {
    return this.useMockApi;
  }

  async get<T>(url: string, config = {}) {
    try {
      const response = await this.client.get<T>(url, config);
      return response.data;
    } catch (error) {
      if (this.useMockApi) {
        return this.handleMockRequest('GET', url);
      }
      throw error;
    }
  }

  async post<T>(url: string, data?: any, config = {}) {
    try {
      const response = await this.client.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (this.useMockApi) {
        return this.handleMockRequest('POST', url, data);
      }
      throw error;
    }
  }

  async put<T>(url: string, data?: any, config = {}) {
    try {
      const response = await this.client.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (this.useMockApi) {
        return this.handleMockRequest('PUT', url, data);
      }
      throw error;
    }
  }

  async delete<T>(url: string, config = {}) {
    try {
      const response = await this.client.delete<T>(url, config);
      return response.data;
    } catch (error) {
      if (this.useMockApi) {
        return this.handleMockRequest('DELETE', url);
      }
      throw error;
    }
  }

  async patch<T>(url: string, data?: any, config = {}) {
    try {
      const response = await this.client.patch<T>(url, data, config);
      return response.data;
    } catch (error) {
      if (this.useMockApi) {
        return this.handleMockRequest('PATCH', url, data);
      }
      throw error;
    }
  }

  private async handleMockRequest(method: string, url: string, data?: any): Promise<any> {
    // Route to appropriate mock handler
    if (url.includes('/evaluations/frameworks')) {
      return MockApiHandler.getFrameworks();
    } else if (url.includes('/evaluations/query') && method === 'POST') {
      return MockApiHandler.evaluateQuery(data);
    } else if (url.includes('/evaluations/batch') && method === 'POST') {
      return MockApiHandler.evaluateBatch(data);
    } else if (url.includes('/evaluations/history')) {
      const appId = url.split('/').pop();
      return MockApiHandler.getEvaluationHistory(appId);
    } else if (url.includes('/evaluations/switch-framework') && method === 'POST') {
      return MockApiHandler.switchFramework(data.framework);
    } else if (url.includes('/evaluations/health')) {
      return MockApiHandler.healthCheck();
    }
    
    // Default mock response
    return { success: true, data: {} };
  }
}

export const apiClient = new ApiClient();

