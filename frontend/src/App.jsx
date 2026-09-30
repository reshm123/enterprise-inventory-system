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
              element={
                <h1>Warehouses Coming Soon</h1>
              }
            />

            <Route
              path="/purchase-orders"
              element={
                <h1>Purchase Orders Coming Soon</h1>
              }
            />

            <Route
              path="/transfers"
              element={
                <h1>Stock Transfers Coming Soon</h1>
              }
            />

            <Route
              path="/audit"
              element={
                <h1>Audit History Coming Soon</h1>
              }
            />

            <Route
              path="/users"
              element={
                <h1>User Management Coming Soon</h1>
              }
            />

          </Route>

        </Route>

        {/* Default */}

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