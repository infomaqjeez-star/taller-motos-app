"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface Cliente {
  id: string;
  nombre: string;
  email: string;
  codigo_referido: string;
  descuento_cliente_pct: number;
  vendedor_referente_id?: string | null;
  vendedor_referente?: { id: string; nombre: string; codigo_referido: string } | null;
}

interface ClienteAuthContextValue {
  cliente: Cliente | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { nombre: string; email: string; telefono?: string; password: string; vendedor_referente_id?: string }) => Promise<void>;
  logout: () => void;
}

const ClienteAuthContext = createContext<ClienteAuthContextValue | null>(null);

export function ClienteAuthProvider({ children }: { children: React.ReactNode }) {
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("cliente_token");
    if (!token) { setLoading(false); return; }

    fetch("/api/cliente/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.cliente) setCliente(data.cliente);
        else localStorage.removeItem("cliente_token");
      })
      .catch(() => localStorage.removeItem("cliente_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/cliente/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");
    localStorage.setItem("cliente_token", data.token);
    setCliente(data.cliente);
  };

  const register = async (data: { nombre: string; email: string; telefono?: string; password: string }) => {
    const res = await fetch("/api/cliente/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Error al registrarse");
    localStorage.setItem("cliente_token", json.token);
    setCliente(json.cliente);
  };

  const logout = () => {
    localStorage.removeItem("cliente_token");
    setCliente(null);
  };

  return (
    <ClienteAuthContext.Provider value={{ cliente, loading, login, register, logout }}>
      {children}
    </ClienteAuthContext.Provider>
  );
}

export function useClienteAuth() {
  const ctx = useContext(ClienteAuthContext);
  if (!ctx) throw new Error("useClienteAuth debe usarse dentro de ClienteAuthProvider");
  return ctx;
}
