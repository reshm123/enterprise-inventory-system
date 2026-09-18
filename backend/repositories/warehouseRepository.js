import Warehouse from "../models/warehouse.js";

export const createWarehouse = async (warehouseData) => Warehouse.create(warehouseData);

export const findWarehouseByCode = async (code) =>
  Warehouse.findOne({ code: code.toUpperCase() });

export const findWarehouseById = async (warehouseId) =>
  Warehouse.findById(warehouseId).populate("managerId", "name email role");

export const findAllWarehouses = async ({ search, status, page, limit }) => {
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { code: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } }
    ];
  }
  if (status) filter.status = status.toUpperCase();

  const skip = (page - 1) * limit;
  const [warehouses, total] = await Promise.all([
    Warehouse.find(filter)
      .populate("managerId", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Warehouse.countDocuments(filter)
  ]);

  return {
    items: warehouses,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
  };
};

export const updateWarehouse = async (warehouseId, warehouseData) =>
  Warehouse.findByIdAndUpdate(warehouseId, warehouseData, {
    new: true,
    runValidators: true
  }).populate("managerId", "name email role");

export const updateWarehouseStatus = async (warehouseId, status) =>
  Warehouse.findByIdAndUpdate(warehouseId, { status }, {
    new: true,
    runValidators: true
  }).populate("managerId", "name email role");

export const deleteWarehouse = async (warehouseId) =>
  Warehouse.findByIdAndDelete(warehouseId);