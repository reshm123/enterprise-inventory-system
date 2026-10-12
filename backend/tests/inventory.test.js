import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { connectdb } from "../config/db.js";
import User from "../models/user.model.js";
import StockMovement from "../models/stockMovement.model.js";
import AuditLog from "../models/auditLog.model.js";
import Inventory from "../models/inventory.model.js";
import Product from "../models/product.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";
import StockTransfer from "../models/stockTransfer.model.js";
import Supplier from "../models/Supplier.js";
import Warehouse from "../models/warehouse.js";
import { receivePurchaseOrderService } from "../services/purchaseOrder.service.js";
import { approveStockTransferService, cancelStockTransferService } from "../services/stockTransfer.service.js";
import { authorizeRoles } from "../middleware/role.middleware.js";

let mongoServer;
let authToken;
let warehouseId;
let productId;
let inventoryId;
let userId;

const jwtSign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "1d";

  await connectdb();

  const user = await User.create({
    name: "Inventory Admin",
    email: "admin@inventory.test",
    password: "Password123!",
    role: "Admin",
    status: "Active"
  });
  userId = user._id.toString();

  authToken = `Bearer ${jwtSign({ id: user._id.toString(), role: user.role, tokenVersion: user.tokenVersion })}`;

  const warehouseRes = await request(app)
    .post("/api/warehouse")
    .set("Authorization", authToken)
    .send({
      name: "Warehouse A",
      code: "WH-A-01",
      location: "Noida",
      managerId: user._id.toString()
    });

  warehouseId = warehouseRes.body.data._id;

  const productRes = await request(app)
    .post("/api/product")
    .set("Authorization", authToken)
    .send({
      sku: "LAPTOP-100",
      name: "Laptop 100",
      description: "Business laptop",
      category: "Electronics",
      brand: "Dell",
      unitPrice: 50000,
      reorderLevel: 10,
      status: "Active"
    });

  productId = productRes.body.data._id;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe("Role and access validation", () => {
  it("does not continue the request chain when the user is missing", () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    expect(() => authorizeRoles("Admin")(req, res, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("accepts role arrays and blocks suspended users from protected APIs", () => {
    const suspendedReq = {
      user: {
        role: "Warehouse Staff",
        status: "Suspended"
      }
    };
    const allowedReq = {
      user: {
        role: "Warehouse Staff",
        status: "Active"
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    const next = jest.fn();

    expect(() => authorizeRoles(["Admin", "Warehouse Staff"])(suspendedReq, res, next)).not.toThrow();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();

    expect(() => authorizeRoles(["Admin", "Warehouse Staff"])(allowedReq, res, next)).not.toThrow();
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe("Inventory management API", () => {
  it("allows the local frontend origin through CORS preflight", async () => {
    const response = await request(app)
      .options("/api/auth/login")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(response.headers["access-control-allow-methods"]).toContain("POST");
  });

  it("registers, logs in, fetches the current user, and invalidates the token on logout", async () => {
    const email = `auth-workflow-${new mongoose.Types.ObjectId()}@inventory.test`;
    const registrationResponse = await request(app)
      .post("/api/auth/register")
      .send({ name: "Auth Workflow User", email, password: "Password123!", role: "Warehouse Staff" });

    expect(registrationResponse.status).toBe(201);
    expect(registrationResponse.body.data.role).toBe("Warehouse Staff");

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: email.toUpperCase(), password: "Password123!" });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.token).toBeTruthy();
    const sessionToken = `Bearer ${loginResponse.body.data.token}`;

    const missingTokenResponse = await request(app).get("/api/auth/me");
    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body.error.code).toBe("MISSING_TOKEN");

    const invalidTokenResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid.token.here");
    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body.error.code).toBe("INVALID_TOKEN");

    const currentUserResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", sessionToken);
    expect(currentUserResponse.status).toBe(200);
    expect(currentUserResponse.body.data.email).toBe(email);

    const logoutResponse = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", sessionToken);
    expect(logoutResponse.status).toBe(200);

    const invalidatedTokenResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", sessionToken);
    expect(invalidatedTokenResponse.status).toBe(401);
    expect(invalidatedTokenResponse.body.error.code).toBe("TOKEN_INVALIDATED");

    const invalidCredentialsResponse = await request(app)
      .post("/api/auth/login")
      .send({ email, password: "WrongPassword123!" });
    expect(invalidCredentialsResponse.status).toBe(401);
    expect(invalidCredentialsResponse.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("rejects login and protected requests for inactive accounts", async () => {
    const suspendedUser = await User.create({
      name: "Suspended User",
      email: "suspended-auth@inventory.test",
      password: "Password123!",
      role: "Warehouse Staff",
      status: "Suspended"
    });
    const suspendedToken = `Bearer ${jwtSign({ id: suspendedUser._id.toString(), role: suspendedUser.role, tokenVersion: suspendedUser.tokenVersion })}`;

    const loginResponse = await request(app)
      .post("/api/auth/login")
      .send({ email: suspendedUser.email, password: "Password123!" });
    expect(loginResponse.status).toBe(409);
    expect(loginResponse.body.error.code).toBe("ACCOUNT_NOT_ACTIVE");

    const currentUserResponse = await request(app)
      .get("/api/auth/me")
      .set("Authorization", suspendedToken);
    expect(currentUserResponse.status).toBe(403);
    expect(currentUserResponse.body.error.code).toBe("TOKEN_INVALIDATED");
  });

  it("lists audit history for authorized users with pagination metadata", async () => {
    await AuditLog.create({
      action: "AUDIT_HISTORY_TEST",
      entityType: "Inventory",
      entityId: new mongoose.Types.ObjectId(),
      performedBy: userId,
      details: { reason: "Audit endpoint test" }
    });

    const response = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", authToken)
      .query({ action: "AUDIT_HISTORY_TEST", page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0].performedBy.name).toBe("Inventory Admin");
    expect(response.body.data.items[0].details.reason).toBe("Audit endpoint test");
  });

  it("records stock-transfer creation and request in audit history", async () => {
    const destination = await Warehouse.create({
      name: "Transfer Audit Destination",
      code: "WH-AUDIT-01",
      location: "Delhi",
      status: "ACTIVE"
    });
    const createResponse = await request(app)
      .post("/api/stock-transfers")
      .set("Authorization", authToken)
      .send({
        transferNumber: "TR-AUDIT-1",
        fromWarehouse: warehouseId,
        toWarehouse: destination._id.toString(),
        items: [{ productId, quantity: 1 }]
      });

    expect(createResponse.status).toBe(201);
    const transferId = createResponse.body.data._id;
    const requestResponse = await request(app)
      .post(`/api/stock-transfers/${transferId}/request`)
      .set("Authorization", authToken);

    expect(requestResponse.status).toBe(200);
    const auditResponse = await request(app)
      .get("/api/audit-logs")
      .set("Authorization", authToken)
      .query({ entityType: "StockTransfer", limit: 10 });

    expect(auditResponse.status).toBe(200);
    expect(auditResponse.body.data.items.map((record) => record.action)).toEqual(
      expect.arrayContaining(["STOCK_TRANSFER_CREATED", "STOCK_TRANSFER_REQUESTED"])
    );
  });

  it("searches, sorts, and paginates stock transfers in the API", async () => {
    await StockTransfer.create([
      {
        transferNumber: "TR-PERF-001",
        fromWarehouse: warehouseId,
        toWarehouse: warehouseId,
        items: [{ productId, quantity: 1 }],
        requestedBy: userId
      },
      {
        transferNumber: "TR-PERF-002",
        fromWarehouse: warehouseId,
        toWarehouse: warehouseId,
        items: [{ productId, quantity: 1 }],
        requestedBy: userId
      }
    ]);

    const response = await request(app)
      .get("/api/stock-transfers")
      .set("Authorization", authToken)
      .query({ search: "tr-perf-", sortBy: "transferNumber", sortOrder: "asc", page: 2, limit: 1 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      total: 2,
      page: 2,
      limit: 1,
      totalPages: 2
    });
    expect(response.body.data.items.map((transfer) => transfer.transferNumber)).toEqual(["TR-PERF-002"]);
  });

  it("creates stock and lists inventory for a warehouse", async () => {
    const createRes = await request(app)
      .post("/api/inventory")
      .set("Authorization", authToken)
      .send({
        productId,
        warehouseId,
        quantity: 50,
        reorderLevel: 10
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.quantity).toBe(50);
    inventoryId = createRes.body.data._id;
    expect(await StockMovement.countDocuments({ reference: "INITIAL_STOCK" })).toBe(1);
    expect(await AuditLog.countDocuments({ action: "INVENTORY_CREATED" })).toBe(1);

    const listRes = await request(app)
      .get("/api/inventory")
      .set("Authorization", authToken)
      .query({ warehouse: warehouseId });

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.items.length).toBeGreaterThan(0);
  });

  it("applies inventory product search and category together", async () => {
    const otherProduct = await Product.create({
      sku: "PAPER-CLIPS",
      name: "Paper Clips",
      category: "Office",
      unitPrice: 1,
      reorderLevel: 0
    });
    await Inventory.create({
      productId: otherProduct._id,
      warehouseId,
      quantity: 5,
      availableQuantity: 5
    });

    const response = await request(app)
      .get("/api/inventory")
      .set("Authorization", authToken)
      .query({ search: "laptop", category: "Office" });

    expect(response.status).toBe(200);
    expect(response.body.data.items).toHaveLength(0);
  });

  it("respects the requested role during registration", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Role Escalation",
        email: "role-escalation@inventory.test",
        password: "Password123!",
        role: "Admin"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe("Admin");
  });

  it("allows admins to list users and update a user role", async () => {
    const adminUser = await User.create({
      name: "System Admin",
      email: "system-admin@inventory.test",
      password: "Password123!",
      role: "Admin",
      status: "Active"
    });

    const targetUser = await User.create({
      name: "Warehouse Agent",
      email: "warehouse-agent@inventory.test",
      password: "Password123!",
      role: "Warehouse Staff",
      status: "Active"
    });

    const adminToken = `Bearer ${jwtSign({ id: adminUser._id.toString(), role: adminUser.role, tokenVersion: adminUser.tokenVersion })}`;

    const listResponse = await request(app)
      .get("/api/users")
      .set("Authorization", adminToken);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.success).toBe(true);
    expect(listResponse.body.data.some((user) => user.email === "warehouse-agent@inventory.test")).toBe(true);

    const updateResponse = await request(app)
      .patch(`/api/users/${targetUser._id}/role`)
      .set("Authorization", adminToken)
      .send({ role: "Procurement Manager" });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.role).toBe("Procurement Manager");
  });

  it("limits warehouse staff dashboard data to assigned warehouse scope", async () => {
    const staffUser = await User.create({
      name: "Warehouse Staff User",
      email: "warehouse-staff-dashboard@inventory.test",
      password: "Password123!",
      role: "Warehouse Staff",
      status: "Active",
      warehouseIds: [warehouseId]
    });

    const staffToken = `Bearer ${jwtSign({ id: staffUser._id.toString(), role: staffUser.role, tokenVersion: staffUser.tokenVersion })}`;

    const response = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", staffToken);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalPurchaseValue).toBe(0);
    expect(response.body.data.pendingPurchaseOrders).toBe(0);
    expect(response.body.data.totalSuppliers).toBe(0);
    expect(response.body.data.inventoryByWarehouse.every((entry) => entry.warehouseId.toString() === warehouseId.toString())).toBe(true);
  });

  it("rejects direct inventory quantity changes", async () => {
    const response = await request(app)
      .patch(`/api/inventory/${inventoryId}`)
      .set("Authorization", authToken)
      .send({ quantity: 500 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("INVALID_INVENTORY_UPDATE");
  });

  it("flags low stock and supports stock adjustment", async () => {
    const lowStockRes = await request(app)
      .get("/api/inventory/low-stock")
      .set("Authorization", authToken);

    expect(lowStockRes.status).toBe(200);
    expect(lowStockRes.body.success).toBe(true);
    expect(lowStockRes.body.data.total).toBeGreaterThanOrEqual(0);

    const adjustmentRes = await request(app)
      .post("/api/inventory/adjust")
      .set("Authorization", authToken)
      .send({
        productId,
        warehouseId,
        quantity: -5,
        reason: "Damage"
      });

    expect(adjustmentRes.status).toBe(200);
    expect(adjustmentRes.body.success).toBe(true);
    expect(adjustmentRes.body.data.quantity).toBe(45);
  });

  it("enforces the stock-adjustment role matrix", async () => {
    const auditor = await User.create({
      name: "Audit Reviewer",
      email: "audit-reviewer@inventory.test",
      password: "Password123!",
      role: "Inventory Auditor",
      status: "Active"
    });

    const staff = await User.create({
      name: "Warehouse Clerk",
      email: "warehouse-clerk@inventory.test",
      password: "Password123!",
      role: "Warehouse Staff",
      status: "Active"
    });

    const auditorToken = `Bearer ${jwtSign({ id: auditor._id.toString(), role: auditor.role, tokenVersion: auditor.tokenVersion })}`;
    const staffToken = `Bearer ${jwtSign({ id: staff._id.toString(), role: staff.role, tokenVersion: staff.tokenVersion })}`;

    const allowedResponse = await request(app)
      .post("/api/inventory/adjust")
      .set("Authorization", auditorToken)
      .send({
        productId,
        warehouseId,
        quantity: -2,
        reason: "Audit verification"
      });

    expect(allowedResponse.status).toBe(200);
    expect(allowedResponse.body.success).toBe(true);

    const deniedResponse = await request(app)
      .post("/api/inventory/adjust")
      .set("Authorization", staffToken)
      .send({
        productId,
        warehouseId,
        quantity: -3,
        reason: "Unauthorized instruction"
      });

    expect(deniedResponse.status).toBe(403);
    expect(deniedResponse.body.error.code).toBe("FORBIDDEN");
  });

  it("rejects invalid stock reduction below zero", async () => {
    const invalidRes = await request(app)
      .post("/api/inventory/adjust")
      .set("Authorization", authToken)
      .send({
        productId,
        warehouseId,
        quantity: -100,
        reason: "Invalid adjustment"
      });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.success).toBe(false);
  });

  it("receives purchase orders transactionally and rejects over-receiving", async () => {
    const inventoryBeforeReceipt = await Inventory.findOne({ productId, warehouseId });
    const quantityBeforeReceipt = inventoryBeforeReceipt.quantity;
    const supplier = await Supplier.create({
      name: "Test Supplier",
      email: "supplier@inventory.test",
      phone: "+1 555 0100",
      address: "1 Test Street",
      contactPerson: "Test Contact"
    });
    const purchaseOrder = await PurchaseOrder.create({
      poNumber: "PO-TRANSACTION-1",
      supplierId: supplier._id,
      warehouseId,
      items: [{ productId, quantity: 10, unitPrice: 100, receivedQuantity: 0, pendingQuantity: 10 }],
      totalAmount: 1000,
      status: "Approved",
      createdBy: userId
    });

    await receivePurchaseOrderService(purchaseOrder._id.toString(), [{ productId, quantity: 4 }], { id: userId });
    let savedOrder = await PurchaseOrder.findById(purchaseOrder._id);
    let inventory = await Inventory.findOne({ productId, warehouseId });
    expect(savedOrder.status).toBe("Partially Received");
    expect(savedOrder.items[0].pendingQuantity).toBe(6);
    expect(inventory.quantity).toBe(quantityBeforeReceipt + 4);

    await expect(
      receivePurchaseOrderService(purchaseOrder._id.toString(), [{ productId, quantity: 7 }], { id: userId })
    ).rejects.toMatchObject({ code: "OVER_RECEIVING_NOT_ALLOWED" });
    inventory = await Inventory.findOne({ productId, warehouseId });
    expect(inventory.quantity).toBe(quantityBeforeReceipt + 4);

    await receivePurchaseOrderService(purchaseOrder._id.toString(), [{ productId, quantity: 6 }], { id: userId });
    savedOrder = await PurchaseOrder.findById(purchaseOrder._id);
    inventory = await Inventory.findOne({ productId, warehouseId });
    expect(savedOrder.status).toBe("Fully Received");
    expect(inventory.quantity).toBe(quantityBeforeReceipt + 10);
    expect(await AuditLog.countDocuments({ entityId: purchaseOrder._id, action: "PURCHASE_ORDER_RECEIVED" })).toBe(2);
  });

  it("requires a purchase order to be submitted before approval", async () => {
    const approver = await User.create({
      name: "Approval Manager",
      email: "approver@inventory.test",
      password: "Password123!",
      role: "Procurement Manager",
      status: "Active"
    });

    const supplier = await Supplier.create({
      name: "Approval Supplier",
      email: "approval-supplier@inventory.test",
      phone: "+1 555 0199",
      address: "2 Approval Road",
      contactPerson: "Approval Contact"
    });

    const po = await PurchaseOrder.create({
      poNumber: "PO-APPROVAL-1",
      supplierId: supplier._id,
      warehouseId: warehouseId,
      items: [{ productId, quantity: 15, unitPrice: 100, receivedQuantity: 0, pendingQuantity: 15 }],
      totalAmount: 1500,
      status: "Draft",
      createdBy: userId
    });

    const approverToken = `Bearer ${jwtSign({ id: approver._id.toString(), role: approver.role, tokenVersion: approver.tokenVersion })}`;

    const invalidApprovalResponse = await request(app)
      .post(`/api/purchase-orders/${po._id}/approve`)
      .set("Authorization", approverToken);

    expect(invalidApprovalResponse.status).toBe(409);
    expect(invalidApprovalResponse.body.error.code).toBe("INVALID_PO_STATE");

    const submitResponse = await request(app)
      .post(`/api/purchase-orders/${po._id}/submit`)
      .set("Authorization", approverToken);

    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.data.status).toBe("Pending Approval");

    const selfApprovalResponse = await request(app)
      .post(`/api/purchase-orders/${po._id}/approve`)
      .set("Authorization", authToken);
    expect(selfApprovalResponse.status).toBe(403);
    expect(selfApprovalResponse.body.error.code).toBe("SEPARATION_OF_DUTIES_REQUIRED");
  });

  it("approves and receives a purchase order through the API", async () => {
    const supplier = await Supplier.create({
      name: "PO API Workflow Supplier",
      email: `po-workflow-${new mongoose.Types.ObjectId()}@inventory.test`,
      phone: "+1 555 0177",
      address: "3 Workflow Street",
      contactPerson: "Workflow Contact"
    });
    const approver = await User.create({
      name: "PO API Approver",
      email: `po-approver-${new mongoose.Types.ObjectId()}@inventory.test`,
      password: "Password123!",
      role: "Procurement Manager",
      status: "Active"
    });
    const approverToken = `Bearer ${jwtSign({ id: approver._id.toString(), role: approver.role, tokenVersion: approver.tokenVersion })}`;
    let inventoryBefore = await Inventory.findOne({ productId, warehouseId });
    if (!inventoryBefore) {
      inventoryBefore = await Inventory.create({
        productId,
        warehouseId,
        quantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        reorderLevel: 0
      });
    }
    const orderedQuantity = 5;

    const createResponse = await request(app)
      .post("/api/purchase-orders")
      .set("Authorization", authToken)
      .send({
        poNumber: `PO-API-${new mongoose.Types.ObjectId()}`,
        supplierId: supplier._id.toString(),
        warehouseId,
        items: [{ productId, quantity: orderedQuantity, unitPrice: 25 }]
      });

    expect(createResponse.status).toBe(201);
    const purchaseOrderId = createResponse.body.data._id;
    expect(createResponse.body.data.status).toBe("Draft");
    expect(createResponse.body.data.totalAmount).toBe(orderedQuantity * 25);

    const submitResponse = await request(app)
      .post(`/api/purchase-orders/${purchaseOrderId}/submit`)
      .set("Authorization", authToken);
    expect(submitResponse.status).toBe(200);
    expect(submitResponse.body.data.status).toBe("Pending Approval");

    const approveResponse = await request(app)
      .post(`/api/purchase-orders/${purchaseOrderId}/approve`)
      .set("Authorization", approverToken)
      .send({ comment: "API workflow approval" });
    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.data.status).toBe("Approved");
    expect(approveResponse.body.data.approvedBy.toString()).toBe(approver._id.toString());

    const auditor = await User.create({
      name: "Receiving Auditor",
      email: `receiving-auditor-${new mongoose.Types.ObjectId()}@inventory.test`,
      password: "Password123!",
      role: "Inventory Auditor",
      status: "Active"
    });
    const auditorToken = `Bearer ${jwtSign({ id: auditor._id.toString(), role: auditor.role, tokenVersion: auditor.tokenVersion })}`;
    const unauthorizedReceiptResponse = await request(app)
      .post(`/api/purchase-orders/${purchaseOrderId}/receive`)
      .set("Authorization", auditorToken)
      .send({ items: [{ productId, quantity: 1 }] });
    expect(unauthorizedReceiptResponse.status).toBe(403);
    expect(unauthorizedReceiptResponse.body.error.code).toBe("FORBIDDEN");

    const partialReceiptResponse = await request(app)
      .post(`/api/purchase-orders/${purchaseOrderId}/receive`)
      .set("Authorization", authToken)
      .send({ items: [{ productId, quantity: 2 }] });
    expect(partialReceiptResponse.status).toBe(200);
    expect(partialReceiptResponse.body.data.status).toBe("Partially Received");

    const inventoryAfterPartialReceipt = await Inventory.findOne({ productId, warehouseId });
    const overReceiptResponse = await request(app)
      .post(`/api/purchase-orders/${purchaseOrderId}/receive`)
      .set("Authorization", authToken)
      .send({ items: [{ productId, quantity: 4 }] });
    expect(overReceiptResponse.status).toBe(400);
    expect(overReceiptResponse.body.error.code).toBe("OVER_RECEIVING_NOT_ALLOWED");
    expect((await Inventory.findOne({ productId, warehouseId })).quantity).toBe(inventoryAfterPartialReceipt.quantity);

    const finalReceiptResponse = await request(app)
      .post(`/api/purchase-orders/${purchaseOrderId}/receive`)
      .set("Authorization", authToken)
      .send({ items: [{ productId, quantity: 3 }] });
    expect(finalReceiptResponse.status).toBe(200);
    expect(finalReceiptResponse.body.data.status).toBe("Fully Received");
    expect((await Inventory.findOne({ productId, warehouseId })).quantity).toBe(inventoryBefore.quantity + orderedQuantity);
    expect(await StockMovement.countDocuments({ reference: createResponse.body.data.poNumber, type: "PURCHASE_RECEIPT" })).toBe(2);
  });

  it("completes a stock transfer through request, approval, shipping, and receipt APIs", async () => {
    const destination = await Warehouse.create({
      name: "Transfer API Destination",
      code: `WH-${new mongoose.Types.ObjectId().toString().slice(-8)}`,
      location: "Workflow City"
    });
    const sourceBefore = await Inventory.findOne({ productId, warehouseId });
    const destinationBefore = await Inventory.findOne({ productId, warehouseId: destination._id });
    const transferQuantity = 2;

    const createResponse = await request(app)
      .post("/api/stock-transfers")
      .set("Authorization", authToken)
      .send({
        transferNumber: `TR-API-${new mongoose.Types.ObjectId()}`,
        fromWarehouse: warehouseId,
        toWarehouse: destination._id.toString(),
        items: [{ productId, quantity: transferQuantity }]
      });
    expect(createResponse.status).toBe(201);
    const transferId = createResponse.body.data._id;
    expect(createResponse.body.data.status).toBe("Draft");

    const requestResponse = await request(app)
      .post(`/api/stock-transfers/${transferId}/request`)
      .set("Authorization", authToken);
    expect(requestResponse.status).toBe(200);
    expect(requestResponse.body.data.status).toBe("Requested");

    const procurementManager = await User.create({
      name: "Transfer Approver",
      email: `transfer-approver-${new mongoose.Types.ObjectId()}@inventory.test`,
      password: "Password123!",
      role: "Procurement Manager",
      status: "Active"
    });
    const procurementToken = `Bearer ${jwtSign({ id: procurementManager._id.toString(), role: procurementManager.role, tokenVersion: procurementManager.tokenVersion })}`;
    const unauthorizedApprovalResponse = await request(app)
      .post(`/api/stock-transfers/${transferId}/approve`)
      .set("Authorization", procurementToken);
    expect(unauthorizedApprovalResponse.status).toBe(403);
    expect(unauthorizedApprovalResponse.body.error.code).toBe("FORBIDDEN");

    const approvalResponse = await request(app)
      .post(`/api/stock-transfers/${transferId}/approve`)
      .set("Authorization", authToken);
    expect(approvalResponse.status).toBe(200);
    expect(approvalResponse.body.data.status).toBe("Approved");
    expect((await Inventory.findOne({ productId, warehouseId })).availableQuantity).toBe(sourceBefore.availableQuantity - transferQuantity);

    const shipResponse = await request(app)
      .post(`/api/stock-transfers/${transferId}/ship`)
      .set("Authorization", authToken);
    expect(shipResponse.status).toBe(200);
    expect(shipResponse.body.data.status).toBe("In Transit");

    const receiveResponse = await request(app)
      .post(`/api/stock-transfers/${transferId}/receive`)
      .set("Authorization", authToken);
    expect(receiveResponse.status).toBe(200);
    expect(receiveResponse.body.data.status).toBe("Received");

    const sourceAfter = await Inventory.findOne({ productId, warehouseId });
    const destinationAfter = await Inventory.findOne({ productId, warehouseId: destination._id });
    expect(sourceAfter.quantity).toBe(sourceBefore.quantity - transferQuantity);
    expect(sourceAfter.availableQuantity).toBe(sourceBefore.availableQuantity - transferQuantity);
    expect(destinationAfter.quantity).toBe((destinationBefore?.quantity || 0) + transferQuantity);
    expect(destinationAfter.availableQuantity).toBe((destinationBefore?.availableQuantity || 0) + transferQuantity);
    expect(await StockMovement.countDocuments({ reference: createResponse.body.data.transferNumber, type: { $in: ["STOCK_TRANSFER_OUT", "STOCK_TRANSFER_IN"] } })).toBe(2);
  });

  it("rejects cancelling an approved transfer when reserved stock is insufficient", async () => {
    const sourceInventory = await Inventory.findOne({ productId, warehouseId });
    const destination = await Warehouse.create({ name: "Warehouse C", code: "WH-C-01", location: "Pune" });
    const transfer = await StockTransfer.create({
      transferNumber: "TR-NEGATIVE-1",
      fromWarehouse: warehouseId,
      toWarehouse: destination._id,
      items: [{ productId, quantity: 8 }],
      status: "Approved",
      requestedBy: userId,
      approvedBy: userId
    });

    await Inventory.findOneAndUpdate(
      { _id: sourceInventory._id },
      { $set: { reservedQuantity: 3, availableQuantity: sourceInventory.availableQuantity - 3 } }
    );

    await expect(cancelStockTransferService(transfer._id.toString(), { id: userId })).rejects.toMatchObject({ code: "INSUFFICIENT_STOCK" });

    const updatedInventory = await Inventory.findById(sourceInventory._id);
    expect(updatedInventory.reservedQuantity).toBe(3);
  });

  it("prevents concurrent transfers from reserving more stock than available", async () => {
    const inventoryBeforeTransfers = await Inventory.findById(inventoryId);
    const destination = await Warehouse.create({ name: "Warehouse B", code: "WH-B-01", location: "Delhi" });
    const transfers = await StockTransfer.create([
      {
        transferNumber: "TR-CONCURRENT-1",
        fromWarehouse: warehouseId,
        toWarehouse: destination._id,
        items: [{ productId, quantity: 30 }],
        status: "Requested",
        requestedBy: userId
      },
      {
        transferNumber: "TR-CONCURRENT-2",
        fromWarehouse: warehouseId,
        toWarehouse: destination._id,
        items: [{ productId, quantity: 30 }],
        status: "Requested",
        requestedBy: userId
      }
    ]);

    const approvals = await Promise.allSettled(
      transfers.map((transfer) => approveStockTransferService(transfer._id.toString(), { id: userId }))
    );
    expect(approvals.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(approvals.filter((result) => result.status === "rejected")).toHaveLength(1);

    const inventory = await Inventory.findById(inventoryId);
    expect(inventory.availableQuantity).toBe(inventoryBeforeTransfers.availableQuantity - 30);
    expect(inventory.reservedQuantity).toBe(inventoryBeforeTransfers.reservedQuantity + 30);
  });
});
