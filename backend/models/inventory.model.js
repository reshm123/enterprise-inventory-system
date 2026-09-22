import mongoose from "mongoose";

const inventorySchema = new mongoose.Schema(
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
    quantity: {
      type: Number,
      default: 0,
      min: 0
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0
    },
    reorderLevel: {
      type: Number,
      default: 0,
      min: 0
    },
    version: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

inventorySchema.index({ productId: 1, warehouseId: 1 }, { unique: true });
inventorySchema.index({ warehouseId: 1, availableQuantity: 1 });
inventorySchema.index({ availableQuantity: 1, reorderLevel: 1 });

const Inventory = mongoose.model("Inventory", inventorySchema);

export default Inventory;
