import mongoose from "mongoose";
import Inventory from "../models/inventory.model.js";
import StockMovement from "../models/stockMovement.model.js";

export const createInventoryEntry = async (data) => Inventory.create(data);

export const findInventoryByProductAndWarehouse = async (productId, warehouseId) =>
  Inventory.findOne({ productId, warehouseId });

export const findInventoryById = async (inventoryId) =>
  Inventory.findById(inventoryId).populate("productId", "sku name category").populate("warehouseId", "name code location");

export const updateInventoryEntry = async (inventoryId, updateData) =>
  Inventory.findByIdAndUpdate(inventoryId, updateData, { new: true });

export const listInventoryRecords = async ({ search, warehouse, category, lowStock, outOfStock, sortBy = "updatedAt", sortOrder = "desc", page = 1, limit = 20 }) => {
  const query = {};

  if (warehouse) {
    query.warehouseId = warehouse;
  }

  if (search) {
    const productSearch = await mongoose.model("Product").find({
      $or: [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } }
      ]
    }).select("_id");

    query.productId = { $in: productSearch.map((product) => product._id) };
  }

  if (category) {
    const categoryProducts = await mongoose.model("Product").find({ category }).select("_id");
    query.productId = { $in: categoryProducts.map((product) => product._id) };
  }

  if (lowStock && outOfStock) {
    query.$or = [
      { $expr: { $lte: ["$availableQuantity", "$reorderLevel"] } },
      { availableQuantity: 0 }
    ];
  } else if (lowStock) {
    query.$expr = { $lte: ["$availableQuantity", "$reorderLevel"] };
  } else if (outOfStock) {
    query.availableQuantity = 0;
  }

  const sortMapping = {
    updatedAt: "updatedAt",
    quantity: "quantity",
    availableQuantity: "availableQuantity",
    productName: "productId",
    reorderLevel: "reorderLevel"
  };

  const sortField = sortMapping[sortBy] || "updatedAt";
  const sortDirection = sortOrder === "asc" ? 1 : -1;
  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Inventory.find(query)
      .populate("productId", "sku name category brand")
      .populate("warehouseId", "name code location")
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(Number(limit)),
    Inventory.countDocuments(query)
  ]);

  return { items, total };
};

export const createStockMovementEntry = async (data) => StockMovement.create(data);

export const getLowStockRecords = async () => {
  return Inventory.find({ $expr: { $lte: ["$availableQuantity", "$reorderLevel"] } })
    .populate("productId", "sku name category")
    .populate("warehouseId", "name code location");
};
