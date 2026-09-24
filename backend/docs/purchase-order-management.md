# Purchase Order Management

## 1. Purpose

The purchase order module manages procurement from creation through approval, goods receiving, and closure.

It supports:

- creating purchase orders for a supplier and warehouse
- adding multiple products to one purchase order
- calculating the total purchase value on the backend
- submitting draft orders for approval
- preventing a user from approving their own order
- receiving products in one or more deliveries
- preventing over-receiving
- updating inventory when goods are received
- recording purchase receipts as stock movements
- cancelling or closing orders according to their current state

The module follows this request flow:

```text
HTTP request
    -> route
    -> authentication and role authorization
    -> controller
    -> service
    -> repository and Mongoose models
    -> MongoDB
```

The route, controller, service, repository, and model each have a separate responsibility. This keeps HTTP handling separate from business rules and database operations.

---

## 2. Files

| Layer | File | Responsibility |
|---|---|---|
| Model | [purchaseOrder.model.js](../models/purchaseOrder.model.js) | Defines the MongoDB document structure and indexes |
| Repository | [purchaseOrder.repository.js](../repositories/purchaseOrder.repository.js) | Performs purchase-order database queries |
| Service | [purchaseOrder.service.js](../services/purchaseOrder.service.js) | Enforces business rules and coordinates database work |
| Controller | [purchaseOrder.controller.js](../controllers/purchaseOrder.controller.js) | Converts HTTP requests into service calls and responses |
| Routes | [purchaseOrder.routes.js](../routes/purchaseOrder.routes.js) | Defines URLs and role-based access |
| App registration | [app.js](../app.js) | Mounts the module at `/api/purchase-orders` |

---

## 3. Data Model

### 3.1 Purchase order document

A purchase order is stored as one MongoDB document:

```js
{
  poNumber: "PO-1001",
  supplierId: ObjectId,
  warehouseId: ObjectId,
  items: [],
  totalAmount: 125000,
  expectedDeliveryDate: Date,
  status: "Draft",
  createdBy: ObjectId,
  approvedBy: ObjectId,
  approvedAt: Date,
  approvalComment: "Approved for Q4 stock",
  createdAt: Date,
  updatedAt: Date
}
```

The order references the supplier, warehouse, creator, approver, and products by MongoDB ObjectId. This avoids duplicating full supplier, warehouse, user, and product records inside every purchase order.

### 3.2 Purchase order item schema

The file contains two schemas because there are two different data levels:

```js
const purchaseOrderItemSchema = new mongoose.Schema({
  productId: ObjectId,
  quantity: Number,
  unitPrice: Number,
  receivedQuantity: Number,
  pendingQuantity: Number
});
```

This schema describes one line item inside an order.

```js
const purchaseOrderSchema = new mongoose.Schema({
  poNumber: String,
  supplierId: ObjectId,
  warehouseId: ObjectId,
  items: [purchaseOrderItemSchema],
  totalAmount: Number,
  status: String
});
```

This schema describes the complete purchase order.

The item schema is embedded here:

```js
items: {
  type: [purchaseOrderItemSchema],
  required: true
}
```

This means one purchase order can contain many products. `purchaseOrderItemSchema` does not create its own MongoDB collection because it is not passed to `mongoose.model()`. Only this model creates a collection:

```js
const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);
```

The items receive their own `_id` values so individual lines can be identified inside the order.

### 3.3 Item fields

| Field | Meaning |
|---|---|
| `productId` | Product being purchased |
| `quantity` | Quantity ordered |
| `unitPrice` | Price per unit at the time of purchase |
| `receivedQuantity` | Quantity already received |
| `pendingQuantity` | Quantity still expected |

For each item:

```text
pendingQuantity = quantity - receivedQuantity
```

New items start with:

```text
receivedQuantity = 0
pendingQuantity = quantity
```

### 3.4 Purchase order fields

| Field | Meaning |
|---|---|
| `poNumber` | Unique business reference for the order |
| `supplierId` | Supplier providing the goods |
| `warehouseId` | Warehouse receiving the goods |
| `items` | Embedded product lines |
| `totalAmount` | Sum of quantity multiplied by unit price |
| `expectedDeliveryDate` | Expected delivery date |
| `status` | Current workflow state |
| `createdBy` | User who created the order |
| `approvedBy` | User who approved the order |
| `approvedAt` | Approval timestamp |
| `approvalComment` | Optional approval note |
| `createdAt` / `updatedAt` | Automatically maintained timestamps |

The backend calculates `totalAmount`; clients should not be trusted to send a correct total.

---

## 4. Purchase Order Status Workflow

```text
Draft
  |
  | POST /:id/submit
  v
Pending Approval
  |
  | POST /:id/approve
  v
Approved
  |
  | POST /:id/receive
  v
Partially Received
  |
  | POST /:id/receive
  v
Fully Received
  |
  | POST /:id/close
  v
Closed
```

Cancellation is allowed before the order becomes fully received or closed:

```text
Draft / Pending Approval / Approved / Partially Received
  |
  | POST /:id/cancel
  v
Cancelled
```

### State rules

- New orders always start as `Draft`.
- Only `Draft` orders can be edited.
- Only `Draft` orders can be submitted.
- Only `Pending Approval` orders can be approved.
- A user cannot approve their own order.
- Only `Approved` and `Partially Received` orders can receive goods.
- A receipt cannot make `receivedQuantity` greater than ordered `quantity`.
- An order becomes `Partially Received` when at least one item still has pending quantity.
- An order becomes `Fully Received` when every item has `pendingQuantity = 0`.
- Only `Fully Received` orders can be closed.
- `Cancelled` and `Closed` orders cannot be edited or received.

These rules are enforced in the service layer, not only in the frontend.

---

## 5. Repository Layer

File: [purchaseOrder.repository.js](../repositories/purchaseOrder.repository.js)

The repository is responsible for database access. It should not decide whether a purchase order is allowed to transition from one state to another.

### `createPurchaseOrder(data)`

```js
export const createPurchaseOrder = async (data) => PurchaseOrder.create(data);
```

Inserts a new purchase order document.

The service prepares and validates `data` before calling this function.

### `findPurchaseOrderById(id, session)`

Finds one order by ID and populates related data:

- supplier name, email, and status
- warehouse name, code, location, and status
- creator and approver information
- product SKU, name, category, and brand

The optional `session` is important when the query is part of a MongoDB transaction.

### `findPurchaseOrders({ status, supplierId, warehouseId, page, limit })`

Lists purchase orders using database-level filtering and pagination.

Supported filters:

- `status`
- `supplierId`
- `warehouseId`
- `page`
- `limit`

It returns:

```js
{
  items: [],
  total: 25
}
```

The service adds `page`, `limit`, and `totalPages` for the API response.

### `findActivePurchaseOrderBySupplier(supplierId)`

Finds an order for a supplier that is currently active:

- `Pending Approval`
- `Approved`
- `Partially Received`

This helper can be used later if the business decides to limit active orders per supplier.

### Why use a repository?

Without a repository, Mongoose queries would be spread across controllers and services. The repository centralizes database details and makes the service easier to read and test.

---

## 6. Service Layer

File: [purchaseOrder.service.js](../services/purchaseOrder.service.js)

The service layer owns the business rules. It validates references, calculates totals, controls state transitions, and coordinates inventory and stock movement updates.

### Shared validation helpers

#### `fail(message, statusCode, code)`

Creates an error with:

- a user-readable message
- an HTTP status code
- an application error code

The centralized error middleware converts this error into the standard response format.

#### `assertObjectId(value, field)`

Rejects invalid MongoDB IDs before database queries run.

#### `normalizeItems(items)`

Validates every item and prepares its initial values:

1. Checks that items are provided.
2. Validates `productId`.
3. Converts quantity and unit price to numbers.
4. Requires a positive integer quantity.
5. Requires a non-negative unit price.
6. Confirms that the product exists.
7. Sets received and pending quantities.

#### `assertReferences({ supplierId, warehouseId })`

Checks that:

- supplier exists and is `Active`
- warehouse exists and is `ACTIVE`

#### `calculateTotal(items)`

Calculates:

```text
totalAmount = sum(quantity * unitPrice)
```

### `createPurchaseOrderService(data, userId)`

Creates a new draft order.

Process:

1. Validate supplier and warehouse.
2. Validate all products and item quantities.
3. Generate a PO number if one was not supplied.
4. Calculate the total amount.
5. Save the order with `status: "Draft"`.
6. Convert duplicate PO numbers into a `409 Conflict` error.

### `listPurchaseOrdersService(query)`

Normalizes pagination values before calling the repository:

- minimum page is `1`
- default limit is `20`
- maximum limit is `100`

This prevents an invalid or extremely large client-supplied limit from being used directly in a database query.

### `getPurchaseOrderService(id)`

Validates the ID, fetches the order, and returns `404` when it does not exist.

### `updatePurchaseOrderService(id, data)`

Allows updates only while the order is in `Draft` state.

If items are changed, the service:

- validates the new items
- recalculates the total amount
- resets receiving values for the replacement item list

Once an order is submitted, its items cannot be freely modified.

### `submitPurchaseOrderService(id)`

Changes:

```text
Draft -> Pending Approval
```

Any other starting state is rejected with `INVALID_PO_STATE`.

### `approvePurchaseOrderService(id, user, comment)`

Changes:

```text
Pending Approval -> Approved
```

It also stores:

- `approvedBy`
- `approvedAt`
- `approvalComment`

The creator cannot approve the same order. This enforces separation of duties.

### `cancelPurchaseOrderService(id)`

Changes an eligible order to `Cancelled`.

Cancellation is rejected for:

- `Fully Received`
- `Closed`
- `Cancelled`

### `closePurchaseOrderService(id)`

Changes:

```text
Fully Received -> Closed
```

Closing is rejected unless every ordered item has been received.

---

## 7. Goods Receiving and Transactions

### `receivePurchaseOrderService(id, receiptItems, user)`

This is the most important operation in the module because it changes several collections together.

A receipt request looks like:

```json
{
  "items": [
    {
      "productId": "665000000000000000000001",
      "quantity": 300
    }
  ]
}
```

The service performs these steps inside a MongoDB session transaction:

1. Load the purchase order using the session.
2. Confirm that the order exists.
3. Confirm that its status is `Approved` or `Partially Received`.
4. Validate each receipt item.
5. Find the matching PO item.
6. Reject the receipt if it would exceed the ordered quantity.
7. Increase `receivedQuantity`.
8. Recalculate `pendingQuantity`.
9. Increase inventory quantity and available quantity.
10. Create a `PURCHASE_RECEIPT` stock movement.
11. Set the PO status to `Partially Received` or `Fully Received`.
12. Save the PO and its embedded purchase-order item updates.
13. Create the purchase receipt audit log.
14. Commit all changes together.

If any step throws an error, MongoDB rolls back the transaction. This prevents a partial result such as inventory being updated while the purchase order remains unchanged.

### Partial receiving example

Original item:

```text
Ordered: 500
Received: 0
Pending: 500
```

First receipt:

```text
Receipt: 300
Received: 300
Pending: 200
PO status: Partially Received
```

Second receipt:

```text
Receipt: 200
Received: 500
Pending: 0
PO status: Fully Received
```

### Over-receiving example

```text
Ordered: 500
Already received: 450
New receipt: 100
```

The service rejects the operation because:

```text
450 + 100 > 500
```

Response:

```json
{
  "success": false,
  "message": "Cannot receive more than ordered quantity for product ...",
  "error": {
    "code": "OVER_RECEIVING_NOT_ALLOWED"
  }
}
```

### Inventory effect

When receiving stock, the service updates the inventory record for the PO warehouse:

```text
quantity += received quantity
availableQuantity += received quantity
```

If no inventory document exists yet, `findOneAndUpdate` creates one with `upsert: true`.

The service also writes a stock movement:

```js
{
  productId,
  warehouseId,
  type: "PURCHASE_RECEIPT",
  quantity,
  reference: purchaseOrder.poNumber,
  reason: "Goods received against purchase order",
  performedBy: user.id
}
```

---

## 8. Controller Layer

File: [purchaseOrder.controller.js](../controllers/purchaseOrder.controller.js)

Controllers are deliberately thin. They should not contain database queries or workflow rules.

Each controller:

1. Reads request data from `req.body`, `req.params`, `req.query`, or `req.user`.
2. Calls one service function.
3. Sends a standard success response.
4. Passes errors to `next(error)` so centralized middleware handles them.

### Controller functions

| Function | Service called | Result |
|---|---|---|
| `createPurchaseOrder` | `createPurchaseOrderService` | Creates a draft PO |
| `listPurchaseOrders` | `listPurchaseOrdersService` | Returns filtered and paginated POs |
| `getPurchaseOrder` | `getPurchaseOrderService` | Returns one populated PO |
| `updatePurchaseOrder` | `updatePurchaseOrderService` | Updates a draft PO |
| `submitPurchaseOrder` | `submitPurchaseOrderService` | Sends a PO for approval |
| `approvePurchaseOrder` | `approvePurchaseOrderService` | Approves a pending PO |
| `cancelPurchaseOrder` | `cancelPurchaseOrderService` | Cancels an eligible PO |
| `closePurchaseOrder` | `closePurchaseOrderService` | Closes a fully received PO |
| `receivePurchaseOrder` | `receivePurchaseOrderService` | Receives goods and updates stock |

Example controller pattern:

```js
export const getPurchaseOrder = async (req, res, next) => {
  try {
    const purchaseOrder = await getPurchaseOrderService(req.params.id);
    return successResponse(
      res,
      200,
      "Purchase order fetched successfully",
      purchaseOrder
    );
  } catch (error) {
    next(error);
  }
};
```

The controller does not decide whether the PO is approved or whether receiving is allowed. Those decisions belong to the service.

---

## 9. Routes and Authorization

File: [purchaseOrder.routes.js](../routes/purchaseOrder.routes.js)

The app mounts these routes at:

```text
/api/purchase-orders
```

Every route first runs:

```js
router.use(authenticate);
```

This means every purchase-order operation requires a valid active-user JWT.

### Role groups

#### Procurement roles

- `Admin`
- `Procurement Manager`

These roles create, edit, submit, approve, cancel, and close purchase orders.

#### View roles

- `Admin`
- `Procurement Manager`
- `Warehouse Manager`
- `Warehouse Staff`
- `Inventory Auditor`

These roles can list and view purchase orders.

#### Receiving roles

- `Admin`
- `Warehouse Manager`
- `Warehouse Staff`

These roles can receive goods because receiving directly changes warehouse inventory.

The frontend may hide buttons for convenience, but authorization is enforced by the backend route middleware.

---

## 10. API Endpoints

All endpoints require:

```text
Authorization: Bearer <JWT>
```

### Create purchase order

```text
POST /api/purchase-orders
```

Roles: Admin, Procurement Manager

Request:

```json
{
  "poNumber": "PO-1001",
  "supplierId": "665000000000000000000010",
  "warehouseId": "665000000000000000000020",
  "expectedDeliveryDate": "2026-10-15",
  "items": [
    {
      "productId": "665000000000000000000001",
      "quantity": 500,
      "unitPrice": 45000
    }
  ]
}
```

Response: `201 Created`

The order is created with `Draft` status.

### List purchase orders

```text
GET /api/purchase-orders?page=1&limit=20&status=Approved&warehouseId=<id>
```

Roles: all authenticated inventory roles

Response data:

```json
{
  "items": [],
  "total": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

### Get one purchase order

```text
GET /api/purchase-orders/:id
```

Roles: all authenticated inventory roles

The response includes populated supplier, warehouse, user, and product details.

### Update purchase order

```text
PATCH /api/purchase-orders/:id
```

Roles: Admin, Procurement Manager

Only `Draft` orders can be updated.

### Submit for approval

```text
POST /api/purchase-orders/:id/submit
```

Roles: Admin, Procurement Manager

Transition:

```text
Draft -> Pending Approval
```

### Approve purchase order

```text
POST /api/purchase-orders/:id/approve
```

Roles: Admin, Procurement Manager

Request:

```json
{
  "comment": "Approved within the quarterly procurement budget"
}
```

Transition:

```text
Pending Approval -> Approved
```

### Receive goods

```text
POST /api/purchase-orders/:id/receive
```

Roles: Admin, Warehouse Manager, Warehouse Staff

Request:

```json
{
  "items": [
    {
      "productId": "665000000000000000000001",
      "quantity": 300
    }
  ]
}
```

This updates the PO, inventory, and stock movement records in one transaction.

### Cancel purchase order

```text
POST /api/purchase-orders/:id/cancel
```

Roles: Admin, Procurement Manager

### Close purchase order

```text
POST /api/purchase-orders/:id/close
```

Roles: Admin, Procurement Manager

Only `Fully Received` orders can be closed.

---

## 11. Standard Responses

Success responses use the project response helper:

```json
{
  "success": true,
  "message": "Purchase order created successfully",
  "data": {}
}
```

Common errors:

| Status | Code | Meaning |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid input or invalid workflow request |
| `400` | `OVER_RECEIVING_NOT_ALLOWED` | Receipt exceeds ordered quantity |
| `401` | Authentication error | Missing, invalid, or expired JWT |
| `403` | `SEPARATION_OF_DUTIES_REQUIRED` | Creator attempted to approve their own PO |
| `403` | Forbidden | User role cannot perform the operation |
| `404` | `PURCHASE_ORDER_NOT_FOUND` | PO does not exist |
| `404` | `PRODUCT_NOT_FOUND` | Referenced product does not exist |
| `404` | `SUPPLIER_NOT_FOUND` | Referenced supplier does not exist |
| `404` | `WAREHOUSE_NOT_FOUND` | Referenced warehouse does not exist |
| `409` | `DUPLICATE_PO_NUMBER` | PO number is already used |
| `409` | `INVALID_PO_STATE` | Operation is not allowed in the current status |

Example error:

```json
{
  "success": false,
  "message": "Only draft purchase orders can be edited",
  "error": {
    "code": "INVALID_PO_STATE"
  }
}
```

---

## 12. Example End-to-End Flow

### Step 1: Create

Procurement creates a PO for 500 laptops:

```text
POST /api/purchase-orders
status = Draft
```

### Step 2: Submit

The procurement user submits it:

```text
POST /api/purchase-orders/:id/submit
status = Pending Approval
```

### Step 3: Approve

A different procurement manager approves it:

```text
POST /api/purchase-orders/:id/approve
status = Approved
```

### Step 4: First delivery

The warehouse receives 300 units:

```text
receivedQuantity = 300
pendingQuantity = 200
status = Partially Received
inventory quantity increases by 300
one PURCHASE_RECEIPT movement is created
```

### Step 5: Second delivery

The warehouse receives the remaining 200 units:

```text
receivedQuantity = 500
pendingQuantity = 0
status = Fully Received
inventory quantity increases by 200
another PURCHASE_RECEIPT movement is created
```

### Step 6: Close

Procurement closes the completed order:

```text
POST /api/purchase-orders/:id/close
status = Closed
```

---

## 13. Why the Layered Design Matters

### Model

Protects document shape, field types, required values, enum statuses, and indexes.

### Repository

Centralizes Mongoose queries and population logic.

### Service

Protects business correctness. This is where the application prevents invalid transitions, over-receiving, inactive references, and self-approval.

### Controller

Translates HTTP requests and responses without duplicating business rules.

### Routes

Defines the public API and enforces authentication and role authorization before the controller runs.

This separation makes the module easier to test and reduces the risk that a business rule is accidentally bypassed by another endpoint.

---

## 14. Important Implementation Notes

- Receipt transactions require MongoDB transaction support, normally provided by a replica set or MongoDB Atlas.
- The PO model uses `Supplier`, `Warehouse`, `Product`, and `user` references; those model names must remain consistent with the existing application.
- The stock movement is written as `PURCHASE_RECEIPT` for every receipt operation.
- The receiving transaction updates the PO and its items, inventory, stock movements, and `AuditLog` record atomically.
- The `AuditLog` record stores the receipt action, purchase order identity, operator, warehouse, received items, and resulting PO status.
- The frontend should use the API status and item quantities returned by the backend instead of calculating workflow state locally.
