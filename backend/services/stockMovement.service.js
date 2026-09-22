import mongoose from "mongoose";
import {
  findStockMovementById,
  listStockMovementRecords
} from "../repositories/stockMovement.repository.js";

export const getStockMovementService = async (movementId) => {
  if (!mongoose.Types.ObjectId.isValid(movementId)) {
    const error = new Error("Invalid stock movement ID");
    error.statusCode = 400;
    error.code = "INVALID_STOCK_MOVEMENT_ID";
    throw error;
  }

  const movement = await findStockMovementById(movementId);
  if (!movement) {
    const error = new Error("Stock movement not found");
    error.statusCode = 404;
    error.code = "STOCK_MOVEMENT_NOT_FOUND";
    throw error;
  }

  return movement;
};

export const getStockMovementsService = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 20, 1), 100);

  return listStockMovementRecords({
    productId: query.productId,
    warehouseId: query.warehouseId,
    type: query.type,
    performedBy: query.performedBy,
    from: query.from,
    to: query.to,
    page,
    limit
  });
};
