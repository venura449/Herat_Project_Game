// App.jsx - Root component: routing and auth context setup
// Demonstrates Low Coupling: each page component is independent.
// ProtectedRoute demonstrates Virtual Identity enforcement at the UI layer:
// unauthenticated users are redirected to /login for any protected page.
// Reference: https://reactrouter.com/ - React Router v6

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Layout/Navbar";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import GameLobby from "./components/Game/GameLobby";
import GameBoard from "./components/Game/GameBoard";
import MemoryGame from "./components/Game/MemoryGame";
import Leaderboard from "./components/Game/Leaderboard";
import CompetitionHub from "./components/Competitions/CompetitionHub";
import CompetitionRoom from "./components/Competitions/CompetitionRoom";
import "./App.css";

/** Redirects unauthenticated users to /login */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;

  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          {/* Root redirects based on auth state */}
          <Route
            path="/"
            element={<Navigate to={user ? "/game" : "/login"} replace />}
          />

          {/* Auth routes: redirect logged-in users away */}
          <Route
            path="/login"
            element={user ? <Navigate to="/game" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/game" replace /> : <Register />}
          />

          {/* Protected game routes */}
          <Route
            path="/game"
            element={
              <ProtectedRoute>
                <GameLobby />
              </ProtectedRoute>
            }
          />
          {/* Memory Blindfold — static segment matches before :mode wildcard */}
          <Route
            path="/game/memory"
            element={
              <ProtectedRoute>
                <MemoryGame />
              </ProtectedRoute>
            }
          />
          <Route
            path="/game/:mode"
            element={
              <ProtectedRoute>
                <GameBoard />
              </ProtectedRoute>
            }
          />

          {/* Competition routes */}
          <Route
            path="/competitions"
            element={
              <ProtectedRoute>
                <CompetitionHub />
              </ProtectedRoute>
            }
          />
          <Route
            path="/competitions/:code"
            element={
              <ProtectedRoute>
                <CompetitionRoom />
              </ProtectedRoute>
            }
          />

          {/* Public leaderboard */}
          <Route path="/leaderboard" element={<Leaderboard />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
