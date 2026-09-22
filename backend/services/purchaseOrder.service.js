import mongoose from "mongoose";
import Product from "../models/product.model.js";
import Supplier from "../models/Supplier.js";
import Warehouse from "../models/warehouse.js";
import Inventory from "../models/inventory.model.js";
import StockMovement from "../models/stockMovement.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";
import {
  createPurchaseOrder,
  findPurchaseOrderById,
  findPurchaseOrders
} from "../repositories/purchaseOrder.repository.js";

const fail = (message, statusCode = 400, code = "VALIDATION_ERROR") => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  throw error;
};

const assertObjectId = (value, field) => {
  if (!mongoose.isValidObjectId(value)) fail(`${field} is invalid`);
};

const normalizeItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) fail("At least one purchase order item is required");

  const normalized = [];
  for (const item of items) {
    assertObjectId(item.productId, "Product");
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice);
    if (!Number.isInteger(quantity) || quantity <= 0) fail("Item quantity must be a positive integer");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) fail("Item unit price must be a non-negative number");
    const product = await Product.findById(item.productId).select("_id");
    if (!product) fail(`Product ${item.productId} not found`, 404, "PRODUCT_NOT_FOUND");
    normalized.push({ productId: item.productId, quantity, unitPrice, receivedQuantity: 0, pendingQuantity: quantity });
  }

  return normalized;
};

const assertReferences = async ({ supplierId, warehouseId }) => {
  assertObjectId(supplierId, "Supplier");
  assertObjectId(warehouseId, "Warehouse");
  const [supplier, warehouse] = await Promise.all([
    Supplier.findById(supplierId).select("status"),
    Warehouse.findById(warehouseId).select("status")
  ]);
  if (!supplier) fail("Supplier not found", 404, "SUPPLIER_NOT_FOUND");
  if (supplier.status !== "Active") fail("Supplier is inactive", 400, "INACTIVE_SUPPLIER");
  if (!warehouse) fail("Warehouse not found", 404, "WAREHOUSE_NOT_FOUND");
  if (warehouse.status !== "ACTIVE") fail("Warehouse is inactive", 400, "INACTIVE_WAREHOUSE");
};

const calculateTotal = (items) => items.reduce((total, item) => total + item.quantity * item.unitPrice, 0);

export const createPurchaseOrderService = async (data, userId) => {
  await assertReferences(data);
  const items = await normalizeItems(data.items);
  const poNumber = String(data.poNumber || `PO-${Date.now()}`).trim().toUpperCase();
  if (!poNumber) fail("PO number is required");

  try {
    return await createPurchaseOrder({
      poNumber,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      items,
      totalAmount: calculateTotal(items),
      expectedDeliveryDate: data.expectedDeliveryDate,
      createdBy: userId,
      status: "Draft"
    });
  } catch (error) {
    if (error.code === 11000) fail("Purchase order number already exists", 409, "DUPLICATE_PO_NUMBER");
    throw error;
  }
};

export const listPurchaseOrdersService = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const result = await findPurchaseOrders({
    status: query.status,
    supplierId: query.supplierId,
    warehouseId: query.warehouseId,
    page,
    limit
  });
  return { ...result, page, limit, totalPages: Math.max(1, Math.ceil(result.total / limit)) };
};

export const getPurchaseOrderService = async (id) => {
  assertObjectId(id, "Purchase order");
  const purchaseOrder = await findPurchaseOrderById(id);
  if (!purchaseOrder) fail("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  return purchaseOrder;
};

export const updatePurchaseOrderService = async (id, data) => {
  assertObjectId(id, "Purchase order");
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) fail("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  if (purchaseOrder.status !== "Draft") fail("Only draft purchase orders can be edited", 409, "INVALID_PO_STATE");

  if (data.supplierId || data.warehouseId) {
    await assertReferences({ supplierId: data.supplierId || purchaseOrder.supplierId, warehouseId: data.warehouseId || purchaseOrder.warehouseId });
  }
  if (data.items) data.items = await normalizeItems(data.items);
  const nextItems = data.items || purchaseOrder.items;
  const update = {
    ...(data.supplierId && { supplierId: data.supplierId }),
    ...(data.warehouseId && { warehouseId: data.warehouseId }),
    ...(data.expectedDeliveryDate !== undefined && { expectedDeliveryDate: data.expectedDeliveryDate }),
    ...(data.poNumber && { poNumber: String(data.poNumber).toUpperCase() }),
    ...(data.items && { items: data.items, totalAmount: calculateTotal(nextItems) })
  };

  try {
    Object.assign(purchaseOrder, update);
    return await purchaseOrder.save();
  } catch (error) {
    if (error.code === 11000) fail("Purchase order number already exists", 409, "DUPLICATE_PO_NUMBER");
    throw error;
  }
};

export const submitPurchaseOrderService = async (id) => {
  assertObjectId(id, "Purchase order");
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) fail("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  if (purchaseOrder.status !== "Draft") fail("Only draft purchase orders can be submitted", 409, "INVALID_PO_STATE");
  purchaseOrder.status = "Pending Approval";
  return purchaseOrder.save();
};

export const approvePurchaseOrderService = async (id, user, comment = "") => {
  assertObjectId(id, "Purchase order");
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) fail("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  if (purchaseOrder.status !== "Pending Approval") fail("Only pending purchase orders can be approved", 409, "INVALID_PO_STATE");
  if (purchaseOrder.createdBy.toString() === user.id) fail("A user cannot approve their own purchase order", 403, "SEPARATION_OF_DUTIES_REQUIRED");
  purchaseOrder.status = "Approved";
  purchaseOrder.approvedBy = user.id;
  purchaseOrder.approvedAt = new Date();
  purchaseOrder.approvalComment = comment;
  return purchaseOrder.save();
};

export const cancelPurchaseOrderService = async (id) => {
  assertObjectId(id, "Purchase order");
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) fail("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  if (["Fully Received", "Closed", "Cancelled"].includes(purchaseOrder.status)) fail("Purchase order cannot be cancelled in its current state", 409, "INVALID_PO_STATE");
  purchaseOrder.status = "Cancelled";
  return purchaseOrder.save();
};

export const closePurchaseOrderService = async (id) => {
  assertObjectId(id, "Purchase order");
  const purchaseOrder = await PurchaseOrder.findById(id);
  if (!purchaseOrder) fail("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
  if (purchaseOrder.status !== "Fully Received") fail("Only fully received purchase orders can be closed", 409, "INVALID_PO_STATE");
  purchaseOrder.status = "Closed";
  return purchaseOrder.save();
};

export const receivePurchaseOrderService = async (id, receiptItems, user) => {
  assertObjectId(id, "Purchase order");
  if (!Array.isArray(receiptItems) || receiptItems.length === 0) fail("Receipt items are required");

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const purchaseOrder = await PurchaseOrder.findById(id).session(session);
      if (!purchaseOrder) fail("Purchase order not found", 404, "PURCHASE_ORDER_NOT_FOUND");
      if (!["Approved", "Partially Received"].includes(purchaseOrder.status)) fail("Purchase order is not receivable in its current state", 409, "INVALID_PO_STATE");

      const movements = [];
      for (const receipt of receiptItems) {
        assertObjectId(receipt.productId, "Product");
        const quantity = Number(receipt.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) fail("Receipt quantity must be a positive integer");
        const item = purchaseOrder.items.find((entry) => entry.productId.toString() === receipt.productId);
        if (!item) fail(`Product ${receipt.productId} is not part of this purchase order`);
        if (item.receivedQuantity + quantity > item.quantity) fail(`Cannot receive more than ordered quantity for product ${receipt.productId}`, 400, "OVER_RECEIVING_NOT_ALLOWED");

        item.receivedQuantity += quantity;
        item.pendingQuantity = item.quantity - item.receivedQuantity;
        const product = await Product.findById(receipt.productId).select("reorderLevel").session(session);
        await Inventory.findOneAndUpdate(
          { productId: receipt.productId, warehouseId: purchaseOrder.warehouseId },
          {
            $inc: { quantity, availableQuantity: quantity },
            $setOnInsert: { reservedQuantity: 0, reorderLevel: product?.reorderLevel || 0 }
          },
          { upsert: true, new: true, session, setDefaultsOnInsert: true }
        );
        movements.push({
          productId: receipt.productId,
          warehouseId: purchaseOrder.warehouseId,
          type: "PURCHASE_RECEIPT",
          quantity,
          reference: purchaseOrder.poNumber,
          reason: "Goods received against purchase order",
          performedBy: user.id
        });
      }

      if (purchaseOrder.items.every((item) => item.pendingQuantity === 0)) purchaseOrder.status = "Fully Received";
      else purchaseOrder.status = "Partially Received";
      await purchaseOrder.save({ session });
      await StockMovement.insertMany(movements, { session });
      result = purchaseOrder;
    });
    return result;
  } finally {
    await session.endSession();
  }
};
