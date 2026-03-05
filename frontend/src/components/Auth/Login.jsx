// components/Auth/Login.jsx - Login form (Virtual Identity)
// Event-Driven: form onSubmit event triggers authentication flow.
// The component is self-contained (High Cohesion) and only communicates
// with the outside world through useAuth() context (Low Coupling).

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Event handler: form submit → authenticate → redirect to game
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default browser form submission (event handling)
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/game");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decorative floating hearts */}
      <span className="login-deco login-deco-1">♥</span>
      <span className="login-deco login-deco-2">♡</span>
      <span className="login-deco login-deco-3">♥</span>

      <div className="login-card">
        {/* Dangling figure */}
        <div className="login-dangler">
          <div className="login-dangler-inner">
            <div className="login-dangler-string" />
            <div className="login-dangler-figure">🐱</div>
          </div>
        </div>

        {/* Header */}
        <div className="login-header">
          <div className="login-icon">🎮</div>
          <h1 className="login-title">Welcome Back!</h1>
          <p className="login-subtitle">Sign in to continue playing ♥</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              className="login-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Password</label>
            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span className="login-btn-loading">Signing in…</span>
            ) : (
              "Login  ♥"
            )}
          </button>
        </form>

        <p className="login-switch">
          New here?{" "}
          <Link to="/register" className="login-link">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
