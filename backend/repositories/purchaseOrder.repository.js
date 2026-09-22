import PurchaseOrder from "../models/purchaseOrder.model.js";

const populatePurchaseOrder = (query) => query
  .populate("supplierId", "name email status")
  .populate("warehouseId", "name code location status")
  .populate("createdBy", "name email role")
  .populate("approvedBy", "name email role")
  .populate("items.productId", "sku name category brand");

export const createPurchaseOrder = async (data) => PurchaseOrder.create(data);

export const findPurchaseOrderById = async (id, session) => {
  const query = PurchaseOrder.findById(id);
  if (session) query.session(session);
  return populatePurchaseOrder(query);
};

export const findPurchaseOrders = async ({ status, supplierId, warehouseId, page, limit }) => {
  const filter = {};
  if (status) filter.status = status;
  if (supplierId) filter.supplierId = supplierId;
  if (warehouseId) filter.warehouseId = warehouseId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    populatePurchaseOrder(PurchaseOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)),
    PurchaseOrder.countDocuments(filter)
  ]);

  return { items, total };
};

export const findActivePurchaseOrderBySupplier = async (supplierId) =>
  PurchaseOrder.findOne({
    supplierId,
    status: { $in: ["Pending Approval", "Approved", "Partially Received"] }
  });
