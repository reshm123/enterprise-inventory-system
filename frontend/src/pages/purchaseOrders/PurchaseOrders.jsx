import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  submitPurchaseOrder,
  approvePurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from "../../redux/slices/purchaseOrderSlice";
import { fetchSuppliers } from "../../redux/slices/supplierSlice";
import { fetchProducts } from "../../redux/slices/productSlice";
import { fetchWarehouses } from "../../redux/slices/warehouseSlice";

const initialItem = {
  productId: "",
  quantity: "1",
  unitPrice: "0",
};

const initialForm = {
  poNumber: "",
  supplierId: "",
  warehouseId: "",
  expectedDeliveryDate: "",
  status: "Draft",
  items: [initialItem],
};

const PurchaseOrders = () => {
  const dispatch = useDispatch();

  const { purchaseOrders, loading, saving, updating, error } = useSelector(
    (state) => state.purchaseOrders
  );
  const { suppliers } = useSelector((state) => state.suppliers);
  const { products } = useSelector((state) => state.products);
  const { warehouses } = useSelector((state) => state.warehouses);

  const [form, setForm] = useState(initialForm);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    dispatch(fetchPurchaseOrders());
    dispatch(fetchSuppliers());
    dispatch(fetchProducts());
    dispatch(fetchWarehouses());
  }, [dispatch]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addItemRow = () => {
    setForm((previous) => ({
      ...previous,
      items: [...previous.items, { ...initialItem }],
    }));
  };

  const removeItemRow = (index) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const cleanedItems = form.items
      .filter((item) => item.productId && Number(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice || 0),
      }));

    if (!form.poNumber.trim() || !form.supplierId || !form.warehouseId || cleanedItems.length === 0) {
      alert("Please complete PO fields and add at least one valid item.");
      return;
    }

    const payload = {
      poNumber: form.poNumber.trim().toUpperCase(),
      supplierId: form.supplierId,
      warehouseId: form.warehouseId,
      expectedDeliveryDate: form.expectedDeliveryDate || undefined,
      status: form.status || "Draft",
      items: cleanedItems,
    };

    try {
      await dispatch(createPurchaseOrder(payload)).unwrap();
      resetForm();
      dispatch(fetchPurchaseOrders());
    } catch (submitError) {
      alert(submitError || "Unable to create purchase order");
    }
  };

  const handleApprove = async (order) => {
    try {
      if (order.status === "Draft") {
        await dispatch(submitPurchaseOrder(order._id)).unwrap();
        alert("Purchase order submitted for approval.");
      } else if (order.status === "Pending Approval") {
        await dispatch(
          approvePurchaseOrder({ id: order._id, comment: "Approved from frontend" })
        ).unwrap();
        alert("Purchase order approved.");
      }

      dispatch(fetchPurchaseOrders());
    } catch (approveError) {
      alert(approveError || "Approval failed");
    }
  };

  const handleReceive = async (order) => {
    try {
      const pendingItems = (order.items || []).map((item) => ({
        productId: item.productId,
        quantity:
          Number(item.pendingQuantity || item.quantity - (item.receivedQuantity || 0)),
      }));

      await dispatch(
        receivePurchaseOrder({
          id: order._id,
          items: pendingItems,
        })
      ).unwrap();

      dispatch(fetchPurchaseOrders());
    } catch (receiveError) {
      alert(receiveError || "Goods receive failed");
    }
  };

  const handleCancel = async (orderId) => {
    const confirmed = window.confirm("Cancel this purchase order?");
    if (!confirmed) {
      return;
    }

    try {
      await dispatch(cancelPurchaseOrder(orderId)).unwrap();
      dispatch(fetchPurchaseOrders());
    } catch (cancelError) {
      alert(cancelError || "Unable to cancel purchase order");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Purchase Orders</h1>
          <p>Track supplier orders, approvals, and receiving status.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowForm((previous) => !previous)}
        >
          {showForm ? "Hide Form" : "+ New Purchase Order"}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2>Create Purchase Order</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>PO Number</label>
                <input
                  type="text"
                  name="poNumber"
                  value={form.poNumber}
                  onChange={handleFormChange}
                  placeholder="PO-1001"
                  required
                />
              </div>

              <div className="form-group">
                <label>Supplier</label>
                <select
                  name="supplierId"
                  value={form.supplierId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier._id} value={supplier._id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Warehouse</label>
                <select
                  name="warehouseId"
                  value={form.warehouseId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Select warehouse</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse._id} value={warehouse._id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Expected Delivery</label>
                <input
                  type="date"
                  name="expectedDeliveryDate"
                  value={form.expectedDeliveryDate}
                  onChange={handleFormChange}
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <input type="text" value="Draft" readOnly />
              </div>
            </div>

            <div className="card" style={{ marginTop: "20px" }}>
              <div className="table-header">
                <h3>PO Items</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
                  + Add Item
                </button>
              </div>

              {form.items.map((item, index) => (
                <div className="form-grid" key={`${item.productId || "new"}-${index}`}>
                  <div className="form-group">
                    <label>Product</label>
                    <select
                      value={item.productId}
                      onChange={(event) =>
                        handleItemChange(index, "productId", event.target.value)
                      }
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        handleItemChange(index, "quantity", event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>Unit Price</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        handleItemChange(index, "unitPrice", event.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label>&nbsp;</label>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeItemRow(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="button-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creating..." : "Create Purchase Order"}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-header">
          <h2>Purchase Order List</h2>
          <span>Total: {purchaseOrders.length}</span>
        </div>

        {loading ? (
          <div className="loading">Loading purchase orders...</div>
        ) : purchaseOrders.length === 0 ? (
          <div className="empty-state">No purchase orders found.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Warehouse</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((order) => (
                  <tr key={order._id}>
                    <td>{order.poNumber}</td>
                    <td>{order.supplierId?.name || order.supplierName || "-"}</td>
                    <td>{order.warehouseId?.name || order.warehouseName || "-"}</td>
                    <td>
                      <span className="stock-badge stock-warning">{order.status}</span>
                    </td>
                    <td>{Number(order.totalAmount || 0).toFixed(2)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn btn-sm btn-primary"
                          onClick={() => handleApprove(order)}
                          disabled={
                            updating ||
                            (order.status !== "Draft" && order.status !== "Pending Approval")
                          }
                        >
                          {order.status === "Draft" ? "Submit" : order.status === "Pending Approval" ? "Approve" : "Approved"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleReceive(order)}
                          disabled={updating || !["Approved", "Partially Received"].includes(order.status)}
                        >
                          Receive
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleCancel(order._id)}
                          disabled={updating}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseOrders;
