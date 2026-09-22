# Inventory Management System

## 1. Purpose

The inventory module is the core of the enterprise inventory system. It tracks stock at the product and warehouse level, keeps the available quantity accurate, prevents invalid stock operations, and records every stock change in a movement log.

This module is designed to support real-world warehouse operations such as:

- creating an inventory record for a product in a warehouse
- checking low stock based on reorder levels
- adjusting stock manually due to damage, corrections, or returns
- maintaining an audit trail for every quantity change
- showing inventory records with filtering and pagination

---

## 2. Core Business Rules

The system follows these rules:

- Inventory is maintained per product per warehouse.
- Each inventory record is unique for a specific pair of productId + warehouseId.
- Available quantity is calculated as:

  availableQuantity = quantity - reservedQuantity

- Stock movement must be created for every stock-changing operation.
- Negative inventory is not allowed.
- Low stock is detected when availableQuantity <= reorderLevel.
- Inventory records are linked to products and warehouses.

---

## 3. Data Model: Inventory

File: [backend/models/inventory.model.js](../backend/models/inventory.model.js)

### Schema structure

```js
{
  productId: ObjectId,
  warehouseId: ObjectId,
  quantity: Number,
  reservedQuantity: Number,
  availableQuantity: Number,
  reorderLevel: Number,
  version: Number,
  createdAt: Date,
  updatedAt: Date
}
```

### Field explanation

- productId
  - references the product being stored
  - every product can have separate inventory in different warehouses

- warehouseId
  - references the warehouse location where stock is stored

- quantity
  - total stock available in the warehouse

- reservedQuantity
  - stock blocked for pending operations, transfers, or future reservations

- availableQuantity
  - usable stock after subtracting reservedQuantity

- reorderLevel
  - threshold used by low-stock logic

- version
  - useful for optimistic concurrency or future inventory versioning

### Database indexes

```js
inventorySchema.index({ productId: 1, warehouseId: 1 }, { unique: true });
inventorySchema.index({ warehouseId: 1, availableQuantity: 1 });
inventorySchema.index({ availableQuantity: 1, reorderLevel: 1 });
```

### Why these indexes matter

- productId + warehouseId unique index ensures only one inventory row exists for each product in each warehouse.
- warehouseId + availableQuantity helps query inventory grouped by warehouse and stock status.
- availableQuantity + reorderLevel supports low-stock lookup efficiently.

---

## 4. Data Model: Stock Movement

File: [backend/models/stockMovement.model.js](../backend/models/stockMovement.model.js)

### Schema structure

```js
{
  productId: ObjectId,
  warehouseId: ObjectId,
  type: "PURCHASE_RECEIPT" | "STOCK_TRANSFER_OUT" | "STOCK_TRANSFER_IN" | "STOCK_ADJUSTMENT" | "RETURN" | "DAMAGE" | "CORRECTION",
  quantity: Number,
  reference: String,
  reason: String,
  performedBy: ObjectId,
  createdAt: Date,
  updatedAt: Date
}
```

### Why the movement model matters

This model is the real audit trail. Every business event that changes stock is stored here:

- PO receipt increases stock
- stock transfer out reduces stock at source warehouse
- stock transfer in increases stock at destination warehouse
- stock adjustment modifies stock due to counting, damage, or corrections

This means inventory balances are not only updated in the inventory collection, but also recorded as a movement event in a traceable history.

---

## 5. Repository Layer

File: [backend/repositories/inventory.repository.js](../backend/repositories/inventory.repository.js)

The repository layer is responsible for direct database access. It does not contain business rules; it only performs Mongoose operations.

### Main responsibilities

- createInventoryEntry
  - inserts a new inventory row

- findInventoryByProductAndWarehouse
  - finds inventory for one product in one warehouse

- findInventoryById
  - fetches a single inventory record with product and warehouse details

- updateInventoryEntry
  - updates a specific inventory record

- listInventoryRecords
  - supports search, filter, sort, and pagination

- createStockMovementEntry
  - writes stock movement history

- getLowStockRecords
  - returns low-stock inventory rows

### Why repository layer exists

This keeps database logic separate from business logic. Services can call repository functions without worrying about MongoDB query details.

### Example flow

```js
const inventory = await findInventoryByProductAndWarehouse(productId, warehouseId);
```

This is a database lookup for a single product-warehouse pair. The service decides whether the result is valid or not.

---

## 6. Service Layer

File: [backend/services/inventory.service.js](../backend/services/inventory.service.js)

The service layer contains the business rules. It coordinates validation, database calls, and stock updates.

### Service functions

#### createInventoryService

Creates an inventory row only when:

- both productId and warehouseId are provided
- product exists
- warehouse exists
- no inventory row already exists for the same product and warehouse

After creation, it logs the initial movement record using the STOCK movement schema.

#### getInventoryService

Handles server-side filtering and pagination. It accepts query parameters like:

- search
- warehouse
- category
- lowStock
- outOfStock
- sortBy
- sortOrder
- page
- limit

This is important because inventory filtering should happen in the database, not on the frontend or in JavaScript after fetching all data.

#### getLowStockInventoryService

Returns records where:

```text
availableQuantity <= reorderLevel
```

This is a backend-driven low-stock report instead of calculating it on the frontend.

#### adjustInventoryService

This is the main manual adjustment logic.

It checks:

- required values exist
- inventory record exists
- adjustment does not make quantity negative

Then:

1. updates inventory.quantity
2. recalculates availableQuantity
3. increments version
4. creates a stock movement of type STOCK_ADJUSTMENT

### Why this layer matters

The service layer is where business validation is enforced. For example, a negative final inventory is rejected before it reaches MongoDB.

---

## 7. Controller Layer

File: [backend/controllers/inventory.controller.js](../backend/controllers/inventory.controller.js)

The controller accepts HTTP requests, calls the service, and returns a consistent API response.

### Responsibilities

- receive request data from Express
- validate request shape at the route level and business rules indirectly through the service
- call the right service function
- reply with a successResponse or pass error to Express middleware

### Example endpoints

#### createInventory

```js
export const createInventory = async (req, res, next) => {
  try {
    const inventory = await createInventoryService(req.body);
    return successResponse(res, 201, "Inventory created successfully", inventory);
  } catch (error) {
    next(error);
  }
};
```

#### listInventory

```js
const result = await getInventoryService(req.query);
return successResponse(res, 200, "Inventory fetched successfully", result);
```

#### adjustInventory

```js
const inventory = await adjustInventoryService(req.body, req.user);
return successResponse(res, 200, "Inventory adjusted successfully", inventory);
```

---

## 8. Route Layer

File: [backend/routes/inventory.routes.js](../backend/routes/inventory.routes.js)

The routes define the public API contract for the inventory module.

### Routes exposed

```js
router.post("/", ... createInventory)
router.get("/", ... listInventory)
router.get("/low-stock", ... getLowStockInventory)
router.get("/:id", ... getInventoryById)
router.patch("/:id", ... updateInventory)
router.post("/adjust", ... adjustInventory)
```

### Authentication and authorization

The module uses:

- authenticate middleware to ensure a valid JWT exists
- authorizeRoles middleware to ensure role access rules are enforced

Example route protection:

```js
router.use(authenticate);
router.get("/", authorizeRoles("Admin", "Procurement Manager", "Warehouse Manager", "Warehouse Staff", "Inventory Auditor"), listInventory);
```

This means that the route itself is not enough; every request must also pass authentication and role checks.

---

## 9. Request Flow End-to-End

A typical request goes through the following path:

1. Client calls an API endpoint
2. Express route receives the request
3. authenticate middleware verifies JWT
4. authorizeRoles checks the user role
5. Controller receives the request data
6. Service validates business rules
7. Repository performs MongoDB operations
8. Model ensures schema validation and indexes are used
9. Response is returned in a consistent JSON format

Example flow for stock adjustment:

```text
POST /api/inventory/adjust
  -> Route
  -> Middleware auth + role
  -> adjustInventory controller
  -> adjustInventoryService
  -> findInventoryByProductAndWarehouse repository
  -> validate quantity is not negative
  -> update inventory quantity
  -> create stock movement record
  -> response to client
```

---

## 10. Why the Inventory Module Is Critical

This module is the heart of warehouse operations because it ensures:

- accurate stock counts
- controlled stock movement
- low-stock detection
- audit visibility
- role-based restrictions
- consistency between quantity and movement history

Without this module, inventory can become inaccurate, causing stock mismatches, procurement waste, and operational errors.

---

## 11. Current Implementation Notes

The current project includes the core inventory framework for:

- inventory records
- stock movements
- low-stock queries
- stock adjustment endpoint
- inventory listing with search and pagination support

This is the foundation required to extend the system with more advanced features such as:

- PO receiving
- stock transfers between warehouses
- concurrent stock locking
- audit logs
- purchase order integration
- dashboard summary APIs

---

## 12. Suggested Future Improvements

To align more closely with the full enterprise system specification, the following should be added next:

- Purchase order receiving flow that updates inventory automatically
- Stock transfer approval and transfer out/in records
- Transaction-based updates using MongoDB sessions
- Optimistic concurrency/version checks for simultaneous updates
- Inventory audit history endpoint with old value and new value details
- Dashboard summary queries for total stock, low-stock count, and warehouse totals

---

## 13. Summary

The inventory management design follows a clean, modular architecture:

- Model: defines the inventory schema and movement history
- Repository: executes MongoDB queries
- Service: enforces business rules
- Controller: formats HTTP responses
- Route: exposes the public API

This separation keeps the code maintainable and makes it easier to scale the inventory system as the business grows.
