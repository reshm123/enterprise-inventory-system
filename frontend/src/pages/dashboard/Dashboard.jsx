import { useSelector } from "react-redux";

const Dashboard = () => {
  const { user } = useSelector(
    (state) => state.auth
  );

  return (
    <div className="dashboard">

      <div className="page-header">
        <h1>Dashboard</h1>

        <p>
          Welcome, {user?.name}
        </p>
      </div>

      <div className="dashboard-cards">

        <div className="dashboard-card">
          <h3>Total Products</h3>
          <p>0</p>
        </div>

        <div className="dashboard-card">
          <h3>Total Warehouses</h3>
          <p>0</p>
        </div>

        <div className="dashboard-card">
          <h3>Total Suppliers</h3>
          <p>0</p>
        </div>

        <div className="dashboard-card">
          <h3>Total Inventory</h3>
          <p>0</p>
        </div>

      </div>

      <div className="dashboard-section">

        <h2>Inventory Management System</h2>

        <p>
          Manage products, inventory, purchase orders,
          stock transfers and warehouses from one place.
        </p>

      </div>

    </div>
  );
};

export default Dashboard;