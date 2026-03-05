// components/Layout/Navbar.jsx - Navigation bar
// Demonstrates Event-Driven Programming: the logout button's onClick event
// triggers an async handler that calls the API and updates global auth state.
// Low Coupling: Navbar reads auth state from context and never imports route components.

import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Event handler: logout click → API call → state update → navigation
  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <nav className="navbar">
      {/* Brand */}
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-icon">♥</span>
        <span className="navbar-brand-text">HeartGame</span>
      </Link>

      {/* Centre nav links */}
      {user && (
        <div className="navbar-center">
          <Link
            to="/game"
            className={`navbar-link${isActive("/game") ? " navbar-link-active" : ""}`}
          >
            🎮 Play
          </Link>
          <Link
            to="/competitions"
            className={`navbar-link${isActive("/competitions") ? " navbar-link-active" : ""}`}
          >
            ⚔️ Compete
          </Link>
          <Link
            to="/leaderboard"
            className={`navbar-link${isActive("/leaderboard") ? " navbar-link-active" : ""}`}
          >
            🏆 Leaderboard
          </Link>
        </div>
      )}

      {/* Right side */}
      <div className="navbar-right">
        {user ? (
          <>
            <div className="navbar-user-chip">
              <span className="navbar-user-avatar">
                {user.username.charAt(0).toUpperCase()}
              </span>
              <span className="navbar-user-name">{user.username}</span>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="navbar-link">
              Login
            </Link>
            <Link to="/register" className="btn-register">
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
