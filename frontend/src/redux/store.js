import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import dashboardReducer from "./slices/dashboardSlice";
import productReducer from "./slices/productSlice";
import inventoryReducer from "./slices/inventorySlice";
import supplierReducer from "./slices/supplierSlice";
import warehouseReducer from "./slices/warehouseSlice";
import purchaseOrderReducer from "./slices/purchaseOrderSlice";

const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    products: productReducer,
    inventory: inventoryReducer,
    suppliers: supplierReducer,
    warehouses: warehouseReducer,
    purchaseOrders: purchaseOrderReducer,
  },
});

export default store;


