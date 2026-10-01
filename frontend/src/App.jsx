import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/dashboard/Dashboard";

import ProtectedRoute from "./routes/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";
import Products from "./pages/products/Products";
import Inventory from "./pages/inventory/Inventory";
import Suppliers from "./pages/suppliers/Suppliers";
import Warehouses from "./pages/warehouses/Warehouses";
import PurchaseOrders from "./pages/purchaseOrders/PurchaseOrders";
import Transfers from "./pages/transfers/Transfers";
import AuditHistory from "./pages/audit/AuditHistory";
import UserManagement from "./pages/users/UserManagement";

const App = () => {
  return (
    <BrowserRouter>

      <Routes>

        {/* Public Route */}

        <Route
          path="/login"
          element={<Login />}
        />
        <Route
          path="/register"
          element={<Register />}
        />

        {/* Protected Routes */}

        <Route element={<ProtectedRoute />}>

          <Route element={<MainLayout />}>

            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Future routes */}

             <Route path="/products" element={<Products />} />

           
          <Route
            path="/inventory"
            element={<Inventory />}
          />

          <Route
            path="/suppliers"
            element={<Suppliers />}
          />

            <Route
              path="/warehouses"
              element={<Warehouses />}
            />

            <Route
              path="/purchase-orders"
              element={<PurchaseOrders />}
            />

            <Route
              path="/transfers"
              element={<Transfers />}
            />

            <Route
              path="/audit"
              element={<AuditHistory />}
            />

            <Route
              path="/users"
              element={<UserManagement />}
            />

          </Route>

        </Route>

        {/* Default */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
};

export default App;