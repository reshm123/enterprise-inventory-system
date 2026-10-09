import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../services/api";
import { fetchProducts } from "../../redux/slices/productSlice";
import { fetchWarehouses } from "../../redux/slices/warehouseSlice";

const createEmptyForm = () => ({
  transferNumber: "",
  fromWarehouse: "",
  toWarehouse: "",
  items: [{ productId: "", quantity: "1" }]
});

const operatorRoles = ["Admin", "Warehouse Manager", "Warehouse Staff"];
const approverRoles = ["Admin", "Warehouse Manager"];

const Transfers = () => {
  const dispatch = useDispatch();
  const { products = [] } = useSelector((state) => state.products);
  const { warehouses = [] } = useSelector((state) => state.warehouses);
  const { user } = useSelector((state) => state.auth);
  const canOperate = operatorRoles.includes(user?.role);
  const canApprove = approverRoles.includes(user?.role);

  const [transfers, setTransfers] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: "", status: "", fromWarehouse: "", toWarehouse: "", sortBy: "createdAt", sortOrder: "desc" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [form, setForm] = useState(createEmptyForm);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchWarehouses());
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    const loadTransfers = async () => {
      setLoading(true);
      setError("");
      try {
        const params = Object.fromEntries(Object.entries({ ...appliedFilters, page, limit: 20 }).filter(([, value]) => value));
        const response = await api.get("/stock-transfers", { params });
        if (active) {
          const result = response.data?.data ?? {};
          setTransfers(result.items ?? []);
          setTotal(result.total ?? 0);
          setTotalPages(result.totalPages ?? 0);
        }
      } catch (requestError) {
        if (active) {
          setError(requestError.response?.data?.message || "Unable to load stock transfers.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    loadTransfers();
    return () => { active = false; };
  }, [appliedFilters, page, refreshKey]);

  const activeWarehouses = warehouses.filter((warehouse) => warehouse.status === "ACTIVE");
  const warehouseName = (id) => warehouses.find((warehouse) => warehouse._id === id)?.name || "Unknown warehouse";
  const productName = (id) => {
    const product = products.find((entry) => entry._id === id);
    return product ? `${product.name} (${product.sku})` : "Unknown product";
  };

  const handleFilterChange = (event) => {
    setFilters((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      items: previous.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError("");
    const items = form.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity)
    }));
    const hasInvalidItems = items.some((item) =>
      !item.productId || !Number.isInteger(item.quantity) || item.quantity <= 0
    );
    const hasDuplicateProducts = new Set(items.map((item) => item.productId)).size !== items.length;

    if (!form.fromWarehouse || !form.toWarehouse || form.fromWarehouse === form.toWarehouse || hasInvalidItems || hasDuplicateProducts) {
      setError("Choose different source and destination warehouses and add unique products with positive whole-number quantities.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/stock-transfers", {
        transferNumber: form.transferNumber.trim() || undefined,
        fromWarehouse: form.fromWarehouse,
        toWarehouse: form.toWarehouse,
        items
      });
      setForm(createEmptyForm());
      setShowForm(false);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create stock transfer.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (transfer, action) => {
    if (action === "cancel" && !window.confirm(`Cancel transfer ${transfer.transferNumber}?`)) return;
    setBusyId(transfer._id);
    setError("");
    try {
      await api.post(`/stock-transfers/${transfer._id}/${action}`);
      setRefreshKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError.response?.data?.message || `Unable to ${action} this transfer.`);
    } finally {
      setBusyId("");
    }
  };

  const renderActions = (transfer) => {
    if (!canOperate) return <span className="muted-text">View only</span>;
    const buttons = [];
    if (transfer.status === "Draft") buttons.push(["request", "Request", "btn-secondary"]);
    if (transfer.status === "Requested" && canApprove) buttons.push(["approve", "Approve", "btn-primary"]);
    if (transfer.status === "Approved") buttons.push(["ship", "Ship", "btn-primary"]);
    if (transfer.status === "In Transit") buttons.push(["receive", "Receive", "btn-primary"]);
    if (["Draft", "Requested", "Approved"].includes(transfer.status)) buttons.push(["cancel", "Cancel", "btn-danger"]);

    return buttons.length ? (
      <div className="action-buttons">
        {buttons.map(([action, label, style]) => (
          <button
            key={action}
            type="button"
            className={`btn btn-sm ${style}`}
            disabled={busyId === transfer._id}
            onClick={() => runAction(transfer, action)}
          >
            {busyId === transfer._id ? "Saving..." : label}
          </button>
        ))}
      </div>
    ) : <span className="muted-text">No actions</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Stock Transfers</h1>
          <p>Request, approve, ship, and receive inventory between warehouses.</p>
        </div>
        {canOperate && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>
            {showForm ? "Close form" : "+ New transfer"}
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      {showForm && (
        <section className="card" aria-labelledby="create-transfer-heading">
          <div className="card-header"><h2 id="create-transfer-heading">Create transfer</h2></div>
          <form onSubmit={handleCreate}>
            <div className="filter-grid">
              <div className="form-group">
                <label htmlFor="transfer-number">Transfer number <span className="muted-text">(optional)</span></label>
                <input id="transfer-number" value={form.transferNumber} onChange={(event) => setForm((previous) => ({ ...previous, transferNumber: event.target.value }))} placeholder="Generated if left blank" />
              </div>
              <div className="form-group">
                <label htmlFor="transfer-from">From warehouse</label>
                <select id="transfer-from" value={form.fromWarehouse} onChange={(event) => setForm((previous) => ({ ...previous, fromWarehouse: event.target.value }))} required>
                  <option value="">Choose source</option>
                  {activeWarehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="transfer-to">To warehouse</label>
                <select id="transfer-to" value={form.toWarehouse} onChange={(event) => setForm((previous) => ({ ...previous, toWarehouse: event.target.value }))} required>
                  <option value="">Choose destination</option>
                  {activeWarehouses.filter((warehouse) => warehouse._id !== form.fromWarehouse).map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
                </select>
              </div>
            </div>

            <div className="transfer-items">
              <div className="table-header">
                <h3>Items</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm((previous) => ({ ...previous, items: [...previous.items, { productId: "", quantity: "1" }] }))}>+ Add item</button>
              </div>
              {form.items.map((item, index) => (
                <div className="transfer-item-row" key={index}>
                  <div className="form-group">
                    <label htmlFor={`transfer-product-${index}`}>Product</label>
                    <select id={`transfer-product-${index}`} value={item.productId} onChange={(event) => handleItemChange(index, "productId", event.target.value)} required>
                      <option value="">Choose product</option>
                      {products.filter((product) => !form.items.some((other, otherIndex) => otherIndex !== index && other.productId === product._id)).map((product) => <option key={product._id} value={product._id}>{product.name} ({product.sku})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor={`transfer-quantity-${index}`}>Quantity</label>
                    <input id={`transfer-quantity-${index}`} type="number" min="1" step="1" value={item.quantity} onChange={(event) => handleItemChange(index, "quantity", event.target.value)} required />
                  </div>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setForm((previous) => ({ ...previous, items: previous.items.filter((_, itemIndex) => itemIndex !== index) }))} disabled={form.items.length === 1}>Remove</button>
                </div>
              ))}
            </div>
            <div className="button-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Creating..." : "Create draft"}</button>
              <button type="button" className="btn btn-secondary" onClick={() => { setShowForm(false); setForm(createEmptyForm()); }}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="table-header">
          <h2>Transfer queue</h2>
          <span>Total: {total}</span>
        </div>
        <form className="filter-grid transfer-filters" onSubmit={(event) => { event.preventDefault(); setPage(1); setAppliedFilters(filters); }}>
          <div className="form-group">
            <label htmlFor="transfer-search">Transfer number</label>
            <input id="transfer-search" name="search" type="search" value={filters.search} onChange={handleFilterChange} placeholder="Search by number" />
          </div>
          <div className="form-group">
            <label htmlFor="transfer-status-filter">Status</label>
            <select id="transfer-status-filter" name="status" value={filters.status} onChange={handleFilterChange}>
              <option value="">All statuses</option>
              {["Draft", "Requested", "Approved", "In Transit", "Received", "Cancelled"].map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="transfer-from-filter">Source</label>
            <select id="transfer-from-filter" name="fromWarehouse" value={filters.fromWarehouse} onChange={handleFilterChange}>
              <option value="">All source warehouses</option>
              {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="transfer-to-filter">Destination</label>
            <select id="transfer-to-filter" name="toWarehouse" value={filters.toWarehouse} onChange={handleFilterChange}>
              <option value="">All destination warehouses</option>
              {warehouses.map((warehouse) => <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="transfer-sort">Sort by</label>
            <select id="transfer-sort" name="sortBy" value={filters.sortBy} onChange={handleFilterChange}>
              <option value="createdAt">Created date</option>
              <option value="transferNumber">Transfer number</option>
              <option value="status">Status</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="transfer-sort-order">Order</label>
            <select id="transfer-sort-order" name="sortOrder" value={filters.sortOrder} onChange={handleFilterChange}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          <div className="button-row">
            <button className="btn btn-primary" type="submit">Apply filters</button>
            <button className="btn btn-secondary" type="button" onClick={() => { const empty = { search: "", status: "", fromWarehouse: "", toWarehouse: "", sortBy: "createdAt", sortOrder: "desc" }; setFilters(empty); setAppliedFilters(empty); setPage(1); }}>Reset</button>
          </div>
        </form>

        {loading ? <div className="loading" role="status">Loading transfers...</div> : transfers.length === 0 ? <div className="empty-state">No stock transfers match these filters.</div> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>Transfer</th><th>Route</th><th>Items</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer._id}>
                    <td><strong>{transfer.transferNumber}</strong></td>
                    <td>{warehouseName(transfer.fromWarehouse)}<span className="route-arrow"> to </span>{warehouseName(transfer.toWarehouse)}</td>
                    <td><ul className="transfer-item-list">{transfer.items.map((item) => <li key={item._id || item.productId}>{productName(item.productId)} <span>× {item.quantity}</span></li>)}</ul></td>
                    <td><span className={`transfer-status status-${transfer.status.toLowerCase().replaceAll(" ", "-")}`}>{transfer.status}</span></td>
                    <td>{new Date(transfer.createdAt).toLocaleDateString()}</td>
                    <td>{renderActions(transfer)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Transfers;
