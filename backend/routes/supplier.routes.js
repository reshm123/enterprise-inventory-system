import express from "express";
import supplierController from "../controllers/supplierController.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";
import validate from "../middleware/validate.js";
import {
  createSupplierSchema,
  updateSupplierSchema,
} from "../validators/supplierValidator.js";

const router = express.Router();


router.post(
  "/",
  authenticate,
  authorizeRoles("Admin", "Procurement Manager"),
  validate(createSupplierSchema),
  supplierController.create
);


router.get(
  "/",
  authenticate,
  authorizeRoles(
    "Admin",
    "Procurement Manager",
    "Warehouse Manager",
    "Warehouse Staff",
    "Inventory Auditor"
  ),
  supplierController.getAll
);


router.get(
  "/:id",
  authenticate,
  authorizeRoles(
    "Admin",
    "Procurement Manager",
    "Warehouse Manager",
    "Warehouse Staff",
    "Inventory Auditor"
  ),
  supplierController.getById
);


router.put(
  "/:id",
  authenticate,
  authorizeRoles("Admin", "Procurement Manager"),
  validate(updateSupplierSchema),
  supplierController.update
);


router.delete(
  "/:id",
  authenticate,
  authorizeRoles("Admin", "Procurement Manager"),
  supplierController.delete
);


export default router;