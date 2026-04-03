import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { App } from '@/types';

export interface AppState {
  currentApp: App | null;
  apps: App[];
  loading: boolean;
  error: string | null;
}

const initialState: AppState = {
  currentApp: null,
  apps: [],
  loading: false,
  error: null,
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setCurrentApp: (state, action: PayloadAction<App | null>) => {
      state.currentApp = action.payload;
    },
    setApps: (state, action: PayloadAction<App[]>) => {
      state.apps = action.payload;
    },
    addApp: (state, action: PayloadAction<App>) => {
      state.apps.push(action.payload);
    },
    updateApp: (state, action: PayloadAction<App>) => {
      const index = state.apps.findIndex((app) => app.id === action.payload.id);
      if (index !== -1) {
        state.apps[index] = action.payload;
      }
      if (state.currentApp?.id === action.payload.id) {
        state.currentApp = action.payload;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    removeApp: (state, action: PayloadAction<string>) => {
      state.apps = state.apps.filter((app) => app.id !== action.payload);
    },
  },
});

export const {
  setCurrentApp,
  setApps,
  addApp,
  updateApp,
  setLoading,
  setError,
  removeApp,
} = appSlice.actions;

export default appSlice.reducer;
