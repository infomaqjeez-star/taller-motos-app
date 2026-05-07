"use client";

import { useState, useEffect, useCallback } from "react";

const USER_KEY = "maqjeez_user";
const PASSWORD = "admin123"; // Contraseña fija para acciones protegidas

export function useAuth() {
  const [user, setUser] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Cargar usuario desde localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      setUser(savedUser);
      setIsAuthenticated(true);
    }
  }, []);

  // Guardar usuario en localStorage
  const login = useCallback((username: string, password: string): boolean => {
    if (password === PASSWORD) {
      setUser(username);
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_KEY, username);
      }
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUser("");
    setIsAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const verifyPassword = useCallback((password: string): boolean => {
    return password === PASSWORD;
  }, []);

  return {
    user,
    isAuthenticated,
    login,
    logout,
    verifyPassword,
  };
}
