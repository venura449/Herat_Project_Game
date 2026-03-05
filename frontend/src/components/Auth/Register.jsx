// components/Auth/Register.jsx - Registration form (Virtual Identity)
// Creates a new user identity on the platform.
// Password confirmation is validated client-side before the API call.

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Register() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  // Event handler: form submit event → validate → register → redirect
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      await register(username, password);
      navigate("/game");
    } catch (err) {
      setError(
        err.response?.data?.error || "Registration failed. Please try again.",
      );
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
      <span className="login-deco login-deco-4">♡</span>

      <div className="login-card">
        {/* Dangling figure */}
        <div className="login-dangler">
          <div className="login-dangler-inner">
            <div className="login-dangler-string" />
            <div className="login-dangler-figure">🐰</div>
          </div>
        </div>

        {/* Header */}
        <div className="login-header">
          <div className="login-icon">✨</div>
          <h1 className="login-title">Create Account</h1>
          <p className="login-subtitle">Join the game and play ♥</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="login-label">Username</label>
            <input
              className="login-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username (min. 3 chars)"
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
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div className="login-field">
            <label className="login-label">Confirm Password</label>
            <input
              className="login-input"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
              required
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? (
              <span className="login-btn-loading">Creating account…</span>
            ) : (
              "Register  ♥"
            )}
          </button>
        </form>

        <p className="login-switch">
          Already have an account?{" "}
          <Link to="/login" className="login-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
