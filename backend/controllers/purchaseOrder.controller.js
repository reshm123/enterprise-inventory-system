import {
  createPurchaseOrderService,
  listPurchaseOrdersService,
  getPurchaseOrderService,
  updatePurchaseOrderService,
  submitPurchaseOrderService,
  approvePurchaseOrderService,
  cancelPurchaseOrderService,
  closePurchaseOrderService,
  receivePurchaseOrderService
} from "../services/purchaseOrder.service.js";
import { successResponse } from "../utils/response.js";

export const createPurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await createPurchaseOrderService(req.body, req.user.id);
    return successResponse(res, 201, "Purchase order created successfully", purchaseOrder);
  } catch (error) {
    next(error);
  }
};

export const listPurchaseOrders = async (req, res, next) => {
  try {
    return successResponse(res, 200, "Purchase orders fetched successfully", await listPurchaseOrdersService(req.query));
  } catch (error) {
    next(error);
  }
};

export const getPurchaseOrder = async (req, res, next) => {
  try {
    return successResponse(res, 200, "Purchase order fetched successfully", await getPurchaseOrderService(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const updatePurchaseOrder = async (req, res, next) => {
  try {
    return successResponse(res, 200, "Purchase order updated successfully", await updatePurchaseOrderService(req.params.id, req.body));
  } catch (error) {
    next(error);
  }
};

export const submitPurchaseOrder = async (req, res, next) => {
  try {
    return successResponse(res, 200, "Purchase order submitted for approval", await submitPurchaseOrderService(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const approvePurchaseOrder = async (req, res, next) => {
  try {
   
    return successResponse(res, 200, "Purchase order approved successfully", await approvePurchaseOrderService(req.params.id, req.user, req.body?.comment));
  } catch (error) {
    next(error);
  }
};

export const cancelPurchaseOrder = async (req, res, next) => {
  try {
    return successResponse(res, 200, "Purchase order cancelled successfully", await cancelPurchaseOrderService(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const closePurchaseOrder = async (req, res, next) => {
  try {
    return successResponse(res, 200, "Purchase order closed successfully", await closePurchaseOrderService(req.params.id));
  } catch (error) {
    next(error);
  }
};

export const receivePurchaseOrder = async (req, res, next) => {
  try {
    const items = req.body.items || req.body;
    return successResponse(res, 200, "Goods received successfully", await receivePurchaseOrderService(req.params.id, items, req.user));
  } catch (error) {
    next(error);
  }
};
