# Workflow Testing

This guide describes the automated API coverage for authentication, purchase orders, goods receiving, and stock transfers. The endpoint details are in [Authentication and Authorization](authentication-authorization.md), [Purchase Order Management](purchase-order-management.md), and [Stock Transfer Management](stock-transfer-management.md).

## Run the tests

From the repository root in PowerShell:

```powershell
Push-Location backend
npm test
Pop-Location
```

The tests use Jest, Supertest, and an in-memory MongoDB instance. The critical workflow tests can be run alone:

```powershell
Push-Location backend
npm test -- --runTestsByPath tests/inventory.test.js -t "registers, logs in, fetches the current user|rejects login and protected requests for inactive accounts|requires a purchase order to be submitted before approval|approves and receives a purchase order through the API|completes a stock transfer through request"
Pop-Location
```

## Covered workflows

| Workflow | API behavior asserted |
|---|---|
| Authentication | Registration, case-insensitive login, `GET /api/auth/me`, logout invalidation, invalid credentials, missing/invalid tokens, and inactive-account rejection |
| Purchase order approval | Reject approval before submission and creator self-approval; permit a different Procurement Manager to approve a pending order |
| Purchase order receiving | Reject auditors from receiving; verify partial and final receipt status, inventory and movements; reject over-receiving without changing inventory |
| Stock transfer | Create, request, approve, ship, and receive; deny Procurement Manager approval; verify reservations, source/destination quantities, and movements |
| Receiving safeguards | Service-level tests reject over-receiving and verify a failed receipt leaves inventory unchanged |
| Transfer safeguards | Service-level tests reject insufficient stock and concurrent approvals cannot reserve more than available stock |

The purchase-order and transfer API tests assert persisted workflow status and inventory changes, not just HTTP responses. Authentication verifies both issued-token lifecycle behavior and rejection at the protected endpoint boundary.

## Expected failure contracts

| Scenario | Expected response |
|---|---|
| Missing bearer token | `401` with `MISSING_TOKEN` |
| Malformed or invalid JWT | `401` with `INVALID_TOKEN` |
| Token used after logout | `401` with `TOKEN_INVALIDATED` |
| Suspended account login | `409` with `ACCOUNT_NOT_ACTIVE` |
| Suspended account using a token | `403` with `TOKEN_INVALIDATED` |
| Approve a draft PO | `409` with `INVALID_PO_STATE` |
| Creator approves their own pending PO | `403` with `SEPARATION_OF_DUTIES_REQUIRED` |
| Inventory Auditor attempts PO receiving | `403` with `FORBIDDEN` |
| Procurement Manager attempts transfer approval | `403` with `FORBIDDEN` |
| Receive more than the PO's pending quantity | `400` with `OVER_RECEIVING_NOT_ALLOWED`; inventory remains unchanged |

## Manual API smoke checks

Use active accounts and existing product, supplier, and warehouse IDs. Send a JWT as `Authorization: Bearer <token>`.

### Authentication

1. `POST /api/auth/login` with a valid email and password. Expect `200` and `data.token`.
2. `GET /api/auth/me` with that token. Expect `200` and the authenticated user.
3. `POST /api/auth/logout` with that token. Expect `200`.
4. Repeat `GET /api/auth/me` with the old token. Expect `401` with `TOKEN_INVALIDATED`.

### Purchase order and receiving

1. As Admin or Procurement Manager, `POST /api/purchase-orders` with `supplierId`, `warehouseId`, and `items: [{ productId, quantity, unitPrice }]`. Expect a `Draft` order.
2. `POST /api/purchase-orders/:id/submit`. Expect `Pending Approval`.
3. As a different Admin or Procurement Manager, `POST /api/purchase-orders/:id/approve`. Expect `Approved`.
4. As Admin, Warehouse Manager, or Warehouse Staff, `POST /api/purchase-orders/:id/receive` with `{ "items": [{ "productId": "PRODUCT_ID", "quantity": 2 }] }`. A partial receipt becomes `Partially Received`; receiving the remaining quantity becomes `Fully Received`.
5. Try to receive more than the remaining quantity. Expect `400` with `OVER_RECEIVING_NOT_ALLOWED`; inventory must remain unchanged.

### Stock transfer

1. As Admin, Warehouse Manager, or Warehouse Staff, `POST /api/stock-transfers` with different active source/destination warehouses and available source stock. Expect `Draft`.
2. `POST /api/stock-transfers/:id/request`, then `POST /api/stock-transfers/:id/approve`. Expect `Requested`, then `Approved`; approval reserves source availability.
3. `POST /api/stock-transfers/:id/ship`. Expect `In Transit`; source physical quantity decreases.
4. `POST /api/stock-transfers/:id/receive`. Expect `Received`; destination inventory increases and the inbound stock movement is recorded.

See [Stock Transfer Management](stock-transfer-management.md#3-powershell-curl-workflow) for PowerShell request examples. The complete Jest coverage is in [inventory.test.js](../tests/inventory.test.js).
