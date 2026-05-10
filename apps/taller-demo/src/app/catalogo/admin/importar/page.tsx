"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, ArrowLeft, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

const SQL_CREATE_TABLE = `CREATE TABLE IF NOT EXISTS catalog_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    catalog_price NUMERIC NOT NULL DEFAULT 0,
    image_url TEXT,
    category TEXT DEFAULT 'Repuestos',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_catalog_sku ON catalog_products(sku);
CREATE INDEX idx_catalog_active ON catalog_products(active);
CREATE INDEX idx_catalog_category ON catalog_products(category);
ALTER TABLE catalog_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_select_public ON catalog_products FOR SELECT USING (active = true);`;

export default function ImportarCatalogoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; total: number; message?: string } | null>(null);
  const [error, setError] = useState("");
  const [needsSetup, setNeedsSetup] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    setNeedsSetup(false);

    try {
      const res = await fetch("/api/setup/catalogo", {
        method: "POST",
        headers: { Authorization: "Bearer maqjeez-setup-2026" },
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.sql) setNeedsSetup(true);
        throw new Error(data.error || "Error en importación");
      }
      setResult({ inserted: data.inserted, total: data.total, message: data.message });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SQL_CREATE_TABLE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-6 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="flex items-center gap-2 text-[#FDB71A]">
        <Database className="h-6 w-6" />
        <h1 className="text-xl font-black text-white">Importar catálogo</h1>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        Esto insertará todos los productos del archivo JSON en la base de datos de Supabase.
      </p>

      {needsSetup && (
        <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
            <div className="w-full">
              <p className="text-sm font-medium text-yellow-400">
                La tabla catalog_products NO existe en Supabase.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Copiá este SQL y ejecutalo en Supabase → SQL Editor → New query:
              </p>
              <div className="relative mt-2">
                <pre className="max-h-60 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-gray-300">
                  {SQL_CREATE_TABLE}
                </pre>
                <button
                  onClick={copySql}
                  className="absolute right-2 top-2 rounded bg-white/10 px-2 py-1 text-xs text-gray-300 hover:bg-white/20"
                >
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && !needsSetup && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/5 px-4 py-3 text-sm text-[#39FF14]">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {result.message || `Importados ${result.inserted} de ${result.total} productos.`}
        </div>
      )}

      <button
        onClick={handleImport}
        disabled={loading}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5722] px-6 py-4 font-bold text-white hover:bg-[#E64A19] disabled:opacity-50"
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Importando…
          </>
        ) : (
          <>
            <Database className="h-5 w-5" />
            Ejecutar importación
          </>
        )
        }
      </button>

      <p className="mt-4 text-xs text-gray-500">
        Este proceso lee el archivo <code className="text-gray-400">data/catalogo-products.json</code> y lo inserta en la tabla <code className="text-gray-400">catalog_products</code> de Supabase.
      </p>
    </main>
  );
}
