import {
  createWarehouseService,
  getWarehouseService,
  getWarehousesService,
  updateWarehouseService,
  updateWarehouseStatusService,
  deleteWarehouseService
} from "../services/warehouseService.js";
import { successResponse } from "../utils/response.js";

export const createWarehouse = async (req, res, next) => {
  try {
    const warehouse = await createWarehouseService({
      ...req.body,
      managerId: req.user.id
    });
    return successResponse(res, 201, "Warehouse created successfully", warehouse);
  } catch (error) {
    next(error);
  }
};

export const getWarehouses = async (req, res, next) => {
  try {
    const warehouses = await getWarehousesService(req.query);
    return successResponse(res, 200, "Warehouses fetched successfully", warehouses);
  } catch (error) {
    next(error);
  }
};

export const getWarehouseById = async (req, res, next) => {
  try {
    const warehouse = await getWarehouseService(req.params.id);
    return successResponse(res, 200, "Warehouse fetched successfully", warehouse);
  } catch (error) {
    next(error);
  }
};

export const updateWarehouse = async (req, res, next) => {
  try {
    const warehouse = await updateWarehouseService(req.params.id, req.body);
    return successResponse(res, 200, "Warehouse updated successfully", warehouse);
  } catch (error) {
    next(error);
  }
};

export const updateWarehouseStatus = async (req, res, next) => {
  try {
    const warehouse = await updateWarehouseStatusService(req.params.id, req.body.status);
    return successResponse(res, 200, "Warehouse status updated successfully", warehouse);
  } catch (error) {
    next(error);
  }
};

export const deleteWarehouse = async (req, res, next) => {
  try {
    await deleteWarehouseService(req.params.id);
    return successResponse(res, 200, "Warehouse deleted successfully");
  } catch (error) {
    next(error);
  }
};
