# Enterprise Inventory, Procurement & Warehouse Management System

This project is a full-stack enterprise inventory system built with Node.js, Express, MongoDB, Mongoose, and React. The backend focuses on inventory control, procurement workflows, stock transfers, audit trails, RBAC, and dashboard calculations.

## Project status

The backend has core business logic implemented and verified for the main flows:

- Authentication and JWT-based access control
- Product, supplier, and warehouse management
- Inventory creation, listing, low-stock checks, and adjustment logic
- Purchase order workflow and receiving logic
- Stock transfer workflow and approval logic
- Audit logging and dashboard summary endpoints
- MongoDB connection handling for local standalone setups
- Backend test coverage for critical flows

This repository is intended for a local development environment and can be extended for production deployment.

## Tech stack

Backend:
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcrypt
- Jest
- Supertest

Frontend:
- React
- Vite
- Redux Toolkit
- React Router
- Axios

## Repository structure

```text
enterprise-inventory-system/
├── backend/
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   └── validators/
├── frontend/
│   ├── src/
│   └── package.json
├── docs/
│   ├── api-guide.md
│   ├── backend-architecture.md
│   ├── ci-cd-deployment.md
│   ├── inventory-api.md
│   ├── inventory-management.md
│   └── implementation-guide.md
├── backend/.env.example
└── README.md
```

## Key implementation areas

### 1. Authentication and authorization

The auth layer validates JWTs and checks whether the user exists and is active.

- Middleware: `backend/middleware/auth.middleware.js`
- RBAC: `backend/middleware/role.middleware.js`
- Routes: `backend/routes/auth.routes.js`
- User model: `backend/models/user.model.js`

How it works:
- the client sends `Authorization: Bearer <token>`
- the server verifies the JWT
- the request user is loaded from MongoDB and validated against `status` and `tokenVersion`
- role checks restrict access to per-route actions

Supported roles in the project:
- Admin
- Procurement Manager
- Warehouse Manager
- Warehouse Staff
- Inventory Auditor

### 2. Product management

Products are created and stored with SKU, name, category, brand, unit price, reorder level, and status.

Main files:
- `backend/models/product.model.js`
- `backend/routes/product.routes.js`
- `backend/controllers/product.controller.js`
- `backend/services/product.service.js`

Business logic:
- SKU uniqueness is enforced at the database/model level
- product records are validated before save
- product reads are protected by authentication and role checks

### 3. Supplier and warehouse management

Suppliers and warehouses are managed as master records.

Main files:
- `backend/models/Supplier.js`
- `backend/models/warehouse.js`
- `backend/routes/supplier.routes.js`
- `backend/routes/warehouse.routes.js`
- `backend/controllers/supplierController.js`
- `backend/controllers/warehouseController.js`

Business logic:
- warehouse code and supplier data are validated
- warehouse status can be managed separately from physical deletion
- supplier deletion is guarded by active order rules in the business flow

### 4. Inventory management and stock movement

Inventory is stored per product and warehouse.

Main files:
- `backend/models/inventory.model.js`
- `backend/models/stockMovement.model.js`
- `backend/services/inventory.service.js`
- `backend/repositories/inventory.repository.js`
- `backend/routes/inventory.routes.js`

Core logic:
- each inventory record stores quantity, reservedQuantity, availableQuantity, and reorderLevel
- availableQuantity is derived from the stock logic and never allowed to go negative
- every stock change writes a stock movement record
- low-stock detection is driven by backend queries

Important rules implemented:
- no direct quantity patching through the inventory update endpoint
- negative adjustments are only allowed if they do not push available stock below zero
- all stock adjustment operations generate audit and movement entries

### 5. Purchase order workflow

Purchase orders represent procurement requests and their receiving lifecycle.

Main files:
- `backend/models/purchaseOrder.model.js`
- `backend/services/purchaseOrder.service.js`
- `backend/routes/purchaseOrder.routes.js`

Workflow implemented:
- Draft
- Pending Approval
- Approved
- Partially Received
- Fully Received
- Cancelled
- Closed

Logic:
- authorized users can create and submit purchase orders
- only allowed roles can approve a pending order
- receiving validates item quantity, pending stock, and over-receiving rules
- receiving updates inventory and stock movements in the same logical flow
- purchase order totals and item pending quantities are recalculated

### 6. Stock transfer workflow

Internal warehouse transfers are handled through a transfer lifecycle.

Main files:
- `backend/models/stockTransfer.model.js`
- `backend/services/stockTransfer.service.js`
- `backend/routes/stockTransfer.routes.js`

Workflow implemented:
- Draft
- Requested
- Approved
- In Transit
- Received
- Cancelled

Logic:
- transfer creation validates warehouse IDs and product item quantities
- request and approval states are enforced
- inventory is reserved when transfer approval happens
- shipping and receiving update stock movement history
- negative inventory is prevented by guarded conditional updates

### 7. Audit logs and dashboard analytics

Audit logs record structured actions performed against core entities.

Main files:
- `backend/models/auditLog.model.js`
- `backend/services/dashboard.service.js`
- `backend/repositories/dashboard.repository.js`
- `backend/routes/dashboard.routes.js`

Implemented dashboard values include:
- total products
- total warehouses
- total suppliers
- total inventory units
- low-stock count
- out-of-stock count
- pending purchase orders
- pending transfers
- purchase value summary

### 8. MongoDB connection handling

MongoDB setup is intentionally tolerant of local standalone installations.

File:
- `backend/config/db.js`

Important behavior:
- a local standalone MongoDB instance does not get forced into a replica-set connection
- the code still supports explicit replica-set configuration when it is required
- `retryWrites=false` is applied to avoid unsupported retryable-write errors on standalone deployments

This makes local development reliable and prevents the project from failing with replica-set-only errors when running a single local Mongo instance.

## Environment setup

1. Copy the sample environment file:

```bash
cp backend/.env.example backend/.env
```

2. Update the local Mongo connection if needed:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/enterprise_inventory
MONGODB_ALLOW_STANDALONE=true
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
```

3. Install backend dependencies:

```bash
cd backend
npm install
```

4. Install frontend dependencies:

```bash
cd frontend
npm install
```

## How to run the app

### Backend

```bash
cd backend
npm run dev
```

The app listens on port `5000` by default.

### Frontend

```bash
cd frontend
npm run dev
```

The frontend runs on the Vite default development port, usually `5173`.

## Testing

The backend includes Jest tests for critical inventory and database setup paths.

Run:

```bash
cd backend
npm test
```

## Core logic usage examples

### Register a user

```http
POST /api/auth/register
```

Request body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "Password123!"
}
```

### Log in

```http
POST /api/auth/login
```

### Create a product

```http
POST /api/product
Authorization: Bearer <token>
```

### List inventory

```http
GET /api/inventory?warehouse=WH001&page=1&limit=20
Authorization: Bearer <token>
```

### Low stock query

```http
GET /api/inventory/low-stock
Authorization: Bearer <token>
```

### Create stock adjustment

```http
POST /api/inventory/adjust
Authorization: Bearer <token>
```

Request body:
```json
{
  "productId": "PRODUCT_ID",
  "warehouseId": "WAREHOUSE_ID",
  "quantity": -5,
  "reason": "Damaged item"
}
```

### Create purchase order

```http
POST /api/purchase-orders
Authorization: Bearer <token>
```

### Submit and approve purchase order

```http
POST /api/purchase-orders/:id/submit
POST /api/purchase-orders/:id/approve
```

### Receive purchase order

```http
POST /api/purchase-orders/:id/receive
```

### Create and process stock transfer

```http
POST /api/stock-transfers
POST /api/stock-transfers/:id/request
POST /api/stock-transfers/:id/approve
POST /api/stock-transfers/:id/ship
POST /api/stock-transfers/:id/receive
```

## Notes on real production deployment

The current codebase is ready for local and test deployments. For production, the following should be reviewed carefully:

- use a secure MongoDB deployment with proper credentials
- enable TLS and environment isolation
- use a real replica set or sharded cluster for transaction-heavy production workloads
- configure proper JWT secret management in the hosting environment
- keep role policy and request validation in sync with business rules

## Related documentation

See project docs for deeper implementation details:
- `docs/backend-architecture.md`
- `docs/inventory-api.md`
- `docs/inventory-management.md`
- `docs/api-guide.md`

## Summary

This project implements the core enterprise inventory system flow needed for a warehouse and procurement platform: secure user access, stock lifecycle tracking, procurement processing, transfer validation, audit history, and dashboard reporting. The backend is organized into modular route-controller-service-repository layers and is designed to support a real MongoDB deployment.
