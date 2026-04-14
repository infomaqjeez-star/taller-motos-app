"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, User, Mail, LogOut, Save, RefreshCw, Store } from "lucide-react";
import Link from "next/link";

export default function ConfiguracionUsuarioPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [meliAccounts, setMeliAccounts] = useState<any[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login");
        return;
      }
      setUser(session.user);
      setDisplayName(
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.name ||
        ""
      );
      // Cargar cuentas MeLi vinculadas
      fetch("/api/meli-accounts", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then(r => r.ok ? r.json() : [])
        .then(data => setMeliAccounts(Array.isArray(data) ? data : []))
        .catch(() => setMeliAccounts([]));
      setLoading(false);
    });
  }, [router]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: displayName },
      });
      if (!error) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#121212" }}>
        <RefreshCw className="w-6 h-6 animate-spin" style={{ color: "#FFE600" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#121212" }}>
      <div className="max-w-lg mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Panel de usuario</h1>
            <p className="text-sm" style={{ color: "#6B7280" }}>Tu cuenta y preferencias</p>
          </div>
        </div>

        {/* Avatar y nombre */}
        <div className="flex items-center gap-4 rounded-2xl p-6 mb-4" style={{ background: "#1F1F1F" }}>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: "#FFE600", color: "#000" }}
          >
            {(displayName || user?.email || "U")[0].toUpperCase()}
          </div>
          <div>
            <p className="text-white font-semibold text-lg">
              {displayName || "Sin nombre"}
            </p>
            <p className="text-sm" style={{ color: "#6B7280" }}>{user?.email}</p>
            <span
              className="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
              style={{ background: "#1a3a1a", color: "#34D399" }}
            >
              {user?.app_metadata?.provider === "google" ? "Google" : "Email"} — Activo
            </span>
          </div>
        </div>

        {/* Formulario */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "#1F1F1F" }}>
          <h2 className="text-white font-semibold mb-4">Datos de la cuenta</h2>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#9CA3AF" }}>
                Nombre para mostrar
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#2A2A2A" }}>
                <User className="w-4 h-4 flex-shrink-0" style={{ color: "#6B7280" }} />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                  className="bg-transparent flex-1 text-white text-sm outline-none placeholder:text-gray-600"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: "#9CA3AF" }}>
                Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#2A2A2A" }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "#6B7280" }} />
                <span className="text-sm" style={{ color: "#6B7280" }}>{user?.email}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 mt-5 px-5 py-2.5 rounded-xl font-bold text-sm text-black transition-opacity disabled:opacity-60"
            style={{ background: "#FFE600" }}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>

          {success && (
            <p className="mt-3 text-sm" style={{ color: "#34D399" }}>Cambios guardados correctamente.</p>
          )}
        </div>

        {/* Info sesion */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "#1F1F1F" }}>
          <h2 className="text-white font-semibold mb-3">Sesion activa</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span style={{ color: "#6B7280" }}>ID de usuario</span>
              <span className="text-white font-mono text-xs">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#6B7280" }}>Proveedor</span>
              <span className="text-white capitalize">{user?.app_metadata?.provider || "email"}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "#6B7280" }}>Cuenta creada</span>
              <span className="text-white">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString("es-AR") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Cuentas MeLi vinculadas */}
        <div className="rounded-2xl p-6 mb-4" style={{ background: "#1F1F1F" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold flex items-center gap-2">
              <Store className="w-4 h-4" style={{ color: "#FFE600" }} />
              Cuentas de Mercado Libre ({meliAccounts.length})
            </h2>
            <Link
              href="/configuracion/meli"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg"
              style={{ background: "#FFE60022", color: "#FFE600" }}
            >
              Administrar
            </Link>
          </div>
          {meliAccounts.length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "#6B7280" }}>
              No hay cuentas vinculadas
            </p>
          ) : (
            <div className="space-y-2">
              {meliAccounts.map((acc: any) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "#2A2A2A" }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: acc.is_active ? "#34D399" : "#6B7280" }}
                    />
                    <div>
                      <p className="text-white font-medium text-sm">
                        @{acc.nickname || acc.meli_nickname || `Cuenta ${acc.meli_user_id}`}
                      </p>
                      <p className="text-[10px]" style={{ color: "#6B7280" }}>
                        ID: {acc.meli_user_id}
                        {acc.created_at && ` · Conectada ${new Date(acc.created_at).toLocaleDateString("es-AR")}`}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      background: acc.is_active ? "#1a3a1a" : "#3a1a1a",
                      color: acc.is_active ? "#34D399" : "#F87171",
                    }}
                  >
                    {acc.is_active ? "Activa" : "Inactiva"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cerrar sesion */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "#2D1515", color: "#F87171" }}
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesion
        </button>
      </div>
    </div>
  );
}
