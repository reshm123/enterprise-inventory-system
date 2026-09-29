import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { fetchDashboardSummary } from "../../redux/slices/dashboardSlice";

const Dashboard = () => {
  const dispatch = useDispatch();

  const { data, loading, error } = useSelector(
    (state) => state.dashboard
  );

  useEffect(() => {
    dispatch(fetchDashboardSummary());
  }, [dispatch]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <h1>Dashboard</h1>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <h1>Dashboard</h1>

        <div className="error-message">
          {error}
        </div>

        <button onClick={() => dispatch(fetchDashboardSummary())}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="dashboard-container">
        <h1>Dashboard</h1>
        <p>No dashboard data available.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">

      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Enterprise Inventory Management Overview</p>
        </div>

        <button
          className="refresh-button"
          onClick={() => dispatch(fetchDashboardSummary())}
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-cards">

        <div className="dashboard-card">
          <h3>Total Products</h3>
          <p>{data.totalProducts ?? 0}</p>
        </div>

        <div className="dashboard-card">
          <h3>Total Warehouses</h3>
          <p>{data.totalWarehouses ?? 0}</p>
        </div>

        <div className="dashboard-card">
          <h3>Total Suppliers</h3>
          <p>{data.totalSuppliers ?? 0}</p>
        </div>

        <div className="dashboard-card">
          <h3>Inventory Units</h3>
          <p>{data.totalInventoryUnits ?? 0}</p>
        </div>

        <div className="dashboard-card warning">
          <h3>Low Stock Products</h3>
          <p>{data.lowStockProducts ?? 0}</p>
        </div>

        <div className="dashboard-card danger">
          <h3>Out of Stock</h3>
          <p>{data.outOfStockProducts ?? 0}</p>
        </div>

        <div className="dashboard-card">
          <h3>Pending Purchase Orders</h3>
          <p>{data.pendingPurchaseOrders ?? 0}</p>
        </div>

        <div className="dashboard-card">
          <h3>Pending Transfers</h3>
          <p>{data.pendingTransfers ?? 0}</p>
        </div>

        <div className="dashboard-card">
          <h3>Total Purchase Value</h3>
          <p>
            ₹{Number(data.totalPurchaseValue ?? 0).toLocaleString("en-IN")}
          </p>
        </div>

      </div>

      {/* Inventory By Warehouse */}
      <div className="dashboard-section">

        <h2>Inventory by Warehouse</h2>

        {data.inventoryByWarehouse?.length > 0 ? (
          <table className="dashboard-table">

            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Total Units</th>
              </tr>
            </thead>

            <tbody>
              {data.inventoryByWarehouse.map((warehouse, index) => (
                <tr key={warehouse._id || index}>
                  <td>
                    {warehouse.warehouseName ||
                      warehouse.name ||
                      warehouse._id}
                  </td>

                  <td>
                    {warehouse.totalUnits ??
                      warehouse.totalQuantity ??
                      warehouse.quantity ??
                      0}
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        ) : (
          <p>No warehouse inventory data available.</p>
        )}

      </div>

      {/* Purchase Order Summary */}
      <div className="dashboard-section">

        <h2>Purchase Order Summary</h2>

        <table className="dashboard-table">

          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>

          <tbody>
            {Object.entries(data.purchaseOrderSummary || {}).map(
              ([status, count]) => (
                <tr key={status}>
                  <td>{status}</td>
                  <td>{count}</td>
                </tr>
              )
            )}
          </tbody>

        </table>

      </div>

    </div>
  );
};

export default Dashboard;