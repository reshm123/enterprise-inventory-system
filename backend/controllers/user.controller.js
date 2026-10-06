import { listUsersService, updateUserRoleService } from "../services/user.service.js";

export const listUsers = async (req, res, next) => {
  try {
    const users = await listUsersService();
    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, status, warehouseIds } = req.body;

    const user = await updateUserRoleService(id, { role, status, warehouseIds });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
