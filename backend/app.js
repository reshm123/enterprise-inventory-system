import express from "express"
import authRoutes from "./routes/auth.routes.js";
import productRoutes  from "./routes/product.routes.js";
import supplierRoutes  from "./routes/supplier.routes.js";
import warehouseRoutes from "./routes/warehouse.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app=express();

app.use(express.json());
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy"
  });
});
app.use("/api/auth",authRoutes)
app.use("/api/product",productRoutes)
app.use("/api/supplier",supplierRoutes)
app.use("/api/warehouse", warehouseRoutes)
app.use(errorHandler)
export default app;