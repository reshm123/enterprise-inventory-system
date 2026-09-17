import Product from "../models/product.model.js";

export const createProduct = async (productData) => {
  return Product.create(productData);
};

export const findProductBySku = async (sku) => {
  return Product.findOne({
    sku: sku.toUpperCase()
  });
};

export const findProductById = async (productId) => {
  return Product.findById(productId);
};

export const findAllProducts = async ({
  search,
  category,
  status,
  page,
  limit
}) => {
  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { brand: { $regex: search, $options: "i" } }
    ];
  }

  if (category) {
    filter.category = category;
  }

  if (status) {
    filter.status = status;
  }

  const skip = (page - 1) * limit;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    Product.countDocuments(filter)
  ]);

  return {
    products,
    total
  };
};

export const productUpdate = async (productId, productData) => {
  return Product.findByIdAndUpdate(
    productId,
    productData,
    { new: true }
  );
};

export const deleteProduct = async (productId) => {
  return Product.findByIdAndDelete(productId);
};