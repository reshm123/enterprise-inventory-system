import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { listAuditLogs } from "../controllers/auditLog.controller.js";

const router = express.Router();
const readRoles = ["Admin", "Procurement Manager", "Warehouse Manager", "Warehouse Staff", "Inventory Auditor"];

router.use(authenticate);
router.get("/", authorizeRoles(...readRoles), listAuditLogs);

export default router;