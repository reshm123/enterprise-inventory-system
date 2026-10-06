import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";

import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../../redux/slices/productSlice";

const initialForm = {
  sku: "",
  name: "",
  description: "",
  category: "",
  brand: "",
  unitPrice: "",
  reorderLevel: "",
  status: "Active",
};

const Products = () => {
  const dispatch = useDispatch();

  // Redux state
  const { products, loading, error } = useSelector(
    (state) => state.products
  );

  // Always make sure products is an array
  const productList = Array.isArray(products) ? products : [];

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch products when page loads
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  // Handle input changes
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Reset form
  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  // Create / Update product
  const handleSubmit = async (event) => {
    event.preventDefault();

    const productData = {
      ...form,
      sku: form.sku.trim().toUpperCase(),
      name: form.name.trim(),
      category: form.category.trim(),
      brand: form.brand.trim(),
      description: form.description.trim(),
      unitPrice: Number(form.unitPrice),
      reorderLevel: Number(form.reorderLevel),
    };

    if (editingId) {
      const result = await dispatch(
        updateProduct({
          id: editingId,
          productData,
        })
      );

      if (updateProduct.fulfilled.match(result)) {
        resetForm();
      }
    } else {
      const result = await dispatch(createProduct(productData));

      if (createProduct.fulfilled.match(result)) {
        resetForm();
      }
    }
  };

  // Edit product
  const handleEdit = (product) => {
    setEditingId(product._id);

    setForm({
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      category: product.category || "",
      brand: product.brand || "",
      unitPrice: product.unitPrice ?? "",
      reorderLevel: product.reorderLevel ?? "",
      status: product.status || "Active",
    });

    setShowForm(true);
  };

  // Delete product
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) {
      return;
    }

    await dispatch(deleteProduct(id));
  };

  // Search / filter products
  const searchText = search.trim().toLowerCase();

  const filteredProducts = productList.filter((product) => {
    const name = String(product?.name || "").toLowerCase();
    const sku = String(product?.sku || "").toLowerCase();
    const category = String(product?.category || "").toLowerCase();
    const brand = String(product?.brand || "").toLowerCase();

    return (
      name.includes(searchText) ||
      sku.includes(searchText) ||
      category.includes(searchText) ||
      brand.includes(searchText)
    );
  });

  return (
    <div className="products-container">
      {/* Header */}
      <div className="products-header">
        <div>
          <h1>Products</h1>
          <p>Manage products and inventory configuration</p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Product
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="product-toolbar">
        <input
          type="text"
          placeholder="Search by SKU, name, category or brand..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      {/* Product Form */}
      {showForm && (
        <div className="product-form-card">
          <h2>
            {editingId ? "Edit Product" : "Add Product"}
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* SKU */}
              <div className="form-group">
                <label htmlFor="sku">SKU</label>

                <input
                  id="sku"
                  type="text"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  required
                  placeholder="SKU-001"
                />
              </div>

              {/* Product Name */}
              <div className="form-group">
                <label htmlFor="name">Product Name</label>

                <input
                  id="name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="Product name"
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label htmlFor="category">Category</label>

                <input
                  id="category"
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Electronics"
                />
              </div>

              {/* Brand */}
              <div className="form-group">
                <label htmlFor="brand">Brand</label>

                <input
                  id="brand"
                  type="text"
                  name="brand"
                  value={form.brand}
                  onChange={handleChange}
                  placeholder="Brand name"
                />
              </div>

              {/* Unit Price */}
              <div className="form-group">
                <label htmlFor="unitPrice">Unit Price</label>

                <input
                  id="unitPrice"
                  type="number"
                  name="unitPrice"
                  value={form.unitPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  placeholder="1000"
                />
              </div>

              {/* Reorder Level */}
              <div className="form-group">
                <label htmlFor="reorderLevel">
                  Reorder Level
                </label>

                <input
                  id="reorderLevel"
                  type="number"
                  name="reorderLevel"
                  value={form.reorderLevel}
                  onChange={handleChange}
                  min="0"
                  required
                  placeholder="10"
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label htmlFor="status">Status</label>

                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Description */}
              <div className="form-group full-width">
                <label htmlFor="description">
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Product description"
                  rows="3"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="submit"
                className="primary-button"
                disabled={loading}
              >
                {loading
                  ? "Saving..."
                  : editingId
                  ? "Update Product"
                  : "Create Product"}
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Product Table */}
      <div className="products-table-card">
        {loading && productList.length === 0 ? (
          <p className="loading-text">
            Loading products...
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="empty-text">
            {search
              ? "No products match your search."
              : "No products found."}
          </p>
        ) : (
          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Unit Price</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product._id}>
                    <td>
                      <strong>{product.sku || "-"}</strong>
                    </td>

                    <td>{product.name || "-"}</td>

                    <td>
                      {product.category || "-"}
                    </td>

                    <td>
                      {product.brand || "-"}
                    </td>

                    <td>
                      ₹
                      {Number(
                        product.unitPrice || 0
                      ).toLocaleString("en-IN")}
                    </td>

                    <td>
                      {product.reorderLevel ?? 0}
                    </td>

                    <td>
                      <span
                        className={
                          product.status === "Active"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {product.status || "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="action-buttons">
                        <Link to={`/products/${product._id}`} className="btn btn-sm btn-secondary">
                          View
                        </Link>

                        <button
                          type="button"
                          className="edit-button"
                          onClick={() =>
                            handleEdit(product)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() =>
                            handleDelete(product._id)
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Products;