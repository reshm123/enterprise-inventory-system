import {
  getStockMovementService,
  getStockMovementsService
} from "../services/stockMovement.service.js";
import { successResponse } from "../utils/response.js";

export const listStockMovements = async (req, res, next) => {
  try {
    const result = await getStockMovementsService(req.query);
    return successResponse(res, 200, "Stock movements fetched successfully", result);
  } catch (error) {
    next(error);
  }
};

export const getStockMovement = async (req, res, next) => {
  try {
    const movement = await getStockMovementService(req.params.id);
    return successResponse(res, 200, "Stock movement fetched successfully", movement);
  } catch (error) {
    next(error);
  }
};
