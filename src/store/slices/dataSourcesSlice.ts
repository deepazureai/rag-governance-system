import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataSourceConfig } from '@/src/types/dataSource';

interface DataSourcesState {
  configurations: DataSourceConfig[];
  selectedAppId: string | null;
  loading: boolean;
  error: string | null;
  testingConfigId: string | null;
  testResults: Record<string, { success: boolean; message: string }>;
}

const initialState: DataSourcesState = {
  configurations: [],
  selectedAppId: null,
  loading: false,
  error: null,
  testingConfigId: null,
  testResults: {},
};

const dataSourcesSlice = createSlice({
  name: 'dataSources',
  initialState,
  reducers: {
    setConfigurations: (state, action: PayloadAction<DataSourceConfig[]>) => {
      state.configurations = action.payload;
      state.error = null;
    },
    selectApp: (state, action: PayloadAction<string>) => {
      state.selectedAppId = action.payload;
      state.error = null;
    },
    addConfiguration: (state, action: PayloadAction<DataSourceConfig>) => {
      state.configurations.push(action.payload);
    },
    updateConfiguration: (state, action: PayloadAction<DataSourceConfig>) => {
      const index = state.configurations.findIndex((c) => c.id === action.payload.id);
      if (index >= 0) {
        state.configurations[index] = action.payload;
      }
    },
    deleteConfiguration: (state, action: PayloadAction<string>) => {
      state.configurations = state.configurations.filter((c) => c.id !== action.payload);
      delete state.testResults[action.payload];
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setTestingConfigId: (state, action: PayloadAction<string | null>) => {
      state.testingConfigId = action.payload;
    },
    setTestResult: (
      state,
      action: PayloadAction<{ configId: string; result: { success: boolean; message: string } }>
    ) => {
      state.testResults[action.payload.configId] = action.payload.result;
    },
    clearTestResults: (state) => {
      state.testResults = {};
    },
  },
});

export const {
  setConfigurations,
  selectApp,
  addConfiguration,
  updateConfiguration,
  deleteConfiguration,
  setLoading,
  setError,
  setTestingConfigId,
  setTestResult,
  clearTestResults,
} = dataSourcesSlice.actions;

export default dataSourcesSlice.reducer;
