/**
 * Safe environment variable access with type safety
 * Addresses TypeScript strict mode requirement that index signature properties
 * must be accessed with bracket notation
 */

export const getEnvVar = (key: keyof NodeJS.ProcessEnv, defaultValue?: string): string => {
  const value = process.env[key];
  return value ?? defaultValue ?? '';
};

export const API_URL = getEnvVar('NEXT_PUBLIC_API_URL', 'http://localhost:5001');
export const USE_MOCK_API = getEnvVar('NEXT_PUBLIC_USE_MOCK_API', 'false') === 'true';

/**
 * Build a full API URL ensuring /api path is appended
 */
export const buildApiUrl = (path: string = ''): string => {
  let url = API_URL;
  if (!url.endsWith('/api')) {
    url = url + '/api';
  }
  if (path) {
    url = url + (path.startsWith('/') ? path : `/${path}`);
  }
  return url;
};

