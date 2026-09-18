
import mongoose from "mongoose";
const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100
    },

    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 20
    },

    location: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250
    },

    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  {
    timestamps: true
  }
);

warehouseSchema.index({ name: 1 });
warehouseSchema.index({ status: 1 });

const Warehouse = mongoose.model("Warehouse", warehouseSchema);

export default Warehouse;