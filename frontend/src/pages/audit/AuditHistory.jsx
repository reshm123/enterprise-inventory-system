const AuditHistory = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Audit History</h1>
          <p>Review inventory changes, approvals, and stock adjustments.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-header">
          <h2>Recent Activity</h2>
          <span>Total: 0</span>
        </div>

        <div className="empty-state">No audit records available.</div>
      </div>
    </div>
  );
};

export default AuditHistory;
