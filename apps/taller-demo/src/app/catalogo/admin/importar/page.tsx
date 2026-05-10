"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Database, ArrowLeft, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function ImportarCatalogoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; total: number } | null>(null);
  const [error, setError] = useState("");

  const handleImport = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/catalogo/import", {
        method: "POST",
        headers: { Authorization: "Bearer maqjeez-import-2026" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error en importación");
      setResult({ inserted: data.inserted, total: data.total });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
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

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/5 px-4 py-3 text-sm text-[#39FF14]">
          <CheckCircle className="h-4 w-4 shrink-0" />
          Importados {result.inserted} de {result.total} productos exitosamente.
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
        )}
      </button>

      <p className="mt-4 text-xs text-gray-500">
        Este proceso lee el archivo <code className="text-gray-400">data/catalogo-products.json</code> y lo inserta en la tabla <code className="text-gray-400">catalog_products</code> de Supabase.
      </p>
    </main>
  );
}
