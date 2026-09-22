import mongoose from "mongoose";

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    type: {
      type: String,
      enum: [
        "PURCHASE_RECEIPT",
        "STOCK_TRANSFER_OUT",
        "STOCK_TRANSFER_IN",
        "STOCK_ADJUSTMENT",
        "RETURN",
        "DAMAGE",
        "CORRECTION"
      ],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    reference: {
      type: String,
      trim: true,
      default: ""
    },
    reason: {
      type: String,
      trim: true,
      default: ""
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    }
  },
  {
    timestamps: true
  }
);

stockMovementSchema.index({ productId: 1, warehouseId: 1, createdAt: -1 });
stockMovementSchema.index({ warehouseId: 1, createdAt: -1 });

const StockMovement = mongoose.model("StockMovement", stockMovementSchema);

export default StockMovement;
