import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

import { createProduct, getProduct, getProducts, updateProduct, deleteProduct } from "../controllers/product.controller.js";
const router = express.Router();
const productReadRoles = [
  "Admin",
  "Procurement Manager",
  "Warehouse Manager",
  "Warehouse Staff",
  "Inventory Auditor"
];

router.use(authenticate);

router.post("/", authorizeRoles("Admin", "Procurement Manager"), createProduct);
router.get("/", authorizeRoles(...productReadRoles), getProducts);
router.get("/:id", authorizeRoles(...productReadRoles), getProduct);
router.put("/:id", authorizeRoles("Admin", "Procurement Manager"), updateProduct);
router.delete("/:id", authorizeRoles("Admin", "Procurement Manager"), deleteProduct);




export default router