// context/AuthContext.jsx - Global Authentication State (Virtual Identity)
// React Context API provides low coupling between the auth state and UI components.
// Components consume useAuth() without knowing implementation details (JWT, cookies).
// This is an example of the Facade pattern: complex auth logic hidden behind a
// simple { user, login, register, logout } interface.

import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load, check if a valid session cookie exists (restores session across refreshes)
  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    setUser({ username: res.data.username });
    return res.data;
  };

  const register = async (username, password) => {
    const res = await api.post("/auth/register", { username, password });
    setUser({ username: res.data.username });
    return res.data;
  };

  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook: components import useAuth() rather than the context object directly
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
