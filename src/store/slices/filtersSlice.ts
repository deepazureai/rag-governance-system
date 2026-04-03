import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface FiltersState {
  appId: string | null;
  status: string | null;
  dateRange: {
    start: string | null;
    end: string | null;
  };
  searchQuery: string;
  severity: string | null;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const initialState: FiltersState = {
  appId: null,
  status: null,
  dateRange: {
    start: null,
    end: null,
  },
  searchQuery: '',
  severity: null,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setAppFilter: (state, action: PayloadAction<string | null>) => {
      state.appId = action.payload;
    },
    setStatusFilter: (state, action: PayloadAction<string | null>) => {
      state.status = action.payload;
    },
    setDateRange: (
      state,
      action: PayloadAction<{ start: string | null; end: string | null }>
    ) => {
      state.dateRange = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSeverityFilter: (state, action: PayloadAction<string | null>) => {
      state.severity = action.payload;
    },
    setSortBy: (
      state,
      action: PayloadAction<{ sortBy: string; sortOrder: 'asc' | 'desc' }>
    ) => {
      state.sortBy = action.payload.sortBy;
      state.sortOrder = action.payload.sortOrder;
    },
    resetFilters: () => initialState,
  },
});

export const {
  setAppFilter,
  setStatusFilter,
  setDateRange,
  setSearchQuery,
  setSeverityFilter,
  setSortBy,
  resetFilters,
} = filtersSlice.actions;

export default filtersSlice.reducer;
