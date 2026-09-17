import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";

import {createProduct, getProduct , getProducts, updateProduct , deleteProduct} from  "../controllers/product.controller.js";
const router=express.Router();
router.use(authenticate);

router.post("/",createProduct);
router.get("/",getProducts);
router.get("/:id",getProduct);
router.put("/:id",updateProduct);
router.delete("/:id",deleteProduct);




export default router