import { findProductById } from "../repositories/product.repository.js";
import { findWarehouseById } from "../repositories/warehouseRepository.js";
import {
  createInventoryEntry,
  findInventoryByProductAndWarehouse,
  listInventoryRecords,
  getLowStockRecords,
  createStockMovementEntry,
  findInventoryById,
  updateInventoryEntry
} from "../repositories/inventory.repository.js";

export const createInventoryService = async ({ productId, warehouseId, quantity = 0, reorderLevel = 0 }) => {
  if (!productId || !warehouseId) {
    const error = new Error("Product and warehouse are required");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const product = await findProductById(productId);
  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    error.code = "PRODUCT_NOT_FOUND";
    throw error;
  }

  const warehouse = await findWarehouseById(warehouseId);
  if (!warehouse) {
    const error = new Error("Warehouse not found");
    error.statusCode = 404;
    error.code = "WAREHOUSE_NOT_FOUND";
    throw error;
  }

  const existing = await findInventoryByProductAndWarehouse(productId, warehouseId);
  if (existing) {
    const error = new Error("Inventory already exists for this product and warehouse");
    error.statusCode = 409;
    error.code = "INVENTORY_ALREADY_EXISTS";
    throw error;
  }

  const inventory = await createInventoryEntry({
    productId,
    warehouseId,
    quantity: Number(quantity),
    reservedQuantity: 0,
    availableQuantity: Number(quantity),
    reorderLevel: Number(reorderLevel)
  });

  await createStockMovementEntry({
    productId,
    warehouseId,
    type: "PURCHASE_RECEIPT",
    quantity: Number(quantity),
    reference: "INITIAL_STOCK",
    reason: "Initial inventory setup",
    performedBy: warehouse.managerId || product._id
  });

  return inventory;
};

export const getInventoryService = async (query = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  const result = await listInventoryRecords({
    search: query.search,
    warehouse: query.warehouse,
    category: query.category,
    lowStock: query.lowStock === "true" || query.lowStock === true,
    outOfStock: query.outOfStock === "true" || query.outOfStock === true,
    sortBy: query.sortBy || "updatedAt",
    sortOrder: query.sortOrder || "desc",
    page,
    limit
  });

  return {
    items: result.items,
    total: result.total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(result.total / limit))
  };
};

export const getLowStockInventoryService = async () => {
  const items = await getLowStockRecords();
  return {
    total: items.length,
    items
  };
};

export const adjustInventoryService = async ({ productId, warehouseId, quantity, reason = "Manual adjustment" }, user) => {
  if (!productId || !warehouseId || typeof quantity !== "number") {
    const error = new Error("Product, warehouse and quantity are required");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const inventory = await findInventoryByProductAndWarehouse(productId, warehouseId);
  if (!inventory) {
    const error = new Error("Inventory not found for the selected product and warehouse");
    error.statusCode = 404;
    error.code = "INVENTORY_NOT_FOUND";
    throw error;
  }

  const nextQuantity = inventory.quantity + quantity;
  if (nextQuantity < 0) {
    const error = new Error("Adjustment would result in negative inventory");
    error.statusCode = 400;
    error.code = "INSUFFICIENT_STOCK";
    throw error;
  }

  inventory.quantity = nextQuantity;
  inventory.availableQuantity = Math.max(0, inventory.quantity - inventory.reservedQuantity);
  inventory.version = (inventory.version || 0) + 1;
  await inventory.save();

  await createStockMovementEntry({
    productId,
    warehouseId,
    type: "STOCK_ADJUSTMENT",
    quantity,
    reason,
    reference: "MANUAL_ADJUSTMENT",
    performedBy: user.id
  });

  return inventory;
};

export const getInventoryByIdService = async (inventoryId) => {
  const inventory = await findInventoryById(inventoryId);
  if (!inventory) {
    const error = new Error("Inventory record not found");
    error.statusCode = 404;
    error.code = "INVENTORY_NOT_FOUND";
    throw error;
  }

  return inventory;
};

export const updateInventoryEntryService = async (inventoryId, payload) => {
  const inventory = await findInventoryById(inventoryId);
  if (!inventory) {
    const error = new Error("Inventory record not found");
    error.statusCode = 404;
    error.code = "INVENTORY_NOT_FOUND";
    throw error;
  }

  const nextQuantity = payload.quantity ?? inventory.quantity;
  const nextReservedQuantity = payload.reservedQuantity ?? inventory.reservedQuantity;

  if (nextReservedQuantity > nextQuantity) {
    const error = new Error("Reserved quantity cannot exceed total quantity");
    error.statusCode = 400;
    error.code = "INVALID_RESERVED_QUANTITY";
    throw error;
  }

  const next = await updateInventoryEntry(inventoryId, {
    ...payload,
    availableQuantity: nextQuantity - nextReservedQuantity
  });
  return next;
};
