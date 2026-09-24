import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createStockTransfer,
  listStockTransfers,
  getStockTransfer,
  requestStockTransfer,
  approveStockTransfer,
  shipStockTransfer,
  receiveStockTransfer,
  cancelStockTransfer
} from "../controllers/stockTransfer.controller.js";

const router = express.Router();
const operators = ["Admin", "Warehouse Manager", "Warehouse Staff"];
const approvers = ["Admin", "Warehouse Manager"];

router.use(authenticate);
router.post("/", authorizeRoles(...operators), createStockTransfer);
router.get("/", authorizeRoles(...operators, "Inventory Auditor", "Procurement Manager"), listStockTransfers);
router.get("/:id", authorizeRoles(...operators, "Inventory Auditor", "Procurement Manager"), getStockTransfer);
router.post("/:id/request", authorizeRoles(...operators), requestStockTransfer);
router.post("/:id/approve", authorizeRoles(...approvers), approveStockTransfer);
router.post("/:id/ship", authorizeRoles(...operators), shipStockTransfer);
router.post("/:id/receive", authorizeRoles(...operators), receiveStockTransfer);
router.post("/:id/cancel", authorizeRoles(...operators), cancelStockTransfer);

export default router;