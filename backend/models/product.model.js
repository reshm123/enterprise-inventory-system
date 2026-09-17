import mongoose from "mongoose";

const productschema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    description: {
      type: String,
      trim: true
    },

    category: {
      type: String,
      trim: true,
      required: true
    },

    brand: {
      type: String,
      trim: true
    },

    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },

    reorderLevel: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active"
    }
  },
  {
    timestamps: true
  }
);
productschema.index({name:1});
productschema.index({category:1});



const Product = mongoose.model("Product", productschema);

export default Product;