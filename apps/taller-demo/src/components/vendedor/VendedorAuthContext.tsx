"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface Vendedor {
  id: string;
  nombre: string;
  email: string;
  codigo_referido: string;
  comision_pct: number;
}

interface VendedorAuthContextValue {
  vendedor: Vendedor | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (data: { nombre: string; email: string; telefono?: string; password: string }) => Promise<{ error?: string }>;
  logout: () => void;
  loading: boolean;
}

const VendedorAuthContext = createContext<VendedorAuthContextValue | null>(null);

const STORAGE_KEY = "vendedor_token";

export function VendedorAuthProvider({ children }: { children: React.ReactNode }) {
  const [vendedor, setVendedor] = useState<Vendedor | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión al cargar
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetch("/api/vendedor/me", {
        headers: { Authorization: `Bearer ${saved}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.vendedor) {
            setVendedor(data.vendedor);
            setToken(saved);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        })
        .catch(() => localStorage.removeItem(STORAGE_KEY))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch("/api/vendedor/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || "Error al iniciar sesión" };

    localStorage.setItem(STORAGE_KEY, data.token);
    setToken(data.token);
    setVendedor(data.vendedor);
    return {};
  }, []);

  const register = useCallback(async (data: { nombre: string; email: string; telefono?: string; password: string }) => {
    const res = await fetch("/api/vendedor/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) return { error: json.error || "Error al registrarse" };
    return {};
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setVendedor(null);
  }, []);

  return (
    <VendedorAuthContext.Provider value={{ vendedor, token, login, register, logout, loading }}>
      {children}
    </VendedorAuthContext.Provider>
  );
}

export function useVendedorAuth() {
  const ctx = useContext(VendedorAuthContext);
  if (!ctx) throw new Error("useVendedorAuth debe usarse dentro de VendedorAuthProvider");
  return ctx;
}
