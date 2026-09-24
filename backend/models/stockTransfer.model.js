import mongoose from "mongoose";

const stockTransferItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  },
  { _id: true }
);

const stockTransferSchema = new mongoose.Schema(
  {
    transferNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true
    },
    items: {
      type: [stockTransferItemSchema],
      required: true,
      validate: { validator: (items) => items.length > 0, message: "At least one transfer item is required" }
    },
    status: {
      type: String,
      enum: ["Draft", "Requested", "Approved", "In Transit", "Received", "Cancelled"],
      default: "Draft"
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null
    }
  },
  { timestamps: true }
);

stockTransferSchema.index({ fromWarehouse: 1, status: 1 });
stockTransferSchema.index({ toWarehouse: 1, status: 1 });

export default mongoose.model("StockTransfer", stockTransferSchema);