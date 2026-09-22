# Enterprise Inventory System API Guide

Version: 1.0  
Base URL: `http://localhost:5000`

## 1. Quick Start

Start the backend from the `backend` directory:

```bash
npm install
npm run dev
```

The health check does not require authentication:

```http
GET /health
```

All other endpoints use a JWT unless stated otherwise:

```http
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

Successful responses use this general shape:

```json
{
  "success": true,
  "message": "Description",
  "data": {}
}
```

## 2. Roles

The API recognizes these roles:

- `Admin`
- `Procurement Manager`
- `Warehouse Manager`
- `Warehouse Staff`
- `Inventory Auditor`

If a route does not list a role, check the route implementation before exposing it to a client. A missing or invalid token returns `401`; a user without the required role returns `403`.

## 3. Authentication API

### Register

```http
POST /api/auth/register
```

Public endpoint. Required fields are `name`, `email`, and `password`. Passwords must contain at least 8 characters.

```json
{
  "name": "Inventory Admin",
  "email": "admin@example.com",
  "password": "Password123!"
}
```

### Login

```http
POST /api/auth/login
```

Public endpoint.

```json
{
  "email": "admin@example.com",
  "password": "Password123!"
}
```

The response contains the authenticated user and JWT token. Send that token in the `Authorization` header for protected requests.

### Current user

```http
GET /api/auth/me
```

Requires authentication. Returns the current user represented by the token.

### Logout

```http
POST /api/auth/logout
```

Requires authentication. Invalidates the current token version for the user.

## 4. Product API

Base path: `/api/product`  
Authentication: required for every endpoint.

### Create product

```http
POST /api/product
```

Required fields are `sku`, `name`, `category`, `unitPrice`, and `reorderLevel`. `sku` is normalized to uppercase.

```json
{
  "sku": "LAPTOP-200",
  "name": "Laptop 200",
  "description": "Business laptop",
  "category": "Electronics",
  "brand": "Dell",
  "unitPrice": 50000,
  "reorderLevel": 10,
  "status": "Active"
}
```

### List products

```http
GET /api/product?search=laptop&category=Electronics&status=Active&page=1&limit=20
```

All query parameters are optional: `search`, `category`, `status`, `page`, and `limit`.

### Get product

```http
GET /api/product/:id
```

### Update product

```http
PUT /api/product/:id
```

Send any product fields that need changing. A changed SKU must remain unique.

```json
{
  "unitPrice": 47500,
  "status": "Active"
}
```

### Delete product

```http
DELETE /api/product/:id
```

## 5. Warehouse API

Base path: `/api/warehouse`  
Authentication: required for every endpoint.

### Create warehouse

```http
POST /api/warehouse
```

The authenticated user becomes the warehouse manager.

```json
{
  "name": "Warehouse A",
  "code": "WH-A-01",
  "location": "Noida"
}
```

Warehouse codes must be unique. Status values are `ACTIVE` and `INACTIVE`.

### List warehouses

```http
GET /api/warehouse?search=noida&status=ACTIVE&page=1&limit=10
```

All query parameters are optional: `search`, `status`, `page`, and `limit`.

### Get warehouse

```http
GET /api/warehouse/:id
```

### Update warehouse

```http
PUT /api/warehouse/:id
```

The same update operation is also available with `PATCH`:

```http
PATCH /api/warehouse/:id
```

### Change warehouse status

```http
PATCH /api/warehouse/:id/status
```

Use `ACTIVE` or `INACTIVE` as the status value expected by the warehouse service.

### Delete warehouse

```http
DELETE /api/warehouse/:id
```

## 6. Supplier API

Base path: `/api/supplier`  
Authentication: required for every endpoint.

### Create supplier

```http
POST /api/supplier
```

Allowed roles: `Admin`, `Procurement Manager`.

```json
{
  "name": "Acme Supplies",
  "email": "sales@acme.example",
  "phone": "+91-9876543210",
  "address": "Noida, India",
  "gstVatNumber": "GST12345",
  "contactPerson": "Ravi Kumar",
  "status": "Active"
}
```

### List suppliers

```http
GET /api/supplier?search=acme&status=Active&page=1&limit=10
```

Allowed roles: all five roles. Query parameters are `search`, `status`, `page`, and `limit`.

### Get supplier

```http
GET /api/supplier/:id
```

Allowed roles: all five roles.

### Update supplier

```http
PUT /api/supplier/:id
```

Allowed roles: `Admin`, `Procurement Manager`. Send one or more supplier fields.

### Delete supplier

```http
DELETE /api/supplier/:id
```

Allowed roles: `Admin`, `Procurement Manager`.

## 7. Inventory API

Base path: `/api/inventory`  
Authentication: required for every endpoint.

### Inventory fields

- `quantity`: total physical stock in the warehouse.
- `reservedQuantity`: stock held for pending orders or operations.
- `availableQuantity`: stock that can currently be used.
- `reorderLevel`: minimum threshold used to identify low stock.

The business formula is:

```text
availableQuantity = quantity - reservedQuantity
```

`reservedQuantity` must not be greater than `quantity`. For example, `quantity = 50` and `reservedQuantity = 140` is invalid because it would produce `availableQuantity = -90`.

### Create inventory

```http
POST /api/inventory
```

Allowed roles: `Admin`, `Procurement Manager`, `Warehouse Manager`, `Warehouse Staff`.

```json
{
  "productId": "64d9f7c9b2d4e21f8e7a1234",
  "warehouseId": "64d9f7c9b2d4e21f8e7a5678",
  "quantity": 50,
  "reorderLevel": 10
}
```

A product can have only one inventory record per warehouse. New records start with `reservedQuantity = 0` and `availableQuantity = quantity`.

### List inventory

```http
GET /api/inventory?page=1&limit=20&warehouse=WAREHOUSE_ID&search=laptop&category=Electronics&lowStock=true&outOfStock=false&sortBy=availableQuantity&sortOrder=asc
```

Allowed roles: all five roles.

Optional query parameters:

- `page`, `limit`: pagination.
- `warehouse`: warehouse ID.
- `search`: product name or SKU.
- `category`: product category.
- `lowStock=true`: available quantity is less than or equal to reorder level.
- `outOfStock=true`: available quantity is zero.
- `sortBy`: `updatedAt`, `quantity`, `availableQuantity`, `productName`, or `reorderLevel`.
- `sortOrder`: `asc` or `desc`.

### Get inventory by ID

```http
GET /api/inventory/:id
```

Allowed roles: all five roles.

### Get low-stock inventory

```http
GET /api/inventory/low-stock
```

Allowed roles: all five roles. This is a read-only report. It returns every record where:

```text
availableQuantity <= reorderLevel
```

Example: `availableQuantity = 8` and `reorderLevel = 10` means `8 <= 10`, so the item is returned and should be replenished.

```json
{
  "success": true,
  "message": "Low stock items fetched successfully",
  "data": {
    "total": 1,
    "items": [
      {
        "availableQuantity": 8,
        "reorderLevel": 10,
        "productId": {
          "name": "Laptop 200",
          "sku": "LAPTOP-200"
        },
        "warehouseId": {
          "name": "Warehouse A"
        }
      }
    ]
  }
}
```

This endpoint does not add, remove, reserve, or update stock.

## 8. Stock Movement API

Stock movements are the immutable audit trail for inventory changes. They are created internally by operations such as initial stock creation and stock adjustment. There is intentionally no public create endpoint, because directly creating a movement without changing inventory would make the audit trail inaccurate.

Base path: `/api/stock-movements`  
Authentication: required. All five roles can read movement history.

### List stock movements

```http
GET /api/stock-movements?page=1&limit=20&productId=PRODUCT_ID&warehouseId=WAREHOUSE_ID&type=STOCK_ADJUSTMENT&performedBy=USER_ID&from=2026-09-01&to=2026-09-21
```

Optional filters are `productId`, `warehouseId`, `type`, `performedBy`, `from`, and `to`. Supported movement types are `PURCHASE_RECEIPT`, `STOCK_TRANSFER_OUT`, `STOCK_TRANSFER_IN`, `STOCK_ADJUSTMENT`, `RETURN`, `DAMAGE`, and `CORRECTION`.

The response is paginated and includes populated product, warehouse, and user details:

```json
{
  "success": true,
  "message": "Stock movements fetched successfully",
  "data": {
    "items": [
      {
        "productId": { "sku": "LAPTOP-200", "name": "Laptop 200" },
        "warehouseId": { "name": "Warehouse A", "code": "WH-A-01" },
        "type": "STOCK_ADJUSTMENT",
        "quantity": -5,
        "reason": "Damaged items",
        "reference": "MANUAL_ADJUSTMENT",
        "performedBy": { "name": "Warehouse Manager", "role": "Warehouse Manager" },
        "createdAt": "2026-09-21T10:11:14.951Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### Get one stock movement

```http
GET /api/stock-movements/:id
```

Returns one movement with product, warehouse, and performer details. An invalid ID returns `400`; a valid but missing ID returns `404`.

### Adjust inventory

```http
POST /api/inventory/adjust
```

Allowed roles: `Admin`, `Warehouse Manager`, `Warehouse Staff`.

Use a positive number to add stock and a negative number to remove stock.

```json
{
  "productId": "64d9f7c9b2d4e21f8e7a1234",
  "warehouseId": "64d9f7c9b2d4e21f8e7a5678",
  "quantity": -5,
  "reason": "Damaged items"
}
```

If the current quantity is 50, the result is 45. The API rejects an adjustment that would make total quantity negative. The operation recalculates `availableQuantity` and creates a stock movement record.

### Update inventory settings

```http
PATCH /api/inventory/:id
```

Allowed roles: `Admin`, `Warehouse Manager`, `Warehouse Staff`.

Use this endpoint to update inventory fields such as `reorderLevel`, `quantity`, or `reservedQuantity`.

```json
{
  "reorderLevel": 15,
  "reservedQuantity": 40
}
```

The API recalculates:

```text
availableQuantity = 50 - 40 = 10
```

A request with `reservedQuantity = 140` while `quantity = 50` is rejected with HTTP `400` because reserved stock cannot exceed total stock.

## 8. Low-Stock Examples

| Quantity | Reserved | Available | Reorder level | Low stock? |
|---:|---:|---:|---:|:---:|
| 50 | 0 | 50 | 10 | No |
| 50 | 40 | 10 | 15 | Yes |
| 50 | 50 | 0 | 10 | Yes |
| 50 | 140 | Invalid | 15 | Request rejected |

## 9. Error Responses

Authentication errors:

```json
{
  "success": false,
  "message": "Authentication token is required",
  "error": { "code": "MISSING_TOKEN" }
}
```

Authorization errors use HTTP `403`. Common domain errors include:

- `VALIDATION_ERROR`
- `PRODUCT_NOT_FOUND`
- `WAREHOUSE_NOT_FOUND`
- `INVENTORY_NOT_FOUND`
- `INVENTORY_ALREADY_EXISTS`
- `INSUFFICIENT_STOCK`
- `INVALID_RESERVED_QUANTITY`
- `DUPLICATE_SUPPLIER_EMAIL`
- `SUPPLIER_NOT_FOUND`
- `INVALID_SUPPLIER_ID`

## 10. Typical Workflow

1. Register a user and log in.
2. Create products and warehouses.
3. Create one inventory record for each product and warehouse pair.
4. Use inventory adjustments for receipts, damage, corrections, and returns.
5. Use the low-stock endpoint to find records that need replenishment.
6. Update `reorderLevel` when the business threshold changes.
7. Keep `reservedQuantity` less than or equal to `quantity`.

## 11. Important Distinction

`GET /api/inventory/low-stock` reports inventory.  
`POST /api/inventory/adjust` changes inventory.  
`PATCH /api/inventory/:id` changes inventory fields and keeps `availableQuantity` consistent.
