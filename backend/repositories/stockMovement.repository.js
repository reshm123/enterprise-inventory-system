import StockMovement from "../models/stockMovement.model.js";

const movementQuery = (query) =>
  StockMovement.find(query)
    .populate("productId", "sku name category")
    .populate("warehouseId", "name code location")
    .populate("performedBy", "name email role");

export const findStockMovementById = async (movementId) =>
  movementQuery({ _id: movementId });

export const listStockMovementRecords = async ({
  productId,
  warehouseId,
  type,
  performedBy,
  from,
  to,
  page,
  limit
}) => {
  const query = {};

  if (productId) query.productId = productId;
  if (warehouseId) query.warehouseId = warehouseId;
  if (type) query.type = type;
  if (performedBy) query.performedBy = performedBy;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    movementQuery(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    StockMovement.countDocuments(query)
  ]);

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit))
  };
};
