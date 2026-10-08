import mongoose from "mongoose";
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
import AuditLog from "../models/auditLog.model.js";
import Inventory from "../models/inventory.model.js";
import { runMongoTransaction } from "../utils/transaction.js";

const runInTransaction = async (session, operation) => runMongoTransaction(session, operation);

export const createInventoryService = async ({ productId, warehouseId, quantity = 0, reorderLevel = 0 }, user) => {
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

  const initialQuantity = Number(quantity);
  if (!Number.isInteger(initialQuantity) || initialQuantity < 0) {
    const error = new Error("Initial quantity must be a non-negative integer");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const session = await mongoose.startSession();
  try {
    let inventory;
    await runInTransaction(session, async () => {
      const existing = await findInventoryByProductAndWarehouse(productId, warehouseId, session);
      if (existing) {
        const error = new Error("Inventory already exists for this product and warehouse");
        error.statusCode = 409;
        error.code = "INVENTORY_ALREADY_EXISTS";
        throw error;
      }

      inventory = await createInventoryEntry({
        productId,
        warehouseId,
        quantity: initialQuantity,
        reservedQuantity: 0,
        availableQuantity: initialQuantity,
        reorderLevel: Number(reorderLevel)
      }, session);

      await createStockMovementEntry({
        productId,
        warehouseId,
        type: "PURCHASE_RECEIPT",
        quantity: initialQuantity,
        reference: "INITIAL_STOCK",
        reason: "Initial inventory setup",
        performedBy: user.id
      }, session);

      await AuditLog.create([{
        action: "INVENTORY_CREATED",
        entityType: "Inventory",
        entityId: inventory._id,
        performedBy: user.id,
        details: { oldQuantity: 0, newQuantity: initialQuantity, reason: "Initial inventory setup", reference: "INITIAL_STOCK" }
      }], { session });
    });
    return inventory;
  } finally {
    await session.endSession();
  }
};

const assertWarehouseAccess = (user, warehouseId) => {
  if (!user || user.role !== "Warehouse Staff") return;
  const allowedWarehouseIds = (user.warehouseIds || []).map((id) => id.toString());
  const targetWarehouseId = warehouseId?.toString();
  if (!targetWarehouseId || !allowedWarehouseIds.includes(targetWarehouseId)) {
    const error = new Error("You do not have access to this warehouse");
    error.statusCode = 403;
    error.code = "FORBIDDEN";
    throw error;
  }
};

export const getInventoryService = async (query = {}, user = {}) => {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  if (user.role === "Warehouse Staff") {
    const allowedWarehouseIds = (user.warehouseIds || []).map((id) => id.toString());
    if (!allowedWarehouseIds.length) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    if (query.warehouse) {
      assertWarehouseAccess(user, query.warehouse);
    }

    query.warehouse = { $in: allowedWarehouseIds };
  }

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

export const getLowStockInventoryService = async (user = {}) => {
  const allowedWarehouseIds = user.role === "Warehouse Staff" ? (user.warehouseIds || []).map((id) => id.toString()) : [];
  const items = await getLowStockRecords(allowedWarehouseIds.length ? { warehouseId: { $in: allowedWarehouseIds } } : undefined);
  return {
    total: items.length,
    items
  };
};

export const adjustInventoryService = async ({ productId, warehouseId, quantity, reason }, user) => {
  if (!productId || !warehouseId || !Number.isInteger(quantity) || quantity === 0 || !reason?.trim()) {
    const error = new Error("Product, warehouse and quantity are required");
    error.statusCode = 400;
    error.code = "VALIDATION_ERROR";
    throw error;
  }

  const session = await mongoose.startSession();
  try {
    let updatedInventory;
    await runInTransaction(session, async () => {
      const inventory = await findInventoryByProductAndWarehouse(productId, warehouseId, session);
      if (!inventory) {
        const error = new Error("Inventory not found for the selected product and warehouse");
        error.statusCode = 404;
        error.code = "INVENTORY_NOT_FOUND";
        throw error;
      }

      const filter = { _id: inventory._id };
      if (quantity < 0) {
        filter.quantity = { $gte: -quantity };
        filter.availableQuantity = { $gte: -quantity };
      }
      updatedInventory = await Inventory.findOneAndUpdate(
        filter,
        { $inc: { quantity, availableQuantity: quantity, version: 1 } },
        { new: true, runValidators: true, session }
      );
      if (!updatedInventory) {
        const error = new Error("Adjustment would reduce available inventory below zero");
        error.statusCode = 400;
        error.code = "INSUFFICIENT_STOCK";
        throw error;
      }

      await createStockMovementEntry({
        productId,
        warehouseId,
        type: "STOCK_ADJUSTMENT",
        quantity,
        reason: reason.trim(),
        reference: "MANUAL_ADJUSTMENT",
        performedBy: user.id
      }, session);

      await AuditLog.create([{
        action: "STOCK_ADJUSTED",
        entityType: "Inventory",
        entityId: inventory._id,
        performedBy: user.id,
        details: {
          oldQuantity: inventory.quantity,
          newQuantity: updatedInventory.quantity,
          reason: reason.trim(),
          reference: "MANUAL_ADJUSTMENT"
        }
      }], { session });
    });
    return updatedInventory;
  } finally {
    await session.endSession();
  }
};

export const getInventoryByIdService = async (inventoryId, user = {}) => {
  const inventory = await findInventoryById(inventoryId);
  if (!inventory) {
    const error = new Error("Inventory record not found");
    error.statusCode = 404;
    error.code = "INVENTORY_NOT_FOUND";
    throw error;
  }

  if (user.role === "Warehouse Staff") {
    assertWarehouseAccess(user, inventory.warehouseId?._id || inventory.warehouseId);
  }

  return inventory;
};

export const updateInventoryEntryService = async (inventoryId, payload) => {
  if (Object.keys(payload).some((key) => key !== "reorderLevel") ||
      !Number.isFinite(payload.reorderLevel) || payload.reorderLevel < 0) {
    const error = new Error("Only a non-negative reorderLevel can be updated directly; use stock adjustment for quantity changes");
    error.statusCode = 400;
    error.code = "INVALID_INVENTORY_UPDATE";
    throw error;
  }

  const next = await updateInventoryEntry(inventoryId, { reorderLevel: payload.reorderLevel });
  if (!next) {
    const error = new Error("Inventory record not found");
    error.statusCode = 404;
    error.code = "INVENTORY_NOT_FOUND";
    throw error;
  }
  return next;
};
