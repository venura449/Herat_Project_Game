// components/Layout/Navbar.jsx - Navigation bar
// Demonstrates Event-Driven Programming: the logout button's onClick event
// triggers an async handler that calls the API and updates global auth state.
// Low Coupling: Navbar reads auth state from context and never imports route components.

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Event handler: logout click → API call → state update → navigation
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        ♥ Heart Game
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <Link to="/game">Play</Link>
            <Link to="/competitions">⚔️ Compete</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <span className="navbar-user">👤 {user.username}</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
