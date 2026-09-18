import supplierService from "../services/supplierService.js";
import { successResponse } from "../utils/response.js";

class SupplierController {
  async create(req, res, next) {
    try {
      const supplier =
        await supplierService.createSupplier(req.body);

      return successResponse(res, 201, "Supplier created successfully", supplier);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const suppliers =
        await supplierService.getSuppliers(req.query);

      return successResponse(res, 200, "Suppliers retrieved successfully", suppliers);
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const supplier =
        await supplierService.getSupplierById(
          req.params.id
        );

      return successResponse(res, 200, "Supplier retrieved successfully", supplier);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const supplier =
        await supplierService.updateSupplier(
          req.params.id,
          req.body
        );

      return successResponse(res, 200, "Supplier updated successfully", supplier);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await supplierService.deleteSupplier(
        req.params.id
      );

      return successResponse(res, 200, "Supplier deleted successfully");
    } catch (error) {
      next(error);
    }
  }
}

export default new SupplierController();