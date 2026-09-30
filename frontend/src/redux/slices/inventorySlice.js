import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";

// GET /api/inventory
export const fetchInventory = createAsyncThunk(
  "inventory/fetchInventory",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/inventory", {
        params,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch inventory"
      );
    }
  }
);

// GET /api/inventory/:id
export const fetchInventoryById = createAsyncThunk(
  "inventory/fetchInventoryById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/inventory/${id}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch inventory details"
      );
    }
  }
);

// GET /api/inventory/low-stock
export const fetchLowStockInventory = createAsyncThunk(
  "inventory/fetchLowStockInventory",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/inventory/low-stock");
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch low stock inventory"
      );
    }
  }
);

const initialState = {
  items: [],
  selectedItem: null,

  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  loading: false,
  detailsLoading: false,
  lowStockLoading: false,

  lowStockItems: [],

  error: null,
};

const inventorySlice = createSlice({
  name: "inventory",

  initialState,

  reducers: {
    clearInventoryError: (state) => {
      state.error = null;
    },

    clearSelectedInventory: (state) => {
      state.selectedItem = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false;

        const response = action.payload;

        state.items =
          response?.data?.items ||
          response?.data ||
          [];

        const pagination = response?.data?.pagination;

        if (pagination) {
          state.pagination = {
            page: pagination.page || 1,
            limit: pagination.limit || 10,
            total: pagination.total || 0,
            totalPages: pagination.totalPages || 0,
          };
        } else {
          state.pagination = {
            page: response?.data?.page || 1,
            limit: response?.data?.limit || 10,
            total: response?.data?.total || state.items.length,
            totalPages:
              response?.data?.totalPages ||
              Math.ceil(
                (response?.data?.total || state.items.length) /
                  (response?.data?.limit || 10)
              ),
          };
        }
      })

      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Inventory details
      .addCase(fetchInventoryById.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })

      .addCase(fetchInventoryById.fulfilled, (state, action) => {
        state.detailsLoading = false;

        state.selectedItem =
          action.payload?.data || action.payload;
      })

      .addCase(fetchInventoryById.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload;
      })

      // Low stock
      .addCase(fetchLowStockInventory.pending, (state) => {
        state.lowStockLoading = true;
        state.error = null;
      })

      .addCase(fetchLowStockInventory.fulfilled, (state, action) => {
        state.lowStockLoading = false;

        state.lowStockItems =
          action.payload?.data?.items ||
          action.payload?.data ||
          [];
      })

      .addCase(fetchLowStockInventory.rejected, (state, action) => {
        state.lowStockLoading = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearInventoryError,
  clearSelectedInventory,
} = inventorySlice.actions;

export default inventorySlice.reducer;