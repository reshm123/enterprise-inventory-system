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

const dashboardService = async () => {
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
const purchaseOrderSummary ={
Draft:0,
"Pending Approval":0,
Approved:0,
"Partially Received": 0,
"Fully Received": 0,
 Cancelled: 0
};
 purchaseOrderStatusResult.forEach((item) => {
    if (Object.prototype.hasOwnProperty.call(
      purchaseOrderSummary,
      item._id
    )) {
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

}
export default dashboardService;