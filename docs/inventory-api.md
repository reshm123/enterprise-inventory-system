# Inventory API Documentation

## Overview

The Inventory API manages stock records for products in warehouses. It tracks inventory quantity, available quantity, reserved quantity, reorder level, and stock movement history.

Base URL:

```text
http://localhost:5000/api/inventory
```

Authentication:

```text
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Create Inventory

### Endpoint

```http
POST /api/inventory
```

### Description

Creates a stock record for a product in a specific warehouse.

### Request Body

```json
{
  "productId": "64d9f7c9b2d4e21f8e7a1234",
  "warehouseId": "64d9f7c9b2d4e21f8e7a5678",
  "quantity": 50,
  "reorderLevel": 10
}
```

### Example Curl

```bash
curl -X POST http://localhost:5000/api/inventory \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productId": "64d9f7c9b2d4e21f8e7a1234",
    "warehouseId": "64d9f7c9b2d4e21f8e7a5678",
    "quantity": 50,
    "reorderLevel": 10
  }'
```

### Success Response

```json
{
  "success": true,
  "message": "Inventory created successfully",
  "data": {
    "_id": "6ab0fc50fd4b4d6f8b8d1d89",
    "productId": "6ab0faada8cacebdb9dd230e",
    "warehouseId": "6ab0fb28a8cacebdb9dd230f",
    "quantity": 50,
    "reservedQuantity": 0,
    "availableQuantity": 50,
    "reorderLevel": 10,
    "version": 0,
    "createdAt": "2026-09-21T09:43:44.639Z",
    "updatedAt": "2026-09-21T09:43:44.639Z"
  }
}
```

### Error Responses

```json
{
  "success": false,
  "message": "Product not found",
  "error": {
    "code": "PRODUCT_NOT_FOUND"
  }
}
```

```json
{
  "success": false,
  "message": "Inventory already exists for this product and warehouse",
  "error": {
    "code": "INVENTORY_ALREADY_EXISTS"
  }
}
```

---

## 2. Get Inventory List

### Endpoint

```http
GET /api/inventory
```

### Query Parameters

All parameters are optional. Filtering, sorting, and pagination are performed by the API query against MongoDB before records are returned.

- `page`: 1-based page number (default `1`)
- `limit`: number of records per page (default `20`)
- `search`: case-insensitive match against the product name or SKU
- `warehouse`: warehouse ObjectId
- `category`: exact product category match
- `lowStock`: when `true`, include records where `availableQuantity <= reorderLevel`
- `outOfStock`: when `true`, include records where `availableQuantity = 0`
- `sortBy`: `updatedAt` (default), `quantity`, `availableQuantity`, `productName`, or `reorderLevel`
- `sortOrder`: `asc` or `desc` (default `desc`)

When both `lowStock=true` and `outOfStock=true` are supplied, records matching either stock condition are returned.

### Example Curl

```bash
curl -X GET "http://localhost:5000/api/inventory?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

```bash
curl -X GET "http://localhost:5000/api/inventory?warehouse=64d9f7c9b2d4e21f8e7a5678&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

```bash
curl -X GET "http://localhost:5000/api/inventory?search=laptop&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

```bash
curl -X GET "http://localhost:5000/api/inventory?page=1&limit=20&search=laptop&warehouse=64d9f7c9b2d4e21f8e7a5678&category=Electronics&lowStock=true&sortBy=availableQuantity&sortOrder=asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

Pagination is applied in the database using the requested page and limit. The response includes the total matching record count and calculated total page count.

### Success Response

```json
{
  "success": true,
  "message": "Inventory fetched successfully",
  "data": {
    "items": [
      {
        "_id": "6ab0fc50fd4b4d6f8b8d1d89",
        "productId": {
          "_id": "6ab0faada8cacebdb9dd230e",
          "sku": "LAPTOP-200",
          "name": "Laptop 200",
          "category": "Electronics"
        },
        "warehouseId": {
          "_id": "6ab0fb28a8cacebdb9dd230f",
          "name": "Warehouse A",
          "code": "WH-A-01",
          "location": "Noida"
        },
        "quantity": 50,
        "reservedQuantity": 0,
        "availableQuantity": 50,
        "reorderLevel": 10
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

---

## 3. Get Inventory By ID

### Endpoint

```http
GET /api/inventory/:id
```

### Example Curl

```bash
curl -X GET http://localhost:5000/api/inventory/64d9f7c9b2d4e21f8e7a9999 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Success Response

```json
{
  "success": true,
  "message": "Inventory item fetched successfully",
  "data": {
    "_id": "64d9f7c9b2d4e21f8e7a9999",
    "productId": {
      "_id": "64d9f7c9b2d4e21f8e7a1234",
      "sku": "LAPTOP-200",
      "name": "Laptop 200"
    },
    "warehouseId": {
      "_id": "64d9f7c9b2d4e21f8e7a5678",
      "name": "Warehouse A"
    },
    "quantity": 50,
    "reservedQuantity": 0,
    "availableQuantity": 50,
    "reorderLevel": 10
  }
}
```

---

## 4. Get Low Stock Inventory

### Endpoint

```http
GET /api/inventory/low-stock
```

### Description

Returns records where:

```text
availableQuantity <= reorderLevel
```

### Example Curl

```bash
curl -X GET http://localhost:5000/api/inventory/low-stock \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Success Response

```json
{
  "success": true,
  "message": "Low stock items fetched successfully",
  "data": {
    "total": 1,
    "items": [
      {
        "_id": "6ab0fc50fd4b4d6f8b8d1d89",
        "productId": {
          "_id": "6ab0faada8cacebdb9dd230e",
          "sku": "LAPTOP-200",
          "name": "Laptop 200"
        },
        "warehouseId": {
          "_id": "6ab0fb28a8cacebdb9dd230f",
          "name": "Warehouse A"
        },
        "availableQuantity": 8,
        "reorderLevel": 10
      }
    ]
  }
}
```

---

## 5. Adjust Inventory

### Endpoint

```http
POST /api/inventory/adjust
```

### Description

Manually adjusts stock for a product in a warehouse. This operation also creates a stock movement record.

### Request Body

```json
{
  "productId": "64d9f7c9b2d4e21f8e7a1234",
  "warehouseId": "64d9f7c9b2d4e21f8e7a5678",
  "quantity": -5,
  "reason": "Damaged items"
}
```

### Example Curl

```bash
curl -X POST http://localhost:5000/api/inventory/adjust \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "productId": "64d9f7c9b2d4e21f8e7a1234",
    "warehouseId": "64d9f7c9b2d4e21f8e7a5678",
    "quantity": -5,
    "reason": "Damaged items"
  }'
```

### Success Response

```json
{
  "success": true,
  "message": "Inventory adjusted successfully",
  "data": {
    "_id": "6ab0fc50fd4b4d6f8b8d1d89",
    "productId": "64d9f7c9b2d4e21f8e7a1234",
    "warehouseId": "64d9f7c9b2d4e21f8e7a5678",
    "quantity": 45,
    "reservedQuantity": 0,
    "availableQuantity": 45,
    "version": 1
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Adjustment would result in negative inventory",
  "error": {
    "code": "INSUFFICIENT_STOCK"
  }
}
```

---

## 6. Update Inventory Record

### Endpoint

```http
PATCH /api/inventory/:id
```

### Example Curl

```bash
curl -X PATCH http://localhost:5000/api/inventory/64d9f7c9b2d4e21f8e7a9999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "reorderLevel": 15
  }'
```

### Success Response

```json
{
  "success": true,
  "message": "Inventory updated successfully",
  "data": {
    "_id": "64d9f7c9b2d4e21f8e7a9999",
    "reorderLevel": 15
  }
}
```

---

## 7. Common Error Codes

- PRODUCT_NOT_FOUND
- WAREHOUSE_NOT_FOUND
- INVENTORY_ALREADY_EXISTS
- INVENTORY_NOT_FOUND
- VALIDATION_ERROR
- INSUFFICIENT_STOCK
- FORBIDDEN
- AUTH_REQUIRED

---

## 8. Notes

- Inventory is always tracked by product and warehouse.
- availableQuantity is calculated as quantity minus reservedQuantity.
- Every stock-changing action should create a stock movement record.
- Low stock is checked in the backend, not on the frontend.

---

## 9. Related Models

- Product model: backend/models/product.model.js
- Warehouse model: backend/models/warehouse.js
- Inventory model: backend/models/inventory.model.js
- Stock movement model: backend/models/stockMovement.model.js

This file is now available in the project at [docs/inventory-api.md](inventory-api.md).
