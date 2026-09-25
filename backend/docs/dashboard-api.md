# Dashboard API

This document defines the backend-driven dashboard APIs requested in issue 21. The dashboard must read these values from MongoDB at request time. The frontend must not calculate totals from list responses.

## 1. Proposed Endpoint

```http
GET /api/dashboard/summary
Authorization: Bearer <token>
```

The endpoint should be authenticated and available to `Admin`, `Procurement Manager`, `Warehouse Manager`, `Warehouse Staff`, and `Inventory Auditor`.

The response should use the existing `successResponse` format and return one `data` object containing the KPI values and both breakdowns:

```json
{
  "totalProducts": 0,
  "totalWarehouses": 0,
  "totalSuppliers": 0,
  "totalInventoryUnits": 0,
  "lowStockProducts": 0,
  "outOfStockProducts": 0,
  "pendingPurchaseOrders": 0,
  "pendingTransfers": 0,
  "totalPurchaseValue": 0,
  "inventoryByWarehouse": [],
  "purchaseOrderSummary": {}
}
```

A single endpoint keeps the dashboard request consistent and allows the service to run the independent database operations in parallel.

## 2. KPI Definitions

All values below are calculated by MongoDB queries or aggregation pipelines in the repository layer.

| KPI | Calculation |
|---|---|
| `totalProducts` | `Product.countDocuments({})` |
| `totalWarehouses` | `Warehouse.countDocuments({})` |
| `totalSuppliers` | `Supplier.countDocuments({})` |
| `totalInventoryUnits` | Sum `Inventory.availableQuantity` across all inventory records |
| `lowStockProducts` | Count distinct `productId` values where `availableQuantity <= reorderLevel` |
| `outOfStockProducts` | Count distinct `productId` values where `availableQuantity = 0` |
| `pendingPurchaseOrders` | Count purchase orders with status `Pending Approval` |
| `pendingTransfers` | Count transfers with status `Requested`, `Approved`, or `In Transit` |
| `totalPurchaseValue` | Sum `PurchaseOrder.totalAmount` for all orders except `Cancelled` |

`totalInventoryUnits` intentionally uses `availableQuantity`, because reserved stock is not currently available for dashboard stock totals. If the product owner wants physical stock instead, change this definition to sum `quantity` before implementation.

The product, warehouse, and supplier totals count all documents, including inactive records. If the dashboard is intended to show only operational records, apply `status: "Active"` for products and suppliers and `status: "ACTIVE"` for warehouses consistently across the API.

## 3. Inventory by Warehouse

Use an aggregation on `Inventory`:

```text
$group by warehouseId and sum availableQuantity
$lookup Warehouse to obtain name and code
$sort by warehouse name
```

Each item should have this shape:

```json
{
  "warehouseId": "WAREHOUSE_ID",
  "warehouseName": "Warehouse A",
  "warehouseCode": "WH-A",
  "units": 15000
}
```

Warehouses with no inventory records should still be returned with `units: 0`. Starting from `Warehouse` and looking up inventory is preferred for this requirement.

## 4. Purchase Order Summary

Return one count for each requested status, including zero-count statuses:

```json
{
  "Draft": 0,
  "Pending Approval": 0,
  "Approved": 0,
  "Partially Received": 0,
  "Fully Received": 0,
  "Cancelled": 0
}
```

The current purchase-order model also supports `Closed`. It is intentionally excluded from the requested dashboard summary. Add it only if the product requirements change.

Use one `$group` aggregation on `PurchaseOrder.status`, then fill missing statuses with zero in the service or repository result.

## 5. Implementation Files

Add the dashboard module using the existing route/controller/service/repository architecture:

| Layer | File | Responsibility |
|---|---|---|
| Repository | [dashboard.repository.js](../repositories/dashboard.repository.js) | Run counts, sums, and aggregation pipelines against Product, Warehouse, Supplier, Inventory, PurchaseOrder, and StockTransfer |
| Service | [dashboard.service.js](../services/dashboard.service.js) | Coordinate repository calls, normalize zero-count results, and return the dashboard contract |
| Controller | [dashboard.controller.js](../controllers/dashboard.controller.js) | Call the service and return `successResponse` |
| Routes | [dashboard.routes.js](../routes/dashboard.routes.js) | Authenticate the request and authorize dashboard roles |
| App registration | [app.js](../app.js) | Mount the router at `/api/dashboard` |

No new model is required. The dashboard is a read-only projection over the existing models:

- [product.model.js](../models/product.model.js)
- [warehouse.js](../models/warehouse.js)
- [Supplier.js](../models/Supplier.js)
- [inventory.model.js](../models/inventory.model.js)
- [purchaseOrder.model.js](../models/purchaseOrder.model.js)
- [stockTransfer.model.js](../models/stockTransfer.model.js)

## 6. Route and Response Conventions

Follow the existing conventions in [inventory.routes.js](../routes/inventory.routes.js) and [purchaseOrder.routes.js](../routes/purchaseOrder.routes.js):

- Apply `authenticate` to the router.
- Apply `authorizeRoles` to the summary endpoint.
- Pass errors to `next(error)` in the controller.
- Return the result through `successResponse`.
- Keep database access out of the controller.
- Do not calculate totals in the frontend.

Recommended route registration:

```text
app.use("/api/dashboard", dashboardRoutes)
```

Register the dashboard router before parameterized routes in the application when adding any future dashboard sub-routes.

## 7. Database and Performance Notes

Use `Promise.all` for independent KPI queries. Use aggregation pipelines for sums, distinct product counts, warehouse totals, and status counts rather than loading every document into Node.js.

The following existing indexes support the main dashboard filters:

- `Inventory`: `{ warehouseId: 1, availableQuantity: 1 }`
- `Inventory`: `{ availableQuantity: 1, reorderLevel: 1 }`
- `StockTransfer`: `{ fromWarehouse: 1, status: 1 }`
- `StockTransfer`: `{ toWarehouse: 1, status: 1 }`

If query profiling shows dashboard latency, add indexes for purchase-order status and inventory `productId` only after measuring the production workload.

## 8. Tests

Add focused tests for the dashboard service or endpoint covering:

1. All KPI values are calculated from seeded database records.
2. Low-stock and out-of-stock products are counted distinctly, not once per warehouse record.
3. Warehouses with no inventory return zero units.
4. Purchase-order summary always contains all six requested statuses.
5. Cancelled purchase orders are excluded from `totalPurchaseValue`.
6. Pending transfers include `Requested`, `Approved`, and `In Transit`, but exclude `Received` and `Cancelled`.
7. Unauthenticated requests are rejected.
8. Users outside the dashboard role list receive `403`.
9. Empty collections return zero values and empty or zero-filled breakdowns.
