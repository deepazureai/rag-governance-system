import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DataSourceType } from '@/src/types/dataSource';

export interface AppConnection {
  id: string;
  appId: string;
  appName: string;
  dataSourceType: DataSourceType;
  connectionName: string;
  isEnabled: boolean;
  lastTested?: string;
  testStatus?: 'success' | 'failed' | 'pending';
  createdAt: string;
  updatedAt: string;
}

interface ConnectionsState {
  connections: AppConnection[];
  selectedAppId: string | null;
  selectedConnectionId: string | null;
  loading: boolean;
  error: string | null;
  testingConnectionId: string | null;
}

const initialState: ConnectionsState = {
  connections: [],
  selectedAppId: null,
  selectedConnectionId: null,
  loading: false,
  error: null,
  testingConnectionId: null,
};

const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    selectApp: (state, action: PayloadAction<string>) => {
      state.selectedAppId = action.payload;
      state.selectedConnectionId = null;
    },
    selectConnection: (state, action: PayloadAction<string>) => {
      state.selectedConnectionId = action.payload;
    },
    setConnections: (state, action: PayloadAction<AppConnection[]>) => {
      state.connections = action.payload;
    },
    addConnection: (state, action: PayloadAction<AppConnection>) => {
      state.connections.push(action.payload);
    },
    updateConnection: (state, action: PayloadAction<AppConnection>) => {
      const index = state.connections.findIndex((c) => c.id === action.payload.id);
      if (index !== -1) {
        state.connections[index] = action.payload;
      }
    },
    deleteConnection: (state, action: PayloadAction<string>) => {
      state.connections = state.connections.filter((c) => c.id !== action.payload);
      if (state.selectedConnectionId === action.payload) {
        state.selectedConnectionId = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setTestingConnection: (state, action: PayloadAction<string | null>) => {
      state.testingConnectionId = action.payload;
    },
    updateConnectionTestStatus: (
      state,
      action: PayloadAction<{ connectionId: string; status: 'success' | 'failed'; timestamp: string }>
    ) => {
      const connection = state.connections.find((c) => c.id === action.payload.connectionId);
      if (connection) {
        connection.testStatus = action.payload.status;
        connection.lastTested = action.payload.timestamp;
      }
    },
  },
});

export const {
  selectApp,
  selectConnection,
  setConnections,
  addConnection,
  updateConnection,
  deleteConnection,
  setLoading,
  setError,
  setTestingConnection,
  updateConnectionTestStatus,
} = connectionsSlice.actions;

export default connectionsSlice.reducer;
