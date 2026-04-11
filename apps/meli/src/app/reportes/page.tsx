"use client";

import { useRouter } from "next/navigation";
import { BarChart2 } from "lucide-react";
import Link from "next/link";

export default function ReportesMeliPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-8" style={{ background: "#121212" }}>
      <div className="p-4 rounded-2xl" style={{ background: "#FFE60022" }}>
        <BarChart2 className="w-10 h-10" style={{ color: "#FFE600" }} />
      </div>
      <div className="text-center">
        <h1 className="text-xl font-black text-white mb-2">Reportes</h1>
        <p className="text-sm" style={{ color: "#6B7280" }}>
          Los reportes detallados de Mercado Libre estaran disponibles proximamente.<br />
          Por ahora podes ver tus estadisticas en tiempo real.
        </p>
      </div>
      <Link
        href="/estadisticas"
        className="px-6 py-3 rounded-xl font-bold text-sm text-black"
        style={{ background: "#FFE600" }}
      >
        Ver Estadisticas MeLi
      </Link>
    </div>
  );
}
