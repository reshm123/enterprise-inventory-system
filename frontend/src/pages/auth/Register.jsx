import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";

import {
  registerUser,
  clearAuthError,
} from "../../redux/slices/authSlice";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error } = useSelector(
    (state) => state.auth
  );

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [successMessage, setSuccessMessage] =
    useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) {
      dispatch(clearAuthError());
    }

    setSuccessMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const {
      name,
      email,
      password,
      confirmPassword,
    } = formData;

    // Password confirmation
    if (password !== confirmPassword) {
      return;
    }

    const result = await dispatch(
      registerUser({
        name,
        email,
        password,
      })
    );

    if (registerUser.fulfilled.match(result)) {
      setSuccessMessage(
        "Registration successful. Please login."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <div className="login-header">
          <h1>Create Account</h1>

          <p>
            Enterprise Inventory Management System
          </p>
        </div>

        <form onSubmit={handleSubmit}>

          {/* NAME */}

          <div className="form-group">
            <label>Name</label>

            <input
              type="text"
              name="name"
              placeholder="Enter your name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          {/* EMAIL */}

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

          {/* PASSWORD */}

          <div className="form-group">
            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter password"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}

          <div className="form-group">
            <label>Confirm Password</label>

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm password"
              value={formData.confirmPassword}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>

          {/* PASSWORD ERROR */}

          {formData.confirmPassword &&
            formData.password !==
              formData.confirmPassword && (
              <div className="error-message">
                Passwords do not match
              </div>
            )}

          {/* API ERROR */}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}

          {/* SUBMIT */}

          <button
            type="submit"
            className="login-button"
            disabled={
              loading ||
              formData.password !==
                formData.confirmPassword
            }
          >
            {loading
              ? "Creating Account..."
              : "Register"}
          </button>

        </form>

        <div className="register-link">
          Already have an account?{" "}
          <Link to="/login">
            Login
          </Link>
        </div>

      </div>

    </div>
  );
};

export default Register;