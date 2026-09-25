import express from 'express';
import {getDashboardSummary} from '../controllers/dashboard.controller.js';
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

const router = express.Router();

router.use(authenticate);
router.get(
  "/summary",
  authorizeRoles(
    "Admin",
    "Procurement Manager",
    "Warehouse Manager",
    "Warehouse Staff",
    "Inventory Auditor"
  ),
  getDashboardSummary
);

export default router;