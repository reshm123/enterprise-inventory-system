import {
  createInventoryService,
  getInventoryService,
  getLowStockInventoryService,
  adjustInventoryService,
  getInventoryByIdService,
  updateInventoryEntryService
} from "../services/inventory.service.js";
import { successResponse } from "../utils/response.js";

export const createInventory = async (req, res, next) => {
  try {
    const inventory = await createInventoryService(req.body);
    return successResponse(res, 201, "Inventory created successfully", inventory);
  } catch (error) {
    next(error);
  }
};

export const listInventory = async (req, res, next) => {
  try {
    const result = await getInventoryService(req.query);
    return successResponse(res, 200, "Inventory fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getInventoryById = async (req, res, next) => {
  try {
    const inventory = await getInventoryByIdService(req.params.id);
    return successResponse(res, 200, "Inventory item fetched successfully", inventory);
  } catch (error) {
    next(error);
  }
};

export const getLowStockInventory = async (req, res, next) => {
  try {
    const result = await getLowStockInventoryService();
    return successResponse(res, 200, "Low stock items fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const adjustInventory = async (req, res, next) => {
  try {
    const inventory = await adjustInventoryService(req.body, req.user);
    return successResponse(res, 200, "Inventory adjusted successfully", inventory);
  } catch (error) {
    next(error);
  }
};

export const updateInventory = async (req, res, next) => {
  try {
    const inventory = await updateInventoryEntryService(req.params.id, req.body);
    return successResponse(res, 200, "Inventory updated successfully", inventory);
  } catch (error) {
    next(error);
  }
};
