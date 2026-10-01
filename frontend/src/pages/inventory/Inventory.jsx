import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchInventory,
  fetchLowStockInventory,
} from "../../redux/slices/inventorySlice";

const Inventory = () => {
  const dispatch = useDispatch();

  const {
    items,
    pagination,
    loading,
    error,
  } = useSelector((state) => state.inventory);

  const [filters, setFilters] = useState({
    search: "",
    warehouse: "",
    category: "",
    stockStatus: "",
    lowStock: false,
    outOfStock: false,
    sortBy: "updatedAt",
    sortOrder: "desc",
  });

  const [page, setPage] = useState(1);

  const limit = 10;

  const loadInventory = (nextPage = page, nextFilters = filters) => {
    const params = {
      page: nextPage,
      limit,
    };

    if (nextFilters.search) {
      params.search = nextFilters.search;
    }

    if (nextFilters.warehouse) {
      params.warehouse = nextFilters.warehouse;
    }

    if (nextFilters.category) {
      params.category = nextFilters.category;
    }

    if (nextFilters.stockStatus) {
      params.stockStatus = nextFilters.stockStatus;
    }

    if (nextFilters.lowStock) {
      params.lowStock = true;
    }

    if (nextFilters.outOfStock) {
      params.outOfStock = true;
    }

    if (nextFilters.sortBy) {
      params.sortBy = nextFilters.sortBy;
    }

    if (nextFilters.sortOrder) {
      params.sortOrder = nextFilters.sortOrder;
    }

    dispatch(fetchInventory(params));
  };

  useEffect(() => {
    loadInventory(page, filters);
  }, [dispatch, page, filters]);

  const handleFilterChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    loadInventory(1, filters);
  };

  const handleReset = () => {
    const defaultFilters = {
      search: "",
      warehouse: "",
      category: "",
      stockStatus: "",
      lowStock: false,
      outOfStock: false,
      sortBy: "updatedAt",
      sortOrder: "desc",
    };

    setFilters(defaultFilters);
    setPage(1);
    dispatch(
      fetchInventory({
        page: 1,
        limit,
        sortBy: "updatedAt",
        sortOrder: "desc",
      })
    );
  };

  const handleLowStock = () => {
    dispatch(fetchLowStockInventory());
  };

  const getProductName = (item) => {
    return item.productId?.name || item.productName || "-";
  };

  const getSku = (item) => {
    return (
      item.productId?.sku ||
      item.sku ||
      "-"
    );
  };

  const getWarehouseName = (item) => {
    return (
      item.warehouseId?.name ||
      item.warehouseName ||
      "-"
    );
  };

  const getStockClass = (item) => {
    const available =
      Number(item.availableQuantity || 0);

    const reorderLevel =
      Number(item.reorderLevel || 0);

    if (available === 0) {
      return "stock-danger";
    }

    if (available <= reorderLevel) {
      return "stock-warning";
    }

    return "stock-success";
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Inventory</h1>
          <p>
            Manage inventory stock across warehouses.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-warning"
          onClick={handleLowStock}
        >
          Low Stock
        </button>
      </div>

      <div className="card">
        <form onSubmit={handleSearch}>
          <div className="filter-grid">

            <div className="form-group">
              <label>Search</label>

              <input
                type="text"
                name="search"
                value={filters.search}
                onChange={handleFilterChange}
                placeholder="Product name or SKU"
              />
            </div>

            <div className="form-group">
              <label>Warehouse</label>

              <input
                type="text"
                name="warehouse"
                value={filters.warehouse}
                onChange={handleFilterChange}
                placeholder="Warehouse ID / Code"
              />
            </div>

            <div className="form-group">
              <label>Category</label>

              <input
                type="text"
                name="category"
                value={filters.category}
                onChange={handleFilterChange}
                placeholder="Category"
              />
            </div>

            <div className="form-group">
              <label>Stock Status</label>

              <select
                name="stockStatus"
                value={filters.stockStatus}
                onChange={handleFilterChange}
              >
                <option value="">
                  All
                </option>

                <option value="in-stock">
                  In Stock
                </option>

                <option value="low-stock">
                  Low Stock
                </option>

                <option value="out-of-stock">
                  Out of Stock
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Sort By</label>

              <select
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
              >
                <option value="availableQuantity">
                  Available Quantity
                </option>

                <option value="quantity">
                  Quantity
                </option>

                <option value="updatedAt">
                  Updated Date
                </option>

                <option value="productName">
                  Product Name
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>Order</label>

              <select
                name="sortOrder"
                value={filters.sortOrder}
                onChange={handleFilterChange}
              >
                <option value="asc">
                  Ascending
                </option>

                <option value="desc">
                  Descending
                </option>
              </select>
            </div>
          </div>

          <div className="checkbox-row">

            <label>
              <input
                type="checkbox"
                name="lowStock"
                checked={filters.lowStock}
                onChange={handleFilterChange}
              />

              Low Stock Only
            </label>

            <label>
              <input
                type="checkbox"
                name="outOfStock"
                checked={filters.outOfStock}
                onChange={handleFilterChange}
              />

              Out of Stock Only
            </label>
          </div>

          <div className="button-row">
            <button
              type="submit"
              className="btn btn-primary"
            >
              Search
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="card">
        <div className="table-header">
          <h2>Inventory List</h2>

          <span>
            Total: {pagination.total}
          </span>
        </div>

        {loading ? (
          <div className="loading">
            Loading inventory...
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            No inventory records found.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Warehouse</th>
                  <th>Quantity</th>
                  <th>Reserved</th>
                  <th>Available</th>
                  <th>Reorder Level</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {getProductName(item)}
                    </td>

                    <td>
                      {getSku(item)}
                    </td>

                    <td>
                      {getWarehouseName(item)}
                    </td>

                    <td>
                      {item.quantity ?? 0}
                    </td>

                    <td>
                      {item.reservedQuantity ?? 0}
                    </td>

                    <td>
                      <strong>
                        {item.availableQuantity ?? 0}
                      </strong>
                    </td>

                    <td>
                      {item.reorderLevel ?? 0}
                    </td>

                    <td>
                      <span
                        className={`stock-badge ${getStockClass(
                          item
                        )}`}
                      >
                        {Number(
                          item.availableQuantity || 0
                        ) === 0
                          ? "Out of Stock"
                          : Number(
                              item.availableQuantity || 0
                            ) <=
                            Number(
                              item.reorderLevel || 0
                            )
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pagination">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={page <= 1}
            onClick={() =>
              setPage((previous) => previous - 1)
            }
          >
            Previous
          </button>

          <span>
            Page {pagination.page || page} of{" "}
            {pagination.totalPages || 1}
          </span>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={
              page >=
              (pagination.totalPages || 1)
            }
            onClick={() =>
              setPage((previous) => previous + 1)
            }
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default Inventory;