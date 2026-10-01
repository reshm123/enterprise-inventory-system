const Transfers = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Stock Transfers</h1>
          <p>Internal warehouse transfers and approval workflow.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-header">
          <h2>Transfer Queue</h2>
          <span>Total: 0</span>
        </div>

        <div className="empty-state">No stock transfers available.</div>
      </div>
    </div>
  );
};

export default Transfers;
