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
    <div className="auth-container">
      <div className="auth-card">
        <h2>♥ Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          {error && <p className="error-msg">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary btn-full"
          >
            {loading ? "Logging in…" : "Login"}
          </button>
        </form>
        <p className="auth-switch">
          No account? <Link to="/register">Register here</Link>
        </p>
      </div>
    </div>
  );
}
