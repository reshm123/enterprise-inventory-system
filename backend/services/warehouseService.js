import {
  createWarehouse,
  findWarehouseByCode,
  findWarehouseById,
  findAllWarehouses,
  updateWarehouse,
  updateWarehouseStatus,
  deleteWarehouse
} from "../repositories/warehouseRepository.js";
import {
  createWarehouseSchema,
  updateWarehouseSchema
} from "../validators/warehouseValidator.js";

const validate = (schema, data) => {
  const { error, value } = schema.validate(data);
  if (error) throw new Error(error.details[0].message);
  return value;
};

export const createWarehouseService = async (data) => {
  const warehouseData = validate(createWarehouseSchema, data);
  if (await findWarehouseByCode(warehouseData.code)) {
    throw new Error("Warehouse code already exists");
  }
  return createWarehouse(warehouseData);
};

export const getWarehouseService = async (warehouseId) => {
  const warehouse = await findWarehouseById(warehouseId);
  if (!warehouse) throw new Error("Warehouse not found");
  return warehouse;
};

export const getWarehousesService = async (query) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);
  return findAllWarehouses({ search: query.search, status: query.status, page, limit });
};

export const updateWarehouseService = async (warehouseId, data) => {
  const warehouseData = validate(updateWarehouseSchema, data);
  const warehouse = await findWarehouseById(warehouseId);
  if (!warehouse) throw new Error("Warehouse not found");

  if (warehouseData.code) {
    const duplicate = await findWarehouseByCode(warehouseData.code);
    if (duplicate && duplicate._id.toString() !== warehouseId) {
      throw new Error("Warehouse code already exists");
    }
  }
  return updateWarehouse(warehouseId, warehouseData);
};

export const updateWarehouseStatusService = async (warehouseId, status) => {
  if (!["ACTIVE", "INACTIVE"].includes(status)) {
    throw new Error("Status must be ACTIVE or INACTIVE");
  }
  const warehouse = await updateWarehouseStatus(warehouseId, status);
  if (!warehouse) throw new Error("Warehouse not found");
  return warehouse;
};

export const deleteWarehouseService = async (warehouseId) => {
  if (!(await findWarehouseById(warehouseId))) throw new Error("Warehouse not found");
  return deleteWarehouse(warehouseId);
};