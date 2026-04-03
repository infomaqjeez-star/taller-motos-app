"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FFE600] rounded-lg flex items-center justify-center">
              <span className="text-[#003087] font-black text-xs">MJ</span>
            </div>
            <span className="font-bold text-xl">MaqJeez</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white">
              Iniciar Sesión
            </Link>
            <Link 
              href="/register" 
              className="px-4 py-2 bg-[#FFE600] text-[#003087] rounded-lg font-semibold text-sm hover:bg-[#ffd700]"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-sm text-gray-400">Nuevo: Sistema Multi-Cuenta</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            Gestiona tus cuentas de
            <span className="text-[#FFE600]"> Mercado Libre</span>
          </h1>
          
          <p className="text-gray-400 text-lg mb-8">
            Conecta múltiples cuentas, automatiza respuestas y controla todo desde un solo panel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="px-8 py-4 bg-[#FFE600] text-[#003087] rounded-xl font-bold hover:bg-[#ffd700]"
            >
              Comenzar Gratis
            </Link>
            <Link 
              href="/login" 
              className="px-8 py-4 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-500">
            <span>✓ 14 días gratis</span>
            <span>✓ Sin tarjeta</span>
            <span>✓ Cancela cuando quieras</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
          © 2024 MaqJeez. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
