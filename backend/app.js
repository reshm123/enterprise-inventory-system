import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import productRoutes from "./routes/product.routes.js";
import supplierRoutes from "./routes/supplier.routes.js";
import warehouseRoutes from "./routes/warehouse.routes.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import stockMovementRoutes from "./routes/stockMovement.routes.js";
import purchaseOrderRoutes from "./routes/purchaseOrder.routes.js";
import stockTransferRoutes from "./routes/stockTransfer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

const allowedOrigins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  ...(process.env.CLIENT_URL || "").split(",").map((origin) => origin.trim()).filter(Boolean)
]);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }

    const error = new Error("Origin is not allowed by CORS");
    error.statusCode = 403;
    error.code = "CORS_ORIGIN_DENIED";
    return callback(error);
  },
  credentials: true
}));

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/product", productRoutes);
app.use("/api/supplier", supplierRoutes);
app.use("/api/warehouse", warehouseRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/stock-movements", stockMovementRoutes);
app.use("/api/purchase-orders", purchaseOrderRoutes);
app.use("/api/stock-transfers", stockTransferRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use(errorHandler);

export default app;