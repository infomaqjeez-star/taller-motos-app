"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface Admin {
  id: string;
  nombre: string;
  email: string;
}

interface AdminSession {
  admin: Admin;
  token: string;
}

interface AdminAuthContextValue {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string; requires2FA?: boolean; tempToken?: string }>;
  verify2FA: (tempToken: string, code: string) => Promise<{ error?: string }>;
  logout: () => void;
  getToken: () => string | null;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

const STORAGE_KEY = "admin_catalogo_session";

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed: AdminSession = JSON.parse(stored);
          if (parsed?.token && parsed?.admin) {
            // Restaurar sesión inmediatamente desde localStorage sin esperar la red
            setAdmin(parsed.admin);
            setToken(parsed.token);
            // Verificar en background — solo desloguear si el servidor dice 401 explícito
            fetch("/api/admin/me", {
              headers: { Authorization: `Bearer ${parsed.token}` },
            })
              .then((res) => {
                if (res.status === 401) {
                  // Token inválido/revocado — desloguear
                  localStorage.removeItem(STORAGE_KEY);
                  setAdmin(null);
                  setToken(null);
                } else if (res.ok) {
                  res.json().then((data) => {
                    setAdmin({ id: data.id, nombre: data.nombre, email: data.email });
                  });
                }
                // En cualquier otro error (500, red, etc.) mantener la sesión local
              })
              .catch(() => {
                // Error de red — mantener sesión, no desloguear
              });
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const saveSession = useCallback((adminData: Admin, adminToken: string) => {
    const session: AdminSession = { admin: adminData, token: adminToken };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setAdmin(adminData);
    setToken(adminToken);
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

    saveSession(data.admin, data.adminToken);
    return {};
  }, [saveSession]);

  const verify2FA = useCallback(async (tempToken: string, code: string) => {
    const res = await fetch("/api/admin/verify-2fa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tempToken, code }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Código incorrecto" };

    saveSession(data.admin, data.adminToken);
    return {};
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAdmin(null);
    setToken(null);
  }, []);

  const getToken = useCallback(() => token, [token]);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, verify2FA, logout, getToken }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth debe usarse dentro de AdminAuthProvider");
  return ctx;
}
