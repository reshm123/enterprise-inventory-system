import { NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import { logoutUser } from "../redux/slices/authSlice";

const Sidebar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector(
    (state) => state.auth
  );

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate("/login");
  };

  return (
    <aside className="sidebar">

      <div className="sidebar-logo">
        <h2>Enterprise IMS</h2>
      </div>

      <div className="user-info">
        <strong>{user?.name}</strong>
        <span>{user?.role}</span>
      </div>

      <nav>

        <NavLink to="/dashboard">
          Dashboard
        </NavLink>

        <NavLink to="/products">
          Products
        </NavLink>

        <NavLink to="/inventory">
          Inventory
        </NavLink>

        <NavLink to="/suppliers">
          Suppliers
        </NavLink>

        <NavLink to="/warehouses">
          Warehouses
        </NavLink>

        <NavLink to="/purchase-orders">
          Purchase Orders
        </NavLink>

        <NavLink to="/transfers">
          Stock Transfers
        </NavLink>

        <NavLink to="/audit">
          Audit History
        </NavLink>

        {user?.role === "Admin" && (
          <NavLink to="/users">
            User Management
          </NavLink>
        )}

      </nav>

      <button
        className="logout-button"
        onClick={handleLogout}
      >
        Logout
      </button>

    </aside>
  );
};

export default Sidebar;