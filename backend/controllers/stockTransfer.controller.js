import { successResponse } from "../utils/response.js";
import {
  createStockTransferService,
  listStockTransfersService,
  getStockTransferService,
  requestStockTransferService,
  approveStockTransferService,
  shipStockTransferService,
  receiveStockTransferService,
  cancelStockTransferService
} from "../services/stockTransfer.service.js";

export const createStockTransfer = async (req, res, next) => {
  try { return successResponse(res, 201, "Stock transfer created successfully", await createStockTransferService(req.body, req.user.id)); } catch (error) { next(error); }
};
export const listStockTransfers = async (req, res, next) => {
  try { return successResponse(res, 200, "Stock transfers fetched successfully", await listStockTransfersService(req.query)); } catch (error) { next(error); }
};
export const getStockTransfer = async (req, res, next) => {
  try { return successResponse(res, 200, "Stock transfer fetched successfully", await getStockTransferService(req.params.id)); } catch (error) { next(error); }
};
export const requestStockTransfer = async (req, res, next) => {
  try { return successResponse(res, 200, "Stock transfer requested successfully", await requestStockTransferService(req.params.id)); } catch (error) { next(error); }
};
export const approveStockTransfer = async (req, res, next) => {
  try { return successResponse(res, 200, "Stock transfer approved successfully", await approveStockTransferService(req.params.id, req.user)); } catch (error) { next(error); }
};
export const shipStockTransfer = async (req, res, next) => {
  try { return successResponse(res, 200, "Stock transfer shipped successfully", await shipStockTransferService(req.params.id, req.user)); } catch (error) { next(error); }
};
export const receiveStockTransfer = async (req, res, next) => {
  try { return successResponse(res, 200, "Stock transfer received successfully", await receiveStockTransferService(req.params.id, req.user)); } catch (error) { next(error); }
};
export const cancelStockTransfer = async (req, res, next) => {
  try { return successResponse(res, 200, "Stock transfer cancelled successfully", await cancelStockTransferService(req.params.id)); } catch (error) { next(error); }
};