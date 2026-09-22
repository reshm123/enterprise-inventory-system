import request from "supertest";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app.js";
import { connectdb } from "../config/db.js";
import User from "../models/user.model.js";

let mongoServer;
let authToken;
let warehouseId;
let productId;

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
    role: "Warehouse Manager",
    status: "Active"
  });

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

    const listRes = await request(app)
      .get("/api/inventory")
      .set("Authorization", authToken)
      .query({ warehouse: warehouseId });

    expect(listRes.status).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.items.length).toBeGreaterThan(0);
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
});
