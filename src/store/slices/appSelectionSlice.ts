import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AppSelectionState {
  selectedAppIds: string[];
}

const initialState: AppSelectionState = {
  selectedAppIds: [], // Empty means all apps
};

const appSelectionSlice = createSlice({
  name: 'appSelection',
  initialState,
  reducers: {
    selectApps: (state, action: PayloadAction<string[]>) => {
      state.selectedAppIds = action.payload;
    },
    toggleApp: (state, action: PayloadAction<string>) => {
      const index = state.selectedAppIds.indexOf(action.payload);
      if (index > -1) {
        state.selectedAppIds.splice(index, 1);
      } else {
        state.selectedAppIds.push(action.payload);
      }
    },
    selectAllApps: (state) => {
      state.selectedAppIds = [];
    },
  },
});

export const { selectApps, toggleApp, selectAllApps } = appSelectionSlice.actions;
export default appSelectionSlice.reducer;
