import express from "express"
import authRoutes from "./routes/auth.routes.js";
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
app.use(errorHandler)
export default app;