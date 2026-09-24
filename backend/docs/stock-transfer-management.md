# Stock Transfer Management

## 1. Purpose

Stock transfers move products between two active warehouses through a controlled workflow.

The transfer workflow is:

```text
Draft -> Requested -> Approved -> In Transit -> Received
```

A transfer may be cancelled while it is `Draft`, `Requested`, or `Approved`.

The backend validates source stock before approval. A transfer cannot reserve more than the source warehouse's `availableQuantity`, so it cannot create negative available stock.

## 2. API Endpoints

Base URL:

```text
http://localhost:5000/api/stock-transfers
```

| Method | Endpoint | Roles | Purpose |
|---|---|---|---|
| POST | `/` | Admin, Warehouse Manager, Warehouse Staff | Create a draft transfer |
| GET | `/` | Admin, Procurement Manager, Warehouse Manager, Warehouse Staff, Inventory Auditor | List transfers |
| GET | `/:id` | Admin, Procurement Manager, Warehouse Manager, Warehouse Staff, Inventory Auditor | Get one transfer |
| POST | `/:id/request` | Admin, Warehouse Manager, Warehouse Staff | Submit a draft |
| POST | `/:id/approve` | Admin, Warehouse Manager | Approve and reserve source stock |
| POST | `/:id/ship` | Admin, Warehouse Manager, Warehouse Staff | Remove reserved stock and mark in transit |
| POST | `/:id/receive` | Admin, Warehouse Manager, Warehouse Staff | Add stock to the destination warehouse |
| POST | `/:id/cancel` | Admin, Warehouse Manager, Warehouse Staff | Cancel a permitted transfer |

All endpoints require:

```http
Authorization: Bearer YOUR_JWT_TOKEN
```

## 3. PowerShell curl Workflow

Set the required values:

```powershell
$TOKEN = "YOUR_JWT_TOKEN"
$PRODUCT_ID = "PRODUCT_ID"
$FROM_WAREHOUSE_ID = "WAREHOUSE_A_ID"
$TO_WAREHOUSE_ID = "WAREHOUSE_B_ID"
```

### 3.1 Create a transfer

```powershell
curl.exe -X POST "http://localhost:5000/api/stock-transfers" `
  -H "Authorization: Bearer $TOKEN" `
  -H "Content-Type: application/json" `
  -d '{"transferNumber":"TR-1001","fromWarehouse":"'$FROM_WAREHOUSE_ID'","toWarehouse":"'$TO_WAREHOUSE_ID'","items":[{"productId":"'$PRODUCT_ID'","quantity":100}]}'
```

Save the returned transfer `_id` as `TRANSFER_ID`.

### 3.2 Request the transfer

```powershell
curl.exe -X POST "http://localhost:5000/api/stock-transfers/TRANSFER_ID/request" `
  -H "Authorization: Bearer $TOKEN"
```

### 3.3 Approve the transfer

```powershell
curl.exe -X POST "http://localhost:5000/api/stock-transfers/TRANSFER_ID/approve" `
  -H "Authorization: Bearer $TOKEN"
```

Approval checks that the source warehouse has enough available stock and reserves the quantity.

### 3.4 Ship the transfer

```powershell
curl.exe -X POST "http://localhost:5000/api/stock-transfers/TRANSFER_ID/ship" `
  -H "Authorization: Bearer $TOKEN"
```

Shipping decreases source `quantity` and `reservedQuantity`. The transfer becomes `In Transit`.

### 3.5 Receive the transfer

```powershell
curl.exe -X POST "http://localhost:5000/api/stock-transfers/TRANSFER_ID/receive" `
  -H "Authorization: Bearer $TOKEN"
```

Receiving increases destination `quantity` and `availableQuantity`. The transfer becomes `Received`.

## 4. Request Body

Create-transfer request:

```json
{
  "transferNumber": "TR-1001",
  "fromWarehouse": "SOURCE_WAREHOUSE_ID",
  "toWarehouse": "DESTINATION_WAREHOUSE_ID",
  "items": [
    {
      "productId": "PRODUCT_ID",
      "quantity": 100
    }
  ]
}
```

The source and destination warehouses must be different, active warehouses. Each product may appear only once in a transfer.

## 5. Insufficient Stock Response

If available stock is `80` and the transfer requests `100`, approval is rejected:

```json
{
  "success": false,
  "message": "Insufficient stock for product PRODUCT_ID",
  "error": {
    "code": "INSUFFICIENT_STOCK"
  }
}
```

The response status is:

```text
400 Bad Request
```

No reservation is kept when approval fails.

## 6. Stock Movements

The following movements are created automatically:

| Action | Movement type | Warehouse |
|---|---|---|
| Ship transfer | `STOCK_TRANSFER_OUT` | Source |
| Receive transfer | `STOCK_TRANSFER_IN` | Destination |

Inventory updates and movement creation run together in a MongoDB transaction when MongoDB is configured as a replica set. In local development with standalone MongoDB, the service uses its development fallback and still performs conditional stock checks to prevent negative inventory.

## 7. Concurrency Handling

Source stock is protected at the database write boundary. During transfer approval, the service does not read `availableQuantity` and then update it separately. It performs one atomic `findOneAndUpdate` with this condition:

```js
{
  productId: item.productId,
  warehouseId: transfer.fromWarehouse,
  availableQuantity: { $gte: item.quantity }
}
```

The same atomic update reserves stock and decreases availability:

```js
{
  $inc: {
    reservedQuantity: item.quantity,
    availableQuantity: -item.quantity,
    version: 1
  }
}
```

For example, with `availableQuantity = 100`, concurrent requests for `80` and `50` cannot both match the condition. One request atomically reserves its quantity; the other update returns no document and fails with `INSUFFICIENT_STOCK`. The result is either `20` or `50` available stock, never `-30`.

When MongoDB runs as a replica set, approval, transfer state changes, and related writes execute inside a transaction. The conditional update remains the protection against overselling at the inventory-document level. The standalone development fallback retains the atomic conditional update, but a replica set is recommended for all-or-nothing multi-document behavior.

## 8. Implementation Files

| Layer | File |
|---|---|
| Model | [stockTransfer.model.js](../models/stockTransfer.model.js) |
| Service | [stockTransfer.service.js](../services/stockTransfer.service.js) |
| Inventory concurrency control | [stockTransfer.service.js](../services/stockTransfer.service.js), `approveStockTransferService` |
| Inventory version field and indexes | [inventory.model.js](../models/inventory.model.js) |
| Controller | [stockTransfer.controller.js](../controllers/stockTransfer.controller.js) |
| Routes | [stockTransfer.routes.js](../routes/stockTransfer.routes.js) |
| App registration | [app.js](../app.js) |
