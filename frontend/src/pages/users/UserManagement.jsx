const UserManagement = () => {
  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage accounts, roles, and warehouse access.</p>
        </div>
      </div>

      <div className="card">
        <div className="table-header">
          <h2>User Directory</h2>
          <span>Total: 0</span>
        </div>

        <div className="empty-state">No users available.</div>
      </div>
    </div>
  );
};

export default UserManagement;
