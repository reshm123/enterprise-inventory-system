import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createInventory,
  listInventory,
  getInventoryById,
  getLowStockInventory,
  adjustInventory,
  updateInventory
} from "../controllers/inventory.controller.js";

const router = express.Router();

router.use(authenticate);

router.post(
  "/",
  authorizeRoles("Admin", "Procurement Manager", "Warehouse Manager", "Warehouse Staff"),
  createInventory
);
router.get("/", authorizeRoles("Admin", "Procurement Manager", "Warehouse Manager", "Warehouse Staff", "Inventory Auditor"), listInventory);
router.get("/low-stock", authorizeRoles("Admin", "Procurement Manager", "Warehouse Manager", "Warehouse Staff", "Inventory Auditor"), getLowStockInventory);
router.get("/:id", authorizeRoles("Admin", "Procurement Manager", "Warehouse Manager", "Warehouse Staff", "Inventory Auditor"), getInventoryById);
router.patch("/:id", authorizeRoles("Admin", "Warehouse Manager", "Warehouse Staff"), updateInventory);
router.post("/adjust", authorizeRoles("Admin", "Warehouse Manager", "Warehouse Staff"), adjustInventory);

export default router;
