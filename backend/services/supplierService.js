import mongoose from "mongoose";
import supplierRepository from "../repositories/supplierRepository.js";

class SupplierService {
  async createSupplier(data) {
    const existingSupplier =
      await supplierRepository.findByEmail(data.email);

    if (existingSupplier) {
      const error = new Error(
        "Supplier with this email already exists"
      );

      error.statusCode = 409;
      error.code = "DUPLICATE_SUPPLIER_EMAIL";

      throw error;
    }

    return supplierRepository.create(data);
  }

  async getSuppliers(query = {}) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 100);

    return supplierRepository.findAll({
      search: query.search,
      status: query.status,
      page,
      limit
    });
  }

  async getSupplierById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid supplier ID");

      error.statusCode = 400;
      error.code = "INVALID_SUPPLIER_ID";

      throw error;
    }

    const supplier = await supplierRepository.findById(id);

    if (!supplier) {
      const error = new Error("Supplier not found");

      error.statusCode = 404;
      error.code = "SUPPLIER_NOT_FOUND";

      throw error;
    }

    return supplier;
  }

  async updateSupplier(id, data) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid supplier ID");

      error.statusCode = 400;
      error.code = "INVALID_SUPPLIER_ID";

      throw error;
    }

    const supplier =
      await supplierRepository.findById(id);

    if (!supplier) {
      const error = new Error("Supplier not found");

      error.statusCode = 404;
      error.code = "SUPPLIER_NOT_FOUND";

      throw error;
    }

    if (data.email) {
      const existingSupplier =
        await supplierRepository.findByEmail(data.email);

      if (
        existingSupplier &&
        existingSupplier._id.toString() !== id
      ) {
        const error = new Error(
          "Another supplier already uses this email"
        );

        error.statusCode = 409;
        error.code = "DUPLICATE_SUPPLIER_EMAIL";

        throw error;
      }
    }

    return supplierRepository.updateById(id, data);
  }

  async deleteSupplier(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid supplier ID");

      error.statusCode = 400;
      error.code = "INVALID_SUPPLIER_ID";

      throw error;
    }

    const supplier =
      await supplierRepository.findById(id);

    if (!supplier) {
      const error = new Error("Supplier not found");

      error.statusCode = 404;
      error.code = "SUPPLIER_NOT_FOUND";

      throw error;
    }

  

    return supplierRepository.deleteById(id);
  }
}

export default new SupplierService();