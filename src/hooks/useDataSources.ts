import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import {
  setConfigurations,
  selectApp,
  addConfiguration,
  updateConfiguration,
  deleteConfiguration,
  setLoading,
  setError,
  setTestingConfigId,
  setTestResult,
} from '@/src/store/slices/dataSourcesSlice';
import { dataSourcesClient } from '@/src/api/dataSourcesClient';
import { DataSourceConfig } from '@/src/types/dataSource';

export const useDataSources = () => {
  const dispatch = useAppDispatch();
  const { configurations, selectedAppId, loading, error, testingConfigId, testResults } = useAppSelector(
    (state) => state.dataSources
  );

  const fetchConfigurations = useCallback(
    async (appId: string) => {
      dispatch(setLoading(true));
      try {
        const result = await dataSourcesClient.getConfigurations(appId);
        if (result.success && result.data) {
          dispatch(setConfigurations(result.data));
          dispatch(setError(null));
        } else {
          dispatch(setError(result.error || 'Failed to fetch configurations'));
        }
      } catch (err) {
        dispatch(setError(String(err)));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const saveConfiguration = useCallback(
    async (config: Omit<DataSourceConfig, 'id' | 'createdAt' | 'updatedAt'> | DataSourceConfig) => {
      dispatch(setLoading(true));
      try {
        const isNewConfig = !('id' in config);
        const result = isNewConfig
          ? await dataSourcesClient.createConfiguration(config.appId, config as Omit<DataSourceConfig, 'id'>)
          : await dataSourcesClient.updateConfiguration(config as DataSourceConfig);

        if (result.success && result.data) {
          if (isNewConfig) {
            dispatch(addConfiguration(result.data));
          } else {
            dispatch(updateConfiguration(result.data));
          }
          dispatch(setError(null));
          return result.data;
        } else {
          dispatch(setError(result.error || 'Failed to save configuration'));
          return null;
        }
      } catch (err) {
        dispatch(setError(String(err)));
        return null;
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const removeConfiguration = useCallback(
    async (configId: string) => {
      dispatch(setLoading(true));
      try {
        const result = await dataSourcesClient.deleteConfiguration(configId);
        if (result.success) {
          dispatch(deleteConfiguration(configId));
          dispatch(setError(null));
        } else {
          dispatch(setError(result.error || 'Failed to delete configuration'));
        }
      } catch (err) {
        dispatch(setError(String(err)));
      } finally {
        dispatch(setLoading(false));
      }
    },
    [dispatch]
  );

  const testConnection = useCallback(
    async (configId: string) => {
      dispatch(setTestingConfigId(configId));
      try {
        const result = await dataSourcesClient.testConnection(configId);
        dispatch(setTestResult({ configId, result }));
      } catch (err) {
        dispatch(setTestResult({ configId, result: { success: false, message: String(err) } }));
      } finally {
        dispatch(setTestingConfigId(null));
      }
    },
    [dispatch]
  );

  const selectAppForConfiguration = useCallback(
    (appId: string) => {
      dispatch(selectApp(appId));
    },
    [dispatch]
  );

  const getConfigurationsForApp = useCallback(
    (appId: string) => {
      return configurations.filter((c) => c.appId === appId);
    },
    [configurations]
  );

  return {
    configurations,
    selectedAppId,
    loading,
    error,
    testingConfigId,
    testResults,
    fetchConfigurations,
    saveConfiguration,
    removeConfiguration,
    testConnection,
    selectAppForConfiguration,
    getConfigurationsForApp,
  };
};
