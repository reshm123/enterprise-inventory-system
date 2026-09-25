import Product from '../models/product.model.js';
import Warehouse from '../models/warehouse.js';
import Supplier from '../models/Supplier.js';
import Inventory from '../models/inventory.model.js';
import PurchaseOrder from '../models/purchaseOrder.model.js';
import StockTransfer from '../models/stockTransfer.model.js';


const getTotalProducts=async()=>{
    return Product.countDocuments({})
}

const getTotalWarehouse=async()=>{
    return Warehouse.countDocuments({})
}


const getTotalSuppliers=async()=>{
    return Supplier.countDocuments({})
}

const getTotalInventoryUnit=async()=>{
const result =await Inventory.aggregate([{
    $group:{
        _id:null,
        total:{
            $sum:"$availableQuantity"
        }
    }
}])

  return result[0]?.total || 0;

}


const getLowStockProducts=async()=>{
    const result=await Inventory.aggregate([
        {
            $lookup:{
                from:"products",
                localField:"productId",
                foreignField:"_id",
                as:"product"
            }
        },{
            $unwind:"$product"
        },{
            $match:{
                $expr:{
                    $lte:["$availableQuantity","$reorderLevel"]
                }
            }
        },{
            $group:{_id:"$productId"},
        },
        {
            $count:"count"
        }
    ])

    return result[0]?.count || 0;
}


const getOutOfStockProducts=async()=>{
    const result=await Inventory.aggregate([
        {
            $match:{
                availableQuantity:0
            }
        },
        {
            $group:{_id:"$productId"}
        },{
            $count:"count"
        }
    ])
    return result[0]?.count || 0;
}


const getPendingPurchaseOrders=async()=>{
    const result =await PurchaseOrder.countDocuments({
        status:"Pending Approval"
    })
    return result;
}

const getPendingStockTransfers=async()=>{
    const result=await StockTransfer.countDocuments({
  status:{
    $in:["Requested", "Approved", "In Transit"]
  }
    })
    return result;
}

const getTotalPurchaseValue=async()=>{
  const result=await PurchaseOrder.aggregate([{
    $match:{
        status:{
            $ne:"Cancelled"
        }
    }

  },
  {
    $group:{_id:null,
      total:{$sum:"$totalAmount"}
    }
  }
]
)

return result[0]?.total || 0;
}


const getInventoryByWarehouse=async()=>{
    const result=await Warehouse.aggregate([{
        $lookup:{
            from:"inventories",
            localField:"_id",
            foreignField:"warehouseId",
            as:"inventory"
        }
    },{
       $project:{
        _id:0,
        warehouseId:"$_id",
        warehouseName:"$name",
        warehouseCode:"$code",
        units:{$sum:"$inventory.availableQuantity"}
       }
    },
{
    $sort:{
        warehouseName:1
    }
}

])

return result;
}

const getPurchaseOrderSummary=async()=>{
    return PurchaseOrder.aggregate([{
        $group:{
            _id:"$status",
        count:{
            $sum:1
        }
    }
}
    ])
}

export {
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
}