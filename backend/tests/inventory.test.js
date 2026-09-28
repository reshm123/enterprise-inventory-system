import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import app from "../app.js";
import { connectdb } from "../config/db.js";
import User from "../models/user.model.js";
import StockMovement from "../models/stockMovement.model.js";
import AuditLog from "../models/auditLog.model.js";
import Inventory from "../models/inventory.model.js";
import PurchaseOrder from "../models/purchaseOrder.model.js";
import StockTransfer from "../models/stockTransfer.model.js";
import Supplier from "../models/Supplier.js";
import Warehouse from "../models/warehouse.js";
import { receivePurchaseOrderService } from "../services/purchaseOrder.service.js";
import { approveStockTransferService } from "../services/stockTransfer.service.js";

let mongoServer;
let authToken;
let warehouseId;
let productId;
let inventoryId;
let userId;

const jwtSign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

beforeAll(async () => {
  mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.JWT_SECRET = "test-secret";
  process.env.JWT_EXPIRES_IN = "1d";

  await connectdb();

  const user = await User.create({
    name: "Inventory Admin",
    email: "admin@inventory.test",
    password: "Password123!",
    role: "Warehouse Manager",
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

describe("Inventory management API", () => {
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

  it("does not allow public registration to grant a privileged role", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Role Escalation",
        email: "role-escalation@inventory.test",
        password: "Password123!",
        role: "Admin"
      });

    expect(response.status).toBe(201);
    expect(response.body.data.role).toBe("Warehouse Staff");
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
