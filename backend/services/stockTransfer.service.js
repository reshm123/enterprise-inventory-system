import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Warehouse from "../models/warehouse.js";
import Inventory from "../models/inventory.model.js";
import StockMovement from "../models/stockMovement.model.js";
import StockTransfer from "../models/stockTransfer.model.js";

const fail = (message, statusCode = 400, code = "VALIDATION_ERROR") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
};

const assertId = (value, field) => {
  if (!mongoose.isValidObjectId(value)) fail(`${field} is invalid`);
};

const runWithTransaction = async (session, operation) => {
  try {
    return await session.withTransaction(operation);
  } catch (error) {
    if (error.code !== 20 || process.env.NODE_ENV === "production") throw error;
    return operation();
  }
};

const getTransfer = async (id, session) => {
  assertId(id, "Transfer");
  const transfer = await StockTransfer.findById(id).session(session || null);
  if (!transfer) fail("Stock transfer not found", 404, "TRANSFER_NOT_FOUND");
  return transfer;
};

const normalizeItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) fail("At least one transfer item is required");
  const normalized = [];
  for (const item of items) {
    assertId(item.productId, "Product");
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) fail("Transfer quantity must be a positive integer");
    const product = await Product.findById(item.productId).select("_id");
    if (!product) fail(`Product ${item.productId} not found`, 404, "PRODUCT_NOT_FOUND");
    if (normalized.some((entry) => entry.productId.toString() === item.productId.toString())) {
      fail("A product can only appear once in a transfer");
    }
    normalized.push({ productId: item.productId, quantity });
  }
  return normalized;
};

const assertWarehouses = async (fromWarehouse, toWarehouse) => {
  assertId(fromWarehouse, "Source warehouse");
  assertId(toWarehouse, "Destination warehouse");
  if (fromWarehouse.toString() === toWarehouse.toString()) fail("Source and destination warehouses must be different");
  const warehouses = await Warehouse.find({ _id: { $in: [fromWarehouse, toWarehouse] }, status: "ACTIVE" }).select("_id");
  if (warehouses.length !== 2) fail("Both warehouses must exist and be active", 400, "INVALID_WAREHOUSE");
};

export const createStockTransferService = async (data, userId) => {
  await assertWarehouses(data.fromWarehouse, data.toWarehouse);
  const items = await normalizeItems(data.items);
  const transferNumber = String(data.transferNumber || `TR-${Date.now()}`).trim().toUpperCase();
  try {
    return await StockTransfer.create({ transferNumber, fromWarehouse: data.fromWarehouse, toWarehouse: data.toWarehouse, items, requestedBy: userId });
  } catch (error) {
    if (error.code === 11000) fail("Transfer number already exists", 409, "DUPLICATE_TRANSFER_NUMBER");
    throw error;
  }
};

export const listStockTransfersService = async (query = {}) => {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.fromWarehouse) filter.fromWarehouse = query.fromWarehouse;
  if (query.toWarehouse) filter.toWarehouse = query.toWarehouse;
  return StockTransfer.find(filter).sort({ createdAt: -1 });
};

export const getStockTransferService = (id) => getTransfer(id);

export const requestStockTransferService = async (id) => {
  const transfer = await getTransfer(id);
  if (transfer.status !== "Draft") fail("Only draft transfers can be requested", 409, "INVALID_TRANSFER_STATE");
  transfer.status = "Requested";
  return transfer.save();
};

export const approveStockTransferService = async (id, user) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await runWithTransaction(session, async () => {
      const transfer = await getTransfer(id, session);
      if (transfer.status !== "Requested") fail("Only requested transfers can be approved", 409, "INVALID_TRANSFER_STATE");
      for (const item of transfer.items) {
        const updated = await Inventory.findOneAndUpdate(
          { productId: item.productId, warehouseId: transfer.fromWarehouse, availableQuantity: { $gte: item.quantity } },
          { $inc: { reservedQuantity: item.quantity, availableQuantity: -item.quantity, version: 1 } },
          { new: true, session }
        );
        if (!updated) fail(`Insufficient stock for product ${item.productId}`, 400, "INSUFFICIENT_STOCK");
      }
      transfer.status = "Approved";
      transfer.approvedBy = user.id;
      await transfer.save({ session });
      result = transfer;
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export const shipStockTransferService = async (id, user) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await runWithTransaction(session, async () => {
      const transfer = await getTransfer(id, session);
      if (transfer.status !== "Approved") fail("Only approved transfers can be shipped", 409, "INVALID_TRANSFER_STATE");
      const movements = transfer.items.map((item) => ({ productId: item.productId, warehouseId: transfer.fromWarehouse, type: "STOCK_TRANSFER_OUT", quantity: -item.quantity, reference: transfer.transferNumber, reason: "Stock transfer shipped", performedBy: user.id }));
      for (const item of transfer.items) {
        const updated = await Inventory.findOneAndUpdate(
          { productId: item.productId, warehouseId: transfer.fromWarehouse, reservedQuantity: { $gte: item.quantity }, quantity: { $gte: item.quantity } },
          { $inc: { quantity: -item.quantity, reservedQuantity: -item.quantity, version: 1 } },
          { new: true, session }
        );
        if (!updated) fail(`Unable to ship stock for product ${item.productId}`, 409, "INSUFFICIENT_STOCK");
      }
      transfer.status = "In Transit";
      await transfer.save({ session });
      await StockMovement.insertMany(movements, { session });
      result = transfer;
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export const receiveStockTransferService = async (id, user) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await runWithTransaction(session, async () => {
      const transfer = await getTransfer(id, session);
      if (transfer.status !== "In Transit") fail("Only in-transit transfers can be received", 409, "INVALID_TRANSFER_STATE");
      const movements = [];
      for (const item of transfer.items) {
        const product = await Product.findById(item.productId).select("reorderLevel").session(session);
        await Inventory.findOneAndUpdate(
          { productId: item.productId, warehouseId: transfer.toWarehouse },
          { $inc: { quantity: item.quantity, availableQuantity: item.quantity, version: 1 }, $setOnInsert: { reservedQuantity: 0, reorderLevel: product.reorderLevel } },
          { upsert: true, new: true, session, setDefaultsOnInsert: true }
        );
        movements.push({ productId: item.productId, warehouseId: transfer.toWarehouse, type: "STOCK_TRANSFER_IN", quantity: item.quantity, reference: transfer.transferNumber, reason: "Stock transfer received", performedBy: user.id });
      }
      transfer.status = "Received";
      await transfer.save({ session });
      await StockMovement.insertMany(movements, { session });
      result = transfer;
    });
    return result;
  } finally {
    await session.endSession();
  }
};

export const cancelStockTransferService = async (id) => {
  const session = await mongoose.startSession();
  try {
    let result;
    await runWithTransaction(session, async () => {
      const transfer = await getTransfer(id, session);
      if (!["Draft", "Requested", "Approved"].includes(transfer.status)) fail("Transfer cannot be cancelled in its current state", 409, "INVALID_TRANSFER_STATE");
      if (transfer.status === "Approved") {
        for (const item of transfer.items) {
          await Inventory.findOneAndUpdate({ productId: item.productId, warehouseId: transfer.fromWarehouse }, { $inc: { reservedQuantity: -item.quantity, availableQuantity: item.quantity, version: 1 } }, { session });
        }
      }
      transfer.status = "Cancelled";
      await transfer.save({ session });
      result = transfer;
    });
    return result;
  } finally {
    await session.endSession();
  }
};