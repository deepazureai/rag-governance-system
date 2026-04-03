import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  selectedAppId: string | null;
  activeTab: string;
  modal: {
    isOpen: boolean;
    type: string | null;
    data?: any;
  };
  notification: {
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  };
}

const initialState: UIState = {
  sidebarOpen: true,
  darkMode: false,
  selectedAppId: null,
  activeTab: 'overview',
  modal: {
    isOpen: false,
    type: null,
  },
  notification: {
    isOpen: false,
    message: '',
    type: 'info',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
    setSelectedAppId: (state, action: PayloadAction<string | null>) => {
      state.selectedAppId = action.payload;
    },
    setActiveTab: (state, action: PayloadAction<string>) => {
      state.activeTab = action.payload;
    },
    openModal: (
      state,
      action: PayloadAction<{ type: string; data?: any }>
    ) => {
      state.modal = {
        isOpen: true,
        type: action.payload.type,
        data: action.payload.data,
      };
    },
    closeModal: (state) => {
      state.modal = {
        isOpen: false,
        type: null,
      };
    },
    showNotification: (
      state,
      action: PayloadAction<{
        message: string;
        type: 'success' | 'error' | 'info' | 'warning';
      }>
    ) => {
      state.notification = {
        isOpen: true,
        message: action.payload.message,
        type: action.payload.type,
      };
    },
    closeNotification: (state) => {
      state.notification = {
        isOpen: false,
        message: '',
        type: 'info',
      };
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  toggleDarkMode,
  setDarkMode,
  setSelectedAppId,
  setActiveTab,
  openModal,
  closeModal,
  showNotification,
  closeNotification,
} = uiSlice.actions;

export default uiSlice.reducer;
