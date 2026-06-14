import React, { createContext, useState, useEffect, useContext } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    const token = localStorage.getItem("examhub_token");
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const userData = await api.auth.me();
      setUser(userData);
    } catch (err) {
      console.error("Auth verification failed:", err);
      localStorage.removeItem("examhub_token");
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (credentials) => {
    setLoading(true);
    try {
      await api.auth.login(credentials);
      await checkAuth();
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const signup = async (userData) => {
    setLoading(true);
    try {
      await api.auth.signup(userData);
      // Automatically login after signup (either email or phone acts as identifier username)
      const identifier = userData.email || userData.phone_number;
      await login({ email: identifier, password: userData.password });
    } catch (err) {
      setLoading(false);
      throw err;
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
