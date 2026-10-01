import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
} from "../../redux/slices/supplierSlice";

const initialForm = {
  name: "",
  email: "",
  phone: "",
  address: "",
  gstVatNumber: "",
  contactPerson: "",
  status: "Active",
};

const Suppliers = () => {
  const dispatch = useDispatch();

  const {
    suppliers,
    loading,
    saving,
    deleting,
    error,
  } = useSelector((state) => state.suppliers);

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const params = {};

    if (search.trim()) {
      params.search = search.trim();
    }

    if (statusFilter !== "all") {
      params.status = statusFilter;
    }

    dispatch(fetchSuppliers(params));
  }, [dispatch, search, statusFilter]);

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

    if (!form.name.trim()) {
      alert("Supplier name is required.");
      return;
    }

    if (!form.email.trim()) {
      alert("Supplier email is required.");
      return;
    }

    const supplierData = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      gstVatNumber: form.gstVatNumber.trim(),
      contactPerson: form.contactPerson.trim(),
      status: form.status,
    };

    try {
      if (editingId) {
        await dispatch(
          updateSupplier({
            id: editingId,
            data: supplierData,
          })
        ).unwrap();
      } else {
        await dispatch(
          createSupplier(supplierData)
        ).unwrap();
      }

      resetForm();

      dispatch(fetchSuppliers());
    } catch (error) {
      console.error(error);
    }
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier._id);

    setForm({
      name: supplier.name || "",
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      gstVatNumber:
        supplier.gstVatNumber ||
        supplier.gstNumber ||
        supplier.vatNumber ||
        "",
      contactPerson:
        supplier.contactPerson || "",
      status: supplier.status || "Active",
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this supplier?"
    );

    if (!confirmed) {
      return;
    }

    try {
      await dispatch(deleteSupplier(id)).unwrap();
    } catch (error) {
      alert(error);
    }
  };

  return (
    <div className="page-container">

      <div className="page-header">
        <div>
          <h1>Suppliers</h1>

          <p>
            Manage supplier information and contacts.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setForm(initialForm);
            setEditingId(null);
            setShowForm(true);
          }}
        >
          + Add Supplier
        </button>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      <div className="card">
        <div className="filter-grid">
          <div className="form-group">
            <label>Search</label>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search supplier name or email"
            />
          </div>

          <div className="form-group">
            <label>Status</label>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="card-header">
            <h2>
              {editingId
                ? "Edit Supplier"
                : "Add Supplier"}
            </h2>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-grid">

              <div className="form-group">
                <label>
                  Supplier Name *
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter supplier name"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Email *
                </label>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="supplier@example.com"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  Phone
                </label>

                <input
                  type="text"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="Enter phone number"
                />
              </div>

              <div className="form-group">
                <label>
                  Contact Person
                </label>

                <input
                  type="text"
                  name="contactPerson"
                  value={form.contactPerson}
                  onChange={handleChange}
                  placeholder="Contact person"
                />
              </div>

              <div className="form-group">
                <label>
                  GST/VAT Number
                </label>

                <input
                  type="text"
                  name="gstVatNumber"
                  value={form.gstVatNumber}
                  onChange={handleChange}
                  placeholder="GST/VAT number"
                />
              </div>

              <div className="form-group">
                <label>
                  Status
                </label>

                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>
                  Address
                </label>

                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Supplier address"
                  rows="3"
                />
              </div>

            </div>

            <div className="button-row">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Supplier"
                  : "Create Supplier"}
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={resetForm}
              >
                Cancel
              </button>

            </div>
          </form>
        </div>
      )}

      <div className="card">

        <div className="table-header">
          <h2>Supplier List</h2>

          <span>
            Total: {suppliers.length}
          </span>
        </div>

        {loading ? (
          <div className="loading">
            Loading suppliers...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="empty-state">
            No suppliers found.
          </div>
        ) : (
          <div className="table-responsive">

            <table className="data-table">

              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Contact Person</th>
                  <th>GST/VAT</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {suppliers.map((supplier) => (
                  <tr key={supplier._id}>

                    <td>
                      <strong>
                        {supplier.name}
                      </strong>
                    </td>

                    <td>
                      {supplier.email || "-"}
                    </td>

                    <td>
                      {supplier.phone || "-"}
                    </td>

                    <td>
                      {supplier.contactPerson ||
                        "-"}
                    </td>

                    <td>
                      {supplier.gstVatNumber ||
                        supplier.gstNumber ||
                        supplier.vatNumber ||
                        "-"}
                    </td>

                    <td>
                      <span
                        className={
                          supplier.status ===
                          "Active"
                            ? "status-active"
                            : "status-inactive"
                        }
                      >
                        {supplier.status ||
                          "Active"}
                      </span>
                    </td>

                    <td>

                      <div className="action-buttons">

                        <button
                          type="button"
                          className="btn btn-sm btn-secondary"
                          onClick={() =>
                            handleEdit(supplier)
                          }
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          disabled={deleting}
                          onClick={() =>
                            handleDelete(
                              supplier._id
                            )
                          }
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

export default Suppliers;