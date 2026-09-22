import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import {
  listStockMovements,
  getStockMovement
} from "../controllers/stockMovement.controller.js";

const router = express.Router();
const readRoles = [
  "Admin",
  "Procurement Manager",
  "Warehouse Manager",
  "Warehouse Staff",
  "Inventory Auditor"
];

router.use(authenticate);
router.get("/", authorizeRoles(...readRoles), listStockMovements);
router.get("/:id", authorizeRoles(...readRoles), getStockMovement);

export default router;
