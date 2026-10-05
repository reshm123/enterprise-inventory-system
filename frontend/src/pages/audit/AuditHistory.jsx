import { useEffect, useState } from "react";
import api from "../../services/api";

const pageSize = 20;
const auditActions = [
  "INVENTORY_CREATED",
  "STOCK_ADJUSTED",
  "PURCHASE_ORDER_RECEIVED",
  "STOCK_TRANSFER_CREATED",
  "STOCK_TRANSFER_REQUESTED",
  "STOCK_TRANSFER_APPROVED",
  "STOCK_TRANSFER_SHIPPED",
  "STOCK_TRANSFER_RECEIVED",
  "STOCK_TRANSFER_CANCELLED"
];
const entityTypes = ["Inventory", "PurchaseOrder", "StockTransfer"];

const AuditHistory = () => {
  const [filters, setFilters] = useState({ action: "", entityType: "", from: "", to: "" });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadAuditHistory = async () => {
      setLoading(true);
      setError("");
      try {
        const params = Object.fromEntries(
          Object.entries({ ...appliedFilters, page, limit: pageSize }).filter(([, value]) => value !== "")
        );
        const response = await api.get("/audit-logs", { params });
        if (active) setResult(response.data?.data ?? { items: [], total: 0, totalPages: 1 });
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Unable to load audit history.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadAuditHistory();
    return () => { active = false; };
  }, [appliedFilters, page]);

  const handleFilterChange = (event) => {
    setFilters((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    const empty = { action: "", entityType: "", from: "", to: "" };
    setFilters(empty);
    setAppliedFilters(empty);
    setPage(1);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Audit History</h1>
          <p>Review recorded inventory changes and purchase-order activity.</p>
        </div>
      </div>

      <section className="card">
        <form onSubmit={applyFilters}>
          <div className="filter-grid">
            <div className="form-group">
              <label htmlFor="audit-action">Action</label>
              <select id="audit-action" name="action" value={filters.action} onChange={handleFilterChange}>
                <option value="">All actions</option>
                {auditActions.map((action) => <option key={action} value={action}>{action.replaceAll("_", " ")}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="audit-entity">Entity</label>
              <select id="audit-entity" name="entityType" value={filters.entityType} onChange={handleFilterChange}>
                <option value="">All entities</option>
                {entityTypes.map((entity) => <option key={entity} value={entity}>{entity}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="audit-from">From</label>
              <input id="audit-from" type="date" name="from" value={filters.from} onChange={handleFilterChange} />
            </div>
            <div className="form-group">
              <label htmlFor="audit-to">To</label>
              <input id="audit-to" type="date" name="to" value={filters.to} onChange={handleFilterChange} />
            </div>
          </div>
          <div className="button-row">
            <button type="submit" className="btn btn-primary">Apply filters</button>
            <button type="button" className="btn btn-secondary" onClick={resetFilters}>Reset</button>
          </div>
        </form>
      </section>

      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <section className="card">
        <div className="table-header">
          <h2>Activity log</h2>
          <span>Total: {result.total}</span>
        </div>
        {loading ? <div className="loading" role="status">Loading audit history...</div> : result.items.length === 0 ? <div className="empty-state">No audit records match these filters.</div> : (
          <div className="table-responsive">
            <table className="data-table">
              <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>Performed by</th><th>Details</th></tr></thead>
              <tbody>
                {result.items.map((record) => (
                  <tr key={record._id}>
                    <td>{new Date(record.createdAt).toLocaleString()}</td>
                    <td><span className="audit-action">{record.action.replaceAll("_", " ")}</span></td>
                    <td><strong>{record.entityType}</strong><code className="entity-id">{String(record.entityId).slice(-8)}</code></td>
                    <td>{record.performedBy?.name || "Unknown user"}<span className="audit-role">{record.performedBy?.role || ""}</span></td>
                    <td><details className="audit-details"><summary>View details</summary><pre>{JSON.stringify(record.details || {}, null, 2)}</pre></details></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && result.totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1}>Previous</button>
            <span>Page {page} of {result.totalPages}</span>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => setPage((current) => Math.min(result.totalPages, current + 1))} disabled={page >= result.totalPages}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default AuditHistory;
