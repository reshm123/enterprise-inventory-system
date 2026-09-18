import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  createWarehouse,
  getWarehouses,
  getWarehouseById,
  updateWarehouse,
  updateWarehouseStatus,
  deleteWarehouse
} from "../controllers/warehouseController.js";

const router = express.Router();
router.use(authenticate);
router.post("/", createWarehouse);
router.get("/", getWarehouses);
router.get("/:id", getWarehouseById);
router.put("/:id", updateWarehouse);
router.patch("/:id", updateWarehouse);
router.patch("/:id/status", updateWarehouseStatus);
router.delete("/:id", deleteWarehouse);

export default router;