import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";

const PurchaseOrderDetails = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/purchase-orders/${id}`);
        setOrder(response.data?.data || null);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load purchase order details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [id]);

  if (loading) {
    return <div className="page-container"><div className="card"><p>Loading purchase order details...</p></div></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card">
          <h1>Purchase Order Details</h1>
          <div className="alert alert-danger">{error}</div>
          <Link to="/purchase-orders" className="btn btn-secondary">Back to purchase orders</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-container">
        <div className="card">
          <h1>Purchase Order Details</h1>
          <p>No purchase order found.</p>
          <Link to="/purchase-orders" className="btn btn-secondary">Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{order.poNumber}</h1>
          <p>Supplier: {order.supplierId?.name || order.supplierName || "-"}</p>
        </div>
        <Link to="/purchase-orders" className="btn btn-secondary">Back</Link>
      </div>

      <div className="card">
        <div className="detail-grid">
          <div><strong>Status</strong><p>{order.status}</p></div>
          <div><strong>Warehouse</strong><p>{order.warehouseId?.name || order.warehouseName || "-"}</p></div>
          <div><strong>Total amount</strong><p>₹{Number(order.totalAmount || 0).toLocaleString("en-IN")}</p></div>
          <div><strong>Expected delivery</strong><p>{order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString() : "-"}</p></div>
        </div>
      </div>

      <div className="card mt-20">
        <h2>Items</h2>
        {(order.items || []).length === 0 ? (
          <p>No items found.</p>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Received</th>
                  <th>Pending</th>
                </tr>
              </thead>
              <tbody>
                {(order.items || []).map((item, index) => (
                  <tr key={item._id || `${item.productId}-${index}`}>
                    <td>{item.productId?.name || item.productName || item.productId || "-"}</td>
                    <td>{item.quantity ?? 0}</td>
                    <td>₹{Number(item.unitPrice || 0).toLocaleString("en-IN")}</td>
                    <td>{item.receivedQuantity ?? 0}</td>
                    <td>{item.pendingQuantity ?? (Number(item.quantity || 0) - Number(item.receivedQuantity || 0))}</td>
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

export default PurchaseOrderDetails;
