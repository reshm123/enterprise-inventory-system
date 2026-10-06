import User from "../models/user.model.js";

const validRoles = [
  "Admin",
  "Procurement Manager",
  "Warehouse Manager",
  "Warehouse Staff",
  "Inventory Auditor",
];

const validStatuses = ["Active", "Inactive", "Suspended"];

export const listUsersService = async () => {
  const users = await User.find({})
    .select("name email role status warehouseIds createdAt updatedAt")
    .populate("warehouseIds", "name code location")
    .sort({ createdAt: -1 });

  return users.map((user) => ({
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    warehouseIds: user.warehouseIds || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
};

export const updateUserRoleService = async (userId, payload = {}) => {
  const { role, status, warehouseIds } = payload;

  if (!userId) {
    const error = new Error("User id is required");
    error.statusCode = 400;
    error.code = "INVALID_USER_ID";
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    error.code = "USER_NOT_FOUND";
    throw error;
  }

  if (role && !validRoles.includes(role)) {
    const error = new Error("Invalid user role");
    error.statusCode = 400;
    error.code = "INVALID_USER_ROLE";
    throw error;
  }

  if (status && !validStatuses.includes(status)) {
    const error = new Error("Invalid user status");
    error.statusCode = 400;
    error.code = "INVALID_USER_STATUS";
    throw error;
  }

  if (role) user.role = role;
  if (status) user.status = status;
  if (warehouseIds) user.warehouseIds = warehouseIds;

  await user.save();

  await user.populate("warehouseIds", "name code location");

  return {
    id: user._id,
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    warehouseIds: user.warehouseIds || [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};
