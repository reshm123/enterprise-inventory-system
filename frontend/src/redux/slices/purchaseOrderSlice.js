import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchPurchaseOrders = createAsyncThunk(
  "purchaseOrders/fetchPurchaseOrders",
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get("/purchase-orders", { params });
      const payload = response.data?.data ?? response.data;
      return Array.isArray(payload) ? payload : payload?.items || [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch purchase orders"
      );
    }
  }
);

export const fetchPurchaseOrderById = createAsyncThunk(
  "purchaseOrders/fetchPurchaseOrderById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.get(`/purchase-orders/${id}`);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to fetch purchase order"
      );
    }
  }
);

export const createPurchaseOrder = createAsyncThunk(
  "purchaseOrders/createPurchaseOrder",
  async (orderData, { rejectWithValue }) => {
    try {
      const response = await api.post("/purchase-orders", orderData);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to create purchase order"
      );
    }
  }
);

export const updatePurchaseOrder = createAsyncThunk(
  "purchaseOrders/updatePurchaseOrder",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/purchase-orders/${id}`, data);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update purchase order"
      );
    }
  }
);

export const submitPurchaseOrder = createAsyncThunk(
  "purchaseOrders/submitPurchaseOrder",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/purchase-orders/${id}/submit`);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to submit purchase order"
      );
    }
  }
);

export const approvePurchaseOrder = createAsyncThunk(
  "purchaseOrders/approvePurchaseOrder",
  async ({ id, comment = "Approved from frontend" }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/purchase-orders/${id}/approve`, { comment });
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to approve purchase order"
      );
    }
  }
);

export const receivePurchaseOrder = createAsyncThunk(
  "purchaseOrders/receivePurchaseOrder",
  async ({ id, items }, { rejectWithValue }) => {
    try {
      const response = await api.post(`/purchase-orders/${id}/receive`, { items });
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to receive goods"
      );
    }
  }
);

export const cancelPurchaseOrder = createAsyncThunk(
  "purchaseOrders/cancelPurchaseOrder",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.post(`/purchase-orders/${id}/cancel`);
      return response.data?.data ?? response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to cancel purchase order"
      );
    }
  }
);

const initialState = {
  purchaseOrders: [],
  selectedPurchaseOrder: null,
  loading: false,
  saving: false,
  updating: false,
  error: null,
};

const purchaseOrderSlice = createSlice({
  name: "purchaseOrders",
  initialState,
  reducers: {
    clearPurchaseOrderError: (state) => {
      state.error = null;
    },
    clearSelectedPurchaseOrder: (state) => {
      state.selectedPurchaseOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPurchaseOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.purchaseOrders = Array.isArray(action.payload)
          ? action.payload
          : action.payload?.items || [];
      })
      .addCase(fetchPurchaseOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPurchaseOrderById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPurchaseOrderById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPurchaseOrder = action.payload;
      })
      .addCase(fetchPurchaseOrderById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(createPurchaseOrder.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(createPurchaseOrder.fulfilled, (state, action) => {
        state.saving = false;
        const order = action.payload;
        if (order) {
          state.purchaseOrders.unshift(order);
        }
      })
      .addCase(createPurchaseOrder.rejected, (state, action) => {
        state.saving = false;
        state.error = action.payload;
      })
      .addCase(updatePurchaseOrder.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(updatePurchaseOrder.fulfilled, (state, action) => {
        state.updating = false;
        const order = action.payload;
        if (!order?._id) {
          return;
        }
        const index = state.purchaseOrders.findIndex(
          (item) => item._id === order._id
        );
        if (index !== -1) {
          state.purchaseOrders[index] = order;
        }
        state.selectedPurchaseOrder = order;
      })
      .addCase(updatePurchaseOrder.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      .addCase(submitPurchaseOrder.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(submitPurchaseOrder.fulfilled, (state, action) => {
        state.updating = false;
        const order = action.payload;
        if (order?._id) {
          const index = state.purchaseOrders.findIndex(
            (item) => item._id === order._id
          );
          if (index !== -1) {
            state.purchaseOrders[index] = order;
          }
          state.selectedPurchaseOrder = order;
        }
      })
      .addCase(submitPurchaseOrder.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      .addCase(approvePurchaseOrder.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(approvePurchaseOrder.fulfilled, (state, action) => {
        state.updating = false;
        const order = action.payload;
        if (order?._id) {
          const index = state.purchaseOrders.findIndex(
            (item) => item._id === order._id
          );
          if (index !== -1) {
            state.purchaseOrders[index] = order;
          }
          state.selectedPurchaseOrder = order;
        }
      })
      .addCase(approvePurchaseOrder.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      .addCase(receivePurchaseOrder.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(receivePurchaseOrder.fulfilled, (state, action) => {
        state.updating = false;
        const order = action.payload;
        if (order?._id) {
          const index = state.purchaseOrders.findIndex(
            (item) => item._id === order._id
          );
          if (index !== -1) {
            state.purchaseOrders[index] = order;
          }
          state.selectedPurchaseOrder = order;
        }
      })
      .addCase(receivePurchaseOrder.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      })
      .addCase(cancelPurchaseOrder.pending, (state) => {
        state.updating = true;
        state.error = null;
      })
      .addCase(cancelPurchaseOrder.fulfilled, (state, action) => {
        state.updating = false;
        const order = action.payload;
        if (order?._id) {
          const index = state.purchaseOrders.findIndex(
            (item) => item._id === order._id
          );
          if (index !== -1) {
            state.purchaseOrders[index] = order;
          }
          state.selectedPurchaseOrder = order;
        }
      })
      .addCase(cancelPurchaseOrder.rejected, (state, action) => {
        state.updating = false;
        state.error = action.payload;
      });
  },
});

export const { clearPurchaseOrderError, clearSelectedPurchaseOrder } =
  purchaseOrderSlice.actions;

export default purchaseOrderSlice.reducer;
