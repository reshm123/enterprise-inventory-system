import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import { listUsers, updateUserRole } from "../controllers/user.controller.js";

const router = express.Router();

router.use(authenticate);
router.get("/", authorizeRoles("Admin"), listUsers);
router.patch("/:id/role", authorizeRoles("Admin"), updateUserRole);

export default router;
