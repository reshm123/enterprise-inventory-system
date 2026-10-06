import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  updateWarehouseStatus,
  deleteWarehouse
} from "../controllers/warehouseController.js";

const router = express.Router();
const warehouseReadRoles = [
  "Admin",
  "Procurement Manager",
  "Warehouse Manager",
  "Warehouse Staff",
  "Inventory Auditor"
];

router.use(authenticate);
router.post("/", authorizeRoles("Admin", "Warehouse Manager"), createWarehouse);
router.get("/", authorizeRoles(...warehouseReadRoles), getWarehouses);
router.get("/:id", authorizeRoles(...warehouseReadRoles), getWarehouseById);
router.put("/:id", authorizeRoles("Admin", "Warehouse Manager"), updateWarehouse);
router.patch("/:id", authorizeRoles("Admin", "Warehouse Manager"), updateWarehouse);
router.patch("/:id/status", authorizeRoles("Admin", "Warehouse Manager"), updateWarehouseStatus);
router.delete("/:id", authorizeRoles("Admin"), deleteWarehouse);

export default router;