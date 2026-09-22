import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createPurchaseOrder,
  listPurchaseOrders,
  getPurchaseOrder,
  updatePurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  closePurchaseOrder,
  receivePurchaseOrder
} from "../controllers/purchaseOrder.controller.js";

const router = express.Router();
const procurementRoles = ["Admin", "Procurement Manager"];
const viewRoles = [...procurementRoles, "Warehouse Manager", "Warehouse Staff", "Inventory Auditor"];

router.use(authenticate);
router.post("/", authorizeRoles(...procurementRoles), createPurchaseOrder);
router.get("/", authorizeRoles(...viewRoles), listPurchaseOrders);
router.get("/:id", authorizeRoles(...viewRoles), getPurchaseOrder);
router.patch("/:id", authorizeRoles(...procurementRoles), updatePurchaseOrder);
router.post("/:id/submit", authorizeRoles(...procurementRoles), submitPurchaseOrder);
router.post("/:id/approve", authorizeRoles(...procurementRoles), approvePurchaseOrder);
router.post("/:id/cancel", authorizeRoles(...procurementRoles), cancelPurchaseOrder);
router.post("/:id/close", authorizeRoles(...procurementRoles), closePurchaseOrder);
router.post("/:id/receive", authorizeRoles("Admin", "Warehouse Manager", "Warehouse Staff"), receivePurchaseOrder);

export default router;
