import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../../services/api";

const ProductDetails = () => {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/product/${id}`);
        setProduct(response.data?.data || null);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load product details."
        );
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  if (loading) {
    return <div className="page-container"><div className="card"><p>Loading product details...</p></div></div>;
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="card">
          <h1>Product Details</h1>
          <div className="alert alert-danger">{error}</div>
          <Link to="/products" className="btn btn-secondary">Back to products</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="page-container">
        <div className="card">
          <h1>Product Details</h1>
          <p>No product found.</p>
          <Link to="/products" className="btn btn-secondary">Back to products</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>{product.name}</h1>
          <p>SKU: {product.sku}</p>
        </div>
        <Link to="/products" className="btn btn-secondary">Back</Link>
      </div>

      <div className="card">
        <div className="detail-grid">
          <div><strong>Category</strong><p>{product.category || "-"}</p></div>
          <div><strong>Brand</strong><p>{product.brand || "-"}</p></div>
          <div><strong>Unit price</strong><p>₹{Number(product.unitPrice || 0).toLocaleString("en-IN")}</p></div>
          <div><strong>Reorder level</strong><p>{product.reorderLevel ?? 0}</p></div>
          <div><strong>Status</strong><p>{product.status || "Inactive"}</p></div>
        </div>

        <div className="mt-20">
          <h3>Description</h3>
          <p>{product.description || "No description provided."}</p>
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
