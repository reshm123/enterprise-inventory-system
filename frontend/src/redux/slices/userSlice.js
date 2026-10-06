import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../../services/api";

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/users");
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to load users"
      );
    }
  }
);

export const updateUserRole = createAsyncThunk(
  "users/updateUserRole",
  async ({ id, role, status }, { rejectWithValue }) => {
    try {
      const response = await api.patch(`/users/${id}/role`, {
        role,
        status,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Failed to update user"
      );
    }
  }
);

const initialState = {
  users: [],
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUserError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(updateUserRole.pending, (state) => {
        state.error = null;
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const updatedUser = action.payload;
        if (!updatedUser) return;

        state.users = state.users.map((user) =>
          user._id === updatedUser._id ? updatedUser : user
        );
      })
      .addCase(updateUserRole.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearUserError } = userSlice.actions;
export default userSlice.reducer;
