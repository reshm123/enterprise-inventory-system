import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";

// Get suppliers
export const fetchSuppliers = createAsyncThunk(
  "suppliers/fetchSuppliers",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/supplier", {
        params,
      });

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch suppliers"
      );
    }
  }
);

// Get supplier by ID
export const fetchSupplierById = createAsyncThunk(
  "suppliers/fetchSupplierById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/supplier/${id}`);

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to fetch supplier"
      );
    }
  }
);

// Create supplier
export const createSupplier = createAsyncThunk(
  "suppliers/createSupplier",
  async (supplierData, { rejectWithValue }) => {
    try {
      const response = await api.post(
        "/supplier",
        supplierData
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to create supplier"
      );
    }
  }
);

// Update supplier
export const updateSupplier = createAsyncThunk(
  "suppliers/updateSupplier",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.put(
        `/supplier/${id}`,
        data
      );

      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to update supplier"
      );
    }
  }
);

// Delete supplier
export const deleteSupplier = createAsyncThunk(
  "suppliers/deleteSupplier",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/supplier/${id}`);

      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message ||
          "Failed to delete supplier"
      );
    }
  }
);

const initialState = {
  suppliers: [],
  selectedSupplier: null,

  loading: false,
  detailsLoading: false,
  saving: false,
  deleting: false,

  error: null,
};

const supplierSlice = createSlice({
  name: "suppliers",

  initialState,

  reducers: {
    clearSupplierError: (state) => {
      state.error = null;
    },

    clearSelectedSupplier: (state) => {
      state.selectedSupplier = null;
    },
  },

  extraReducers: (builder) => {
    builder

      // Fetch suppliers
      .addCase(fetchSuppliers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })

      .addCase(fetchSuppliers.fulfilled, (state, action) => {
        state.loading = false;

        state.suppliers =
          action.payload?.data?.items ||
          action.payload?.data ||
          [];
      })

      .addCase(fetchSuppliers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // Fetch supplier
      .addCase(fetchSupplierById.pending, (state) => {
        state.detailsLoading = true;
        state.error = null;
      })

      .addCase(fetchSupplierById.fulfilled, (state, action) => {
        state.detailsLoading = false;

        state.selectedSupplier =
          action.payload?.data ||
          action.payload;
      })

      .addCase(fetchSupplierById.rejected, (state, action) => {
        state.detailsLoading = false;
        state.error = action.payload;
      })

      // Create
      .addCase(createSupplier.pending, (state) => {
        state.saving = true;
        state.error = null;
      })

      .addCase(createSupplier.fulfilled, (state, action) => {
        state.saving = false;

        const supplier =
          action.payload?.data ||
          action.payload;

        if (supplier) {
          state.suppliers.unshift(supplier);
        }
      })

      .addCase(createSupplier.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // Update
      .addCase(updateSupplier.pending, (state) => {
        state.saving = true;
        state.error = null;
      })

      .addCase(updateSupplier.fulfilled, (state, action) => {
        state.saving = false;

        const updatedSupplier =
          action.payload?.data ||
          action.payload;

        if (!updatedSupplier?._id) {
          return;
        }

        const index = state.suppliers.findIndex(
          (supplier) =>
            supplier._id === updatedSupplier._id
        );

        if (index !== -1) {
          state.suppliers[index] = updatedSupplier;
        }

        state.selectedSupplier = updatedSupplier;
      })

      .addCase(updateSupplier.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })

      // Delete
      .addCase(deleteSupplier.pending, (state) => {
        state.deleting = true;
        state.error = null;
      })

      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.deleting = false;

        state.suppliers = state.suppliers.filter(
          (supplier) =>
            supplier._id !== action.payload
        );
      })

      .addCase(deleteSupplier.rejected, (state, action) => {
        state.deleting = false;
        state.error = action.payload;
      });
  },
});

export const {
  clearSupplierError,
  clearSelectedSupplier,
} = supplierSlice.actions;

export default supplierSlice.reducer;