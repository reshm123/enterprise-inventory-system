# Logic Implementation Document

This document explains the actual business logic implemented in the backend, how each module works, and where the logic lives in the codebase.

## 1. System overview

The project is designed around a warehouse and procurement workflow for a multi-location inventory business. The system stores master records for products, suppliers, warehouses, users, purchase orders, stock transfers, inventory, stock movements, and audit events.

The core backend architecture follows this pattern:

```text
Route
  -> Controller
    -> Service
      -> Repository / Model
        -> MongoDB
```

The main implementation files are:

- `backend/routes`
- `backend/controllers`
- `backend/services`
- `backend/repositories`
- `backend/models`
- `backend/middleware`
- `backend/config`

## 2. Authentication and authorization logic

### Implemented behavior

- user registration and login
- JWT authentication
- user status validation
- token invalidation via tokenVersion
- role-based access control

### Files involved

- `backend/routes/auth.routes.js`
- `backend/middleware/auth.middleware.js`
- `backend/middleware/role.middleware.js`
- `backend/utils/jwt.js`
- `backend/models/user.model.js`
- `backend/repositories/user.repository.js`

### Business flow

1. The client sends a bearer token in the Authorization header.
2. The auth middleware validates the token format and signature.
3. The user record is loaded from MongoDB.
4. If the user is inactive, deleted, or has a mismatched token version, access is denied.
5. The role middleware checks if the user role is allowed to access the route.

### Roles implemented

- Admin
- Procurement Manager
- Warehouse Manager
- Warehouse Staff
- Inventory Auditor

### Result

This ensures protected APIs are not accessible without a valid authenticated identity and that actions are restricted by business roles.

## 3. Product logic

### Implemented behavior

- create product
- list products
- fetch a single product
- update product
- delete product

### Files involved

- `backend/routes/product.routes.js`
- `backend/controllers/product.controller.js`
- `backend/services/product.service.js`
- `backend/models/product.model.js`

### Logic

The product module stores product metadata such as SKU, name, category, brand, unit price, reorder level, and status. The code validates inputs before saving and prevents invalid product records from being persisted.

### Important rules

- SKU is treated as a unique item identifier.
- product pricing and reorder values are validated before saving.
- product records are used as the master reference for inventory and purchase-order items.

## 4. Supplier logic

### Implemented behavior

- create supplier
- list suppliers
- fetch supplier details
- update supplier
- delete supplier

### Files involved

- `backend/routes/supplier.routes.js`
- `backend/controllers/supplierController.js`
- `backend/models/Supplier.js`

### Logic

Supplier records are used to validate procurement and receiving operations. Supplier creation and updates enforce data checks, and business rules prevent supplier deletion when associated active procurement operations would be impacted.

## 5. Warehouse logic

### Implemented behavior

- create warehouse
- list warehouses
- fetch warehouse details
- update warehouse
- toggle warehouse status

### Files involved

- `backend/routes/warehouse.routes.js`
- `backend/controllers/warehouseController.js`
- `backend/models/warehouse.js`

### Logic

Warehouses are identified as the physical inventory storage points. The application validates warehouse existence and active status before using a warehouse in stock, transfer, or purchasing flows.

## 6. Inventory logic

### Implemented behavior

- create inventory entry per product per warehouse
- list inventory with search, filter, sort, and pagination
- low-stock checks
- inventory adjustments
- stock movement creation
- rejection of invalid inventory updates

### Files involved

- `backend/services/inventory.service.js`
- `backend/repositories/inventory.repository.js`
- `backend/models/inventory.model.js`
- `backend/models/stockMovement.model.js`
- `backend/routes/inventory.routes.js`

### Inventory model logic

Each inventory document stores:

- productId
- warehouseId
- quantity
- reservedQuantity
- availableQuantity
- reorderLevel
- timestamps

### Core rules

1. Inventory is tracked per product and warehouse.
2. A direct quantity patch is blocked to force workflows through controlled updates.
3. A negative adjustment is only allowed if it does not push available stock below zero.
4. Every accepted stock change creates a corresponding stock movement record.
5. Low-stock is calculated on the backend using the business rule:

```text
availableQuantity <= reorderLevel
```

### Example flow

- initial stock is created with a positive quantity
- stock adjustment enters a negative quantity if allowed
- the stock movement record stores the delta and reason
- the inventory balance is recalculated and validated

## 7. Purchase order logic

### Implemented behavior

- create a purchase order
- submit for approval
- approve purchase order
- receive goods against a PO
- reject over-receiving
- close or cancel PO

### Files involved

- `backend/models/purchaseOrder.model.js`
- `backend/services/purchaseOrder.service.js`
- `backend/repositories/purchaseOrder.repository.js`
- `backend/routes/purchaseOrder.routes.js`

### PO states

The workflow implemented is:

```text
Draft
  -> Pending Approval
    -> Approved
      -> Partially Received
        -> Fully Received
          -> Closed
```

### Business logic

- a purchase order can be edited only while it is in Draft status
- approval only occurs for orders in Pending Approval
- receiving updates the receivedQuantity and pendingQuantity values
- if the quantity received exceeds the remaining quantity, the request is rejected
- when all items are fully received, the purchase order is marked as Fully Received

### Example

If a PO contains 10 units and 4 units are received:

- receivedQuantity = 4
- pendingQuantity = 6
- status becomes Partially Received

If the remaining 6 units are then received:

- pendingQuantity = 0
- status becomes Fully Received

## 8. Stock transfer logic

### Implemented behavior

- create transfer
- request transfer
- approve transfer
- ship transfer
- receive transfer
- cancel transfer

### Files involved

- `backend/models/stockTransfer.model.js`
- `backend/services/stockTransfer.service.js`
- `backend/routes/stockTransfer.routes.js`

### Transfer states

```text
Draft
  -> Requested
    -> Approved
      -> In Transit
        -> Received
          -> Cancelled
```

### Business logic

- the transfer is created with source and destination warehouse IDs
- transfer approval checks whether the source warehouse has enough available stock
- the system then reserves or reduces inventory according to the transfer stage
- shipping and receiving update movement history and inventory balances
- invalid transfer states are blocked by guard checks

### Important protection

This logic prevents negative inventory values by validating the available stock before approval and by using conditional operations during stock updates.

## 9. Audit log logic

### Implemented behavior

- store business-level changes
- record who performed the action
- capture details and entity references
- provide audit retrieval with pagination

### Files involved

- `backend/models/auditLog.model.js`
- `backend/services/auditLog.service.js`
- `backend/routes/auditLog.routes.js`

### Purpose

Audit logs are used to keep a trace of inventory changes, transfer state changes, receiving events, and general operational activity. This creates accountability and helps support maintenance or investigation tasks.

## 10. Dashboard logic

### Implemented behavior

The dashboard is backend-driven and calculates totals in the server instead of in the frontend.

### Files involved

- `backend/services/dashboard.service.js`
- `backend/repositories/dashboard.repository.js`
- `backend/controllers/dashboard.controller.js`
- `backend/routes/dashboard.routes.js`

### Values computed

- total products
- total warehouses
- total suppliers
- total inventory units
- low-stock counts
- out-of-stock counts
- pending purchase orders
- pending transfers
- purchase value summary

### Why this matters

The frontend receives already-processed aggregate data instead of fetching raw records and computing totals on the client side.

## 11. MongoDB and transaction handling

### Implemented behavior

- local standalone MongoDB is supported without forcing replica-set configuration
- replica-set configuration is preserved when explicitly required
- retry writes are disabled when the deployment does not support them
- transactional operations fall back safely when the database does not support transactions

### Files involved

- `backend/config/db.js`
- `backend/services/inventory.service.js`
- `backend/services/stockTransfer.service.js`
- `backend/services/purchaseOrder.service.js`

### Why this was necessary

MongoDB single-node deployments and replica-set deployments behave differently. A replica-set-only transaction call on a standalone instance fails with retryable-write and transaction errors. The code now checks whether the Mongo deployment supports transactions before using transaction APIs.

## 12. Error handling and response format

### Implemented behavior

The backend uses a centralized error handler to return consistent API responses.

### Files involved

- `backend/middleware/error.middleware.js`

### Response format

```json
{
  "success": false,
  "message": "Insufficient inventory",
  "error": {
    "code": "INSUFFICIENT_STOCK"
  }
}
```

This is used across inventory, transfers, purchase-order, auth, and validation errors.

## 13. Testing logic

### Implemented behavior

The project includes backend tests that validate the main operational flow.

### Files involved

- `backend/tests/inventory.test.js`
- `backend/tests/dbConnection.test.js`

### Covered areas

- CORS preflight rules
- audit retrieval
- inventory creation
- low-stock detection
- stock adjustment validation
- purchase-order receiving and over-receiving checks
- stock transfer concurrency safety
- MongoDB connection behavior for local standalone setups

## 14. Summary of implemented business value

The backend currently implements the core operational logic needed for an enterprise inventory management system:

- secure user access and role control
- product and supplier records
- warehouse-level inventory tracking
- inventory adjustments with audit trail
- purchase order creation, approval, and receiving
- stock transfer validation and movement tracking
- backend dashboard aggregation
- safe MongoDB connectivity for local development and supported deployments

This gives the project a solid base for enterprise inventory operations and a proper backend structure for further extension.

- low stock products
- out of stock products
- pending purchase orders
- pending transfers
- total purchase value

## 10. MongoDB and transaction handling

### Implemented behavior

The backend supports a local standalone MongoDB setup without forcing a replica-set connection, and explicitly handles transaction-capable deployments when they exist.

### Main file

- `backend/config/db.js`

### Important rules

- standalone local MongoDB is allowed to connect without `replicaSet`
- explicit `replicaSet` configuration is preserved when needed
- `retryWrites=false` is set to avoid unsupported retryable-write errors on single-node deployments
- transaction-based operations are only used when the server supports them

This is essential because transaction APIs like `withTransaction()` are not valid on a standalone Mongo deployment unless the target environment supports replica-set behavior.

## 11. Error handling and response style

### Implemented behavior

The project follows a consistent error response format through a centralized error handler.

Main file:
- `backend/middleware/error.middleware.js`

Common response format:

```json
{
  "success": false,
  "message": "Insufficient inventory",
  "error": {
    "code": "INSUFFICIENT_STOCK"
  }
}
```

## 12. API usage summary

### Authentication

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

### Products

```http
POST /api/product
GET /api/product
GET /api/product/:id
PUT /api/product/:id
DELETE /api/product/:id
```

### Supplier

```http
POST /api/supplier
GET /api/supplier
GET /api/supplier/:id
PUT /api/supplier/:id
DELETE /api/supplier/:id
```

### Warehouse

```http
POST /api/warehouse
GET /api/warehouse
GET /api/warehouse/:id
PUT /api/warehouse/:id
PATCH /api/warehouse/:id/status
DELETE /api/warehouse/:id
```

### Inventory

```http
POST /api/inventory
GET /api/inventory
GET /api/inventory/:id
GET /api/inventory/low-stock
POST /api/inventory/adjust
PATCH /api/inventory/:id
```

### Purchase orders

```http
POST /api/purchase-orders
GET /api/purchase-orders
GET /api/purchase-orders/:id
PATCH /api/purchase-orders/:id
POST /api/purchase-orders/:id/submit
POST /api/purchase-orders/:id/approve
POST /api/purchase-orders/:id/cancel
POST /api/purchase-orders/:id/close
POST /api/purchase-orders/:id/receive
```

### Stock transfers

```http
POST /api/stock-transfers
GET /api/stock-transfers
GET /api/stock-transfers/:id
POST /api/stock-transfers/:id/request
POST /api/stock-transfers/:id/approve
POST /api/stock-transfers/:id/ship
POST /api/stock-transfers/:id/receive
POST /api/stock-transfers/:id/cancel
```

### Dashboard

```http
GET /api/dashboard/summary
```

## 13. Testing coverage

The backend includes tests around:

- local Mongo connection logic
- CORS handling
- audit history retrieval
- inventory creation and stock validation
- stock adjustment validation
- over-receiving rejection
- purchase-order approval state handling
- concurrent stock transfer reservation logic

Main test files:
- `backend/tests/inventory.test.js`
- `backend/tests/dbConnection.test.js`

## 14. Deployment notes

This project is configured for local development and can be extended for production. The main operational consideration is the Mongo environment:

- single-node local Mongo: supported
- replica-set deployments: supported when configured
- transaction-heavy operations require the proper Mongo topology

## 15. Summary

The project implements the central enterprise inventory workflow for a multi-warehouse business scenario. It covers authentication, authorization, inventory control, procurement workflows, warehouse movement, audit tracking, dashboard summary reporting, and MongoDB compatibility handling for local development.
