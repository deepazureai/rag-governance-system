import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Alert } from '@/src/types';

export interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  filter: 'all' | 'unresolved' | 'critical' | 'warning';
}

const initialState: AlertsState = {
  alerts: [],
  loading: false,
  error: null,
  filter: 'all',
};

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setAlerts: (state, action: PayloadAction<Alert[]>) => {
      state.alerts = action.payload;
    },
    addAlert: (state, action: PayloadAction<Alert>) => {
      state.alerts.unshift(action.payload);
    },
    resolveAlert: (state, action: PayloadAction<string>) => {
      const alert = state.alerts.find((a) => a.id === action.payload);
      if (alert) {
        alert.resolved = true;
      }
    },
    removeAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter((a) => a.id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setFilter: (
      state,
      action: PayloadAction<'all' | 'unresolved' | 'critical' | 'warning'>
    ) => {
      state.filter = action.payload;
    },
  },
});

export const {
  setAlerts,
  addAlert,
  resolveAlert,
  removeAlert,
  setLoading,
  setError,
  setFilter,
} = alertsSlice.actions;

export default alertsSlice.reducer;
