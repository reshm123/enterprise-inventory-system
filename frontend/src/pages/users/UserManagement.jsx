import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUsers, updateUserRole } from "../../redux/slices/userSlice";

const roleOptions = [
  "Admin",
  "Procurement Manager",
  "Warehouse Manager",
  "Warehouse Staff",
  "Inventory Auditor",
];

const statusOptions = ["Active", "Inactive", "Suspended"];

const UserManagement = () => {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((state) => state.users);

  useEffect(() => {
    dispatch(fetchUsers());
  }, [dispatch]);

  const handleRoleChange = async (userId, role) => {
    try {
      await dispatch(updateUserRole({ id: userId, role })).unwrap();
    } catch (updateError) {
      alert(updateError || "Unable to update user role");
    }
  };

  const handleStatusChange = async (userId, status) => {
    try {
      await dispatch(updateUserRole({ id: userId, status })).unwrap();
    } catch (updateError) {
      alert(updateError || "Unable to update user status");
    }
  };

  const userList = Array.isArray(users) ? users : [];

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p>Manage accounts, roles, status, and warehouse access.</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="table-header">
          <h2>User Directory</h2>
          <span>Total: {userList.length}</span>
        </div>

        {loading ? (
          <div className="loading">Loading users...</div>
        ) : userList.length === 0 ? (
          <div className="empty-state">No users available.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Warehouse Access</th>
                </tr>
              </thead>
              <tbody>
                {userList.map((user) => (
                  <tr key={user._id || user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(event) =>
                          handleRoleChange(user._id || user.id, event.target.value)
                        }
                      >
                        {roleOptions.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        value={user.status}
                        onChange={(event) =>
                          handleStatusChange(user._id || user.id, event.target.value)
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {user.warehouseIds?.length ? (
                        user.warehouseIds
                          .map((warehouse) => warehouse.name || warehouse.code || "Warehouse")
                          .join(", ")
                      ) : (
                        "No warehouse assigned"
                      )}
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

export default UserManagement;
