"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface Admin {
  id: string;
  nombre: string;
  email: string;
}

interface AdminAuthContextValue {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string; requires2FA?: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, code: string) => Promise<{ error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const STORAGE_KEY = "admin_catalogo_token";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed?.email) setAdmin(parsed);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Error al iniciar sesión" };

    if (data.requires2FA && data.tempToken) {
      return { requires2FA: true, tempToken: data.tempToken };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.admin));
    setAdmin(data.admin);
    return {};
  }, []);

  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    const res = await fetch("/api/admin/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, code }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Código incorrecto" };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.admin));
    setAdmin(data.admin);
    return {};
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, verify2FA, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth debe usarse dentro de AdminAuthProvider");
  return ctx;
}
