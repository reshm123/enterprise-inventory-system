import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from "../../redux/slices/warehouseSlice";

const initialForm = {
  name: "",
  code: "",
  location: "",
  managerId: "",
  status: "ACTIVE",
};

const Warehouses = () => {
  const dispatch = useDispatch();
  const { warehouses, loading, saving, deleting, error } = useSelector(
    (state) => state.warehouses
  );

  const warehouseList = Array.isArray(warehouses) ? warehouses : [];

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    dispatch(fetchWarehouses());
  }, [dispatch]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedCode = form.code.trim();
    const trimmedLocation = form.location.trim();

    if (!trimmedName || !trimmedCode || !trimmedLocation) {
      alert("Warehouse name, code and location are required.");
      return;
    }

    const payload = {
      name: trimmedName,
      code: trimmedCode.toUpperCase(),
      location: trimmedLocation,
      managerId: form.managerId || undefined,
      status: form.status,
    };

    try {
      if (editingId) {
        await dispatch(
          updateWarehouse({
            id: editingId,
            data: payload,
          })
        ).unwrap();
      } else {
        await dispatch(createWarehouse(payload)).unwrap();
      }

      resetForm();
      dispatch(fetchWarehouses());
    } catch (submitError) {
      alert(submitError || "Unable to save warehouse");
    }
  };

  const handleEdit = (warehouse) => {
    setEditingId(warehouse._id);
    setForm({
      name: warehouse.name || "",
      code: warehouse.code || "",
      location: warehouse.location || "",
      managerId: warehouse.managerId || "",
      status: warehouse.status || "ACTIVE",
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this warehouse?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await dispatch(deleteWarehouse(id)).unwrap();
    } catch (deleteError) {
      alert(deleteError || "Deletion failed");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Warehouses</h1>
          <p>Manage warehouse locations and operational status.</p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Add Warehouse
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2>{editingId ? "Edit Warehouse" : "Add Warehouse"}</h2>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Warehouse Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Warehouse A"
                  required
                />
              </div>

              <div className="form-group">
                <label>Warehouse Code</label>
                <input
                  type="text"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="WHA"
                  required
                />
              </div>

              <div className="form-group full-width">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Noida, Delhi, Bangalore"
                  required
                />
              </div>

              <div className="form-group">
                <label>Manager ID</label>
                <input
                  type="text"
                  name="managerId"
                  value={form.managerId}
                  onChange={handleChange}
                  placeholder="Optional manager user id"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select name="status" value={form.status} onChange={handleChange}>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="button-row">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update Warehouse" : "Create Warehouse"}
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
          <h2>Warehouse List</h2>
          <span>Total: {warehouseList.length}</span>
        </div>

        {loading ? (
          <div className="loading">Loading warehouses...</div>
        ) : warehouseList.length === 0 ? (
          <div className="empty-state">No warehouses found.</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Location</th>
                  <th>Manager</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {warehouseList.map((warehouse) => (
                  <tr key={warehouse._id}>
                    <td>{warehouse.name}</td>
                    <td>{warehouse.code}</td>
                    <td>{warehouse.location || "-"}</td>
                    <td>
                      {typeof warehouse.managerId === "object" && warehouse.managerId !== null
                        ? warehouse.managerId.name || warehouse.managerId.email || "-"
                        : warehouse.managerId || "-"}
                    </td>
                    <td>
                      <span
                        className={
                          warehouse.status === "ACTIVE"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {warehouse.status || "ACTIVE"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleEdit(warehouse)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={deleting}
                          onClick={() => handleDelete(warehouse._id)}
                        >
                          Delete
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

export default Warehouses;
