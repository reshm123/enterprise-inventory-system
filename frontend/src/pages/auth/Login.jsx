import {useEffect, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {Link, useNavigate} from "react-router-dom";

import { loginUser, clearAuthError } from "../../redux/slices/authSlice";

const Login=()=>{
    const dispatch=useDispatch();
    const navigate=useNavigate();
    const {loading, error, isAuthenticated}=useSelector((state)=>state.auth);
    const [formData,setFormData]=useState({
        email:"",
        password:""
    })

    useEffect(()=>{
        if(isAuthenticated){
            navigate("/dashboard")
        }
    },[isAuthenticated, navigate]);

const handleChange=(event)=>{
    const {name,value} =event.target;

  setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      dispatch(clearAuthError());
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      return;
    }

    const result = await dispatch(loginUser(formData));

    if (loginUser.fulfilled.match(result)) {
      navigate("/dashboard");
    }
  };


  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <h1>Enterprise Inventory</h1>
          <p>Inventory, Procurement & Warehouse Management</p>
        </div>

        <form onSubmit={handleSubmit}>

          <div className="form-group">
            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

        <p className="auth-switch">New here? <Link to="/register">Create an account</Link></p>

      </div>
    </div>
  );
};

export default Login;