import { configureStore } from '@reduxjs/toolkit';
import filtersReducer from './slices/filtersSlice';
import uiReducer from './slices/uiSlice';
import appReducer from './slices/appSlice';
import alertsReducer from './slices/alertsSlice';
import appSelectionReducer from './slices/appSelectionSlice';

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    ui: uiReducer,
    app: appReducer,
    alerts: alertsReducer,
    appSelection: appSelectionReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
