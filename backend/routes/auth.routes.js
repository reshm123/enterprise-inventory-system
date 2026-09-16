import express from "express"
import {register , login , me , logoutuser} from "../controllers/auth.controller.js"
import {authenticate} from "../middleware/auth.middleware.js"

const router=express.Router();
router.post("/register" ,register);
router.post("/login" ,login);
router.get("/me",authenticate ,me);
router.post("/logout",authenticate ,logoutuser);
export default router;