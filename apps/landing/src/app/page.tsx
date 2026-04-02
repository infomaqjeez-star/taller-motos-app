import Link from "next/link";

const TALLER_URL = process.env.NEXT_PUBLIC_TALLER_URL || "http://localhost:3001";
const MELI_URL = process.env.NEXT_PUBLIC_MELI_URL || "http://localhost:3002";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)" }}>
      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-black tracking-tight" style={{ color: "#FDB71A" }}>
          MAQJEEZ
        </h1>
        <p className="text-gray-400 mt-2 text-sm">Sistema de Gestión Integral</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Taller Card */}
        <a
          href={TALLER_URL}
          className="group relative overflow-hidden rounded-2xl border border-gray-800 p-8 transition-all hover:border-orange-500/50 hover:shadow-2xl hover:shadow-orange-500/10"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl" style={{ background: "#f9731620" }}>
              <span>{"🔧"}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Taller & Ventas</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Gestión de reparaciones, órdenes de trabajo, ventas de repuestos y agenda de clientes.
            </p>
            <div className="flex items-center gap-2 text-orange-400 font-bold text-sm group-hover:gap-3 transition-all">
              Ingresar
              <span className="text-lg">{"\u2192"}</span>
            </div>
          </div>
        </a>

        {/* MeLi Card */}
        <a
          href={MELI_URL}
          className="group relative overflow-hidden rounded-2xl border border-gray-800 p-8 transition-all hover:border-yellow-500/50 hover:shadow-2xl hover:shadow-yellow-500/10"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-3xl" style={{ background: "#FDB71A20" }}>
              <span>{"📦"}</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">MercadoLibre</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">
              Dashboard MeLi, etiquetas de envío, mensajes, preguntas, Flex y más.
            </p>
            <div className="flex items-center gap-2 text-yellow-400 font-bold text-sm group-hover:gap-3 transition-all">
              Ingresar
              <span className="text-lg">{"\u2192"}</span>
            </div>
          </div>
        </a>
      </div>

      {/* Footer */}
      <p className="mt-12 text-gray-600 text-xs">
        MAQJEEZ &copy; {new Date().getFullYear()}
      </p>
    </main>
  );
}
