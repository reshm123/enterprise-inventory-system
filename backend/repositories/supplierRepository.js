import Supplier from "../models/Supplier.js";

class SupplierRepository {
  async create(data) {
    return Supplier.create(data);
  }

  async findAll({ search, status, page, limit }) {
    const filter = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { contactPerson: { $regex: search, $options: "i" } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;
    const [suppliers, total] = await Promise.all([
      Supplier.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Supplier.countDocuments(filter)
    ]);

    return {
      items: suppliers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async findById(id) {
    return Supplier.findById(id);
  }

  async findByEmail(email) {
    return Supplier.findOne({
      email: email.toLowerCase(),
    });
  }

  async updateById(id, data) {
    return Supplier.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );
  }

  async deleteById(id) {
    return Supplier.findByIdAndDelete(id);
  }
}

export default new SupplierRepository();