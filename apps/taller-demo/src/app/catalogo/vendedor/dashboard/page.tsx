"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  Store, LogOut, Copy, Check, DollarSign, ShoppingBag, TrendingUp, Clock, Users, ArrowLeft
} from "lucide-react";

interface Pedido {
  id: string;
  total: number;
  estado: string;
  comision_monto: number;
  comision_estado: string;
  created_at: string;
  datos_cliente: { nombre?: string };
}

interface Resumen {
  total_pedidos: number;
  total_ventas: number;
  comision_pendiente: number;
  comision_pagada: number;
}

export default function VendedorDashboardPage() {
  const router = useRouter();
  const { vendedor, logout, loading: authLoading } = useVendedorAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!vendedor) {
      router.push("/catalogo/vendedor/login");
      return;
    }
    cargarPedidos();
  }, [vendedor, authLoading, router]);

  const cargarPedidos = async () => {
    const token = localStorage.getItem("vendedor_token");
    if (!token) return;
    try {
      const res = await fetch("/api/vendedor/pedidos", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPedidos(data.pedidos || []);
      setResumen(data.resumen || null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const referralLink = vendedor
    ? `https://appjeezpro.store/catalogo?ref=${vendedor.codigo_referido}`
    : "";

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fmtMoney = (n: number) => "$" + (n || 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });

  if (authLoading || loading) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5722] border-t-transparent mx-auto" />
        <p className="mt-3 text-gray-400">Cargando dashboard…</p>
      </main>
    );
  }

  if (!vendedor) return null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-20">
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Store className="h-6 w-6 text-[#FDB71A]" />
          <div>
            <h1 className="text-xl font-black text-white">Dashboard de vendedor</h1>
            <p className="text-sm text-gray-400">{vendedor.nombre} — {vendedor.codigo_referido}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          Salir
        </button>
      </div>

      {/* Link de referido */}
      <div className="mt-5 rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/5 p-4">
        <p className="text-sm font-medium text-[#39FF14]">Tu link de referido</p>
        <p className="mt-1 text-xs text-gray-400">
          Compartí este link con tus clientes. Cuando compren usando tu link, ganás comisión.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            readOnly
            value={referralLink}
            className="input input-sm flex-1 bg-black/30 text-xs"
          />
          <button
            onClick={copyLink}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-[#FF5722] px-3 py-2 text-sm font-bold text-white hover:bg-[#E64A19]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>
      </div>

      {/* Stats */}
      {resumen && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<ShoppingBag className="h-5 w-5 text-blue-400" />}
            label="Pedidos"
            value={String(resumen.total_pedidos)}
          />
          <StatCard
            icon={<TrendingUp className="h-5 w-5 text-[#39FF14]" />}
            label="Ventas totales"
            value={fmtMoney(resumen.total_ventas)}
          />
          <StatCard
            icon={<DollarSign className="h-5 w-5 text-yellow-400" />}
            label="Comisión pendiente"
            value={fmtMoney(resumen.comision_pendiente)}
            highlight
          />
          <StatCard
            icon={<Check className="h-5 w-5 text-[#39FF14]" />}
            label="Comisión pagada"
            value={fmtMoney(resumen.comision_pagada)}
          />
        </div>
      )}

      {/* Pedidos */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-300">
          <Clock className="h-4 w-4 text-[#FDB71A]" />
          Tus pedidos
        </h2>
        {pedidos.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Aún no tenés pedidos registrados.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {pedidos.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-200">
                    {p.datos_cliente?.nombre || "Cliente"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(p.created_at).toLocaleDateString("es-AR")} — {p.estado}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{fmtMoney(p.total)}</p>
                  <p className={`text-xs ${p.comision_estado === "pagada" ? "text-[#39FF14]" : "text-yellow-400"}`}>
                    Comisión: {fmtMoney(p.comision_monto)} — {p.comision_estado}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        highlight
          ? "border-yellow-500/30 bg-yellow-500/5"
          : "border-white/10 bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
