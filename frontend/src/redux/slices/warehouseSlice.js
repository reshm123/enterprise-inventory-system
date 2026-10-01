import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchWarehouses = createAsyncThunk(
  "warehouses/fetchWarehouses",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/warehouse", { params });
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch warehouses"
      );
    }
  }
);

export const fetchWarehouseById = createAsyncThunk(
  "warehouses/fetchWarehouseById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/warehouse/${id}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch warehouse"
      );
    }
  }
);

export const createWarehouse = createAsyncThunk(
  "warehouses/createWarehouse",
  async (warehouseData, { rejectWithValue }) => {
    try {
      const response = await api.post("/warehouse", warehouseData);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create warehouse"
      );
    }
  }
);

export const updateWarehouse = createAsyncThunk(
  "warehouses/updateWarehouse",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(`/warehouse/${id}`, data);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update warehouse"
      );
    }
  }
);

export const deleteWarehouse = createAsyncThunk(
  "warehouses/deleteWarehouse",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/warehouse/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to delete warehouse"
      );
    }
  }
);

const initialState = {
  warehouses: [],
  selectedWarehouse: null,
  loading: false,
  saving: false,
  deleting: false,
  error: null,
};

const warehouseSlice = createSlice({
  name: "warehouses",
  initialState,
  reducers: {
    clearWarehouseError: (state) => {
      state.error = null;
    },
    clearSelectedWarehouse: (state) => {
      state.selectedWarehouse = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWarehouses.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWarehouses.fulfilled, (state, action) => {
        state.loading = false;
        const payload = action.payload;
        state.warehouses = Array.isArray(payload)
          ? payload
          : payload?.items || [];
      })
      .addCase(fetchWarehouses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchWarehouseById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchWarehouseById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedWarehouse = action.payload;
      })
      .addCase(fetchWarehouseById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createWarehouse.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createWarehouse.fulfilled, (state, action) => {
        state.saving = false;
        const warehouse = action.payload;
        if (warehouse) {
          state.warehouses.unshift(warehouse);
        }
      })
      .addCase(createWarehouse.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updateWarehouse.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updateWarehouse.fulfilled, (state, action) => {
        state.saving = false;
        const updatedWarehouse = action.payload;
        if (!updatedWarehouse?._id) {
          return;
        }
        const index = state.warehouses.findIndex(
          (warehouse) => warehouse._id === updatedWarehouse._id
        );
        if (index !== -1) {
          state.warehouses[index] = updatedWarehouse;
        }
        state.selectedWarehouse = updatedWarehouse;
      })
      .addCase(updateWarehouse.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(deleteWarehouse.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })
      .addCase(deleteWarehouse.fulfilled, (state, action) => {
        state.deleting = false;
        state.warehouses = state.warehouses.filter(
          (warehouse) => warehouse._id !== action.payload
        );
      })
      .addCase(deleteWarehouse.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload;
      });
  },
});

export const { clearWarehouseError, clearSelectedWarehouse } =
  warehouseSlice.actions;

export default warehouseSlice.reducer;
