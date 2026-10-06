import mongoose from "mongoose";
import Inventory from "../models/inventory.model.js";
import StockTransfer from "../models/stockTransfer.model.js";
import {
    getTotalProducts,
    getTotalWarehouse,
    getTotalSuppliers,
    getTotalInventoryUnit,
    getLowStockProducts,
    getOutOfStockProducts,
    getPendingPurchaseOrders,
    getPendingStockTransfers,
    getTotalPurchaseValue,
    getInventoryByWarehouse,
    getPurchaseOrderSummary
} from "../repositories/dashboard.repository.js";

const emptyPurchaseOrderSummary = () => ({
    Draft: 0,
    "Pending Approval": 0,
    Approved: 0,
    "Partially Received": 0,
    "Fully Received": 0,
    Cancelled: 0
});

const dashboardService = async (user = {}) => {
    const role = user.role;
    const warehouseIds = (user.warehouseIds || []).map((id) => id.toString());

    if (role === "Warehouse Staff") {
        const allowedWarehouseIds = warehouseIds.map((id) => new mongoose.Types.ObjectId(id));

        if (!allowedWarehouseIds.length) {
            return {
                totalProducts: 0,
                totalWarehouses: 0,
                totalSuppliers: 0,
                totalInventoryUnits: 0,
                lowStockProducts: 0,
                outOfStockProducts: 0,
                pendingPurchaseOrders: 0,
                pendingTransfers: 0,
                totalPurchaseValue: 0,
                inventoryByWarehouse: [],
                purchaseOrderSummary: emptyPurchaseOrderSummary()
            };
        }

        const [inventoryByWarehouse, lowStockResult, outOfStockResult] = await Promise.all([
            (await getInventoryByWarehouse()).filter((entry) => warehouseIds.includes(entry.warehouseId.toString())),
            Inventory.aggregate([
                { $match: { warehouseId: { $in: allowedWarehouseIds } } },
                { $lookup: { from: "products", localField: "productId", foreignField: "_id", as: "product" } },
                { $unwind: "$product" },
                { $match: { $expr: { $lte: ["$availableQuantity", "$reorderLevel"] } } },
                { $group: { _id: "$productId" } },
                { $count: "count" }
            ]),
            Inventory.aggregate([
                { $match: { warehouseId: { $in: allowedWarehouseIds }, availableQuantity: 0 } },
                { $group: { _id: "$productId" } },
                { $count: "count" }
            ])
        ]);

        const totalInventoryUnits = inventoryByWarehouse.reduce((total, item) => total + Number(item.units || 0), 0);
        const totalProducts = await Inventory.distinct("productId", { warehouseId: { $in: allowedWarehouseIds } });
        const pendingTransfers = await StockTransfer.countDocuments({
            status: { $in: ["Requested", "Approved", "In Transit"] },
            $or: [
                { fromWarehouse: { $in: allowedWarehouseIds } },
                { toWarehouse: { $in: allowedWarehouseIds } }
            ]
        });

        return {
            totalProducts: totalProducts.length,
            totalWarehouses: inventoryByWarehouse.length,
            totalSuppliers: 0,
            totalInventoryUnits,
            lowStockProducts: lowStockResult[0]?.count || 0,
            outOfStockProducts: outOfStockResult[0]?.count || 0,
            pendingPurchaseOrders: 0,
            pendingTransfers,
            totalPurchaseValue: 0,
            inventoryByWarehouse,
            purchaseOrderSummary: emptyPurchaseOrderSummary()
        };
    }

    const [
        totalProducts,
        totalWarehouse,
        totalSuppliers,
        totalInventoryUnit,
        lowStockProducts,
        outOfStockProducts,
        pendingPurchaseOrders,
        pendingStockTransfers,
        totalPurchaseValue,
        inventoryByWarehouse,
        purchaseOrderStatusResult
    ] = await Promise.all([
        getTotalProducts(),
        getTotalWarehouse(),
        getTotalSuppliers(),
        getTotalInventoryUnit(),
        getLowStockProducts(),
        getOutOfStockProducts(),
        getPendingPurchaseOrders(),
        getPendingStockTransfers(),
        getTotalPurchaseValue(),
        getInventoryByWarehouse(),
        getPurchaseOrderSummary()
    ]);

    const purchaseOrderSummary = {
        Draft: 0,
        "Pending Approval": 0,
        Approved: 0,
        "Partially Received": 0,
        "Fully Received": 0,
        Cancelled: 0
    };

    purchaseOrderStatusResult.forEach((item) => {
        if (Object.prototype.hasOwnProperty.call(purchaseOrderSummary, item._id)) {
            purchaseOrderSummary[item._id] = item.count;
        }
    });

    return {
        totalProducts,
        totalWarehouses: totalWarehouse,
        totalSuppliers,
        totalInventoryUnits: totalInventoryUnit,
        lowStockProducts,
        outOfStockProducts,
        pendingPurchaseOrders,
        pendingTransfers: pendingStockTransfers,
        totalPurchaseValue,
        inventoryByWarehouse,
        purchaseOrderSummary
    };
};

export default dashboardService;