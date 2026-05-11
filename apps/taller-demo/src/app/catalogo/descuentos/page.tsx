"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Tag,
  Percent,
  Truck,
  UserPlus,
  Gift,
  DollarSign,
  Store,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";
import { useState } from "react";

export default function DescuentosPage() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const beneficioVendedor = `https://appjeezpro.store/catalogo/vendedor/login`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="flex items-center gap-2 text-[#FDB71A]">
        <Gift className="h-7 w-7" />
        <h1 className="text-2xl font-black text-white">Descuentos y Beneficios</h1>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        Conocé todos los beneficios disponibles para clientes y vendedores de Maqjeez.
      </p>

      {/* ===== DESCUENTOS PARA CLIENTES ===== */}
      <section className="mt-8 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#39FF14]">
          <Tag className="h-5 w-5" />
          Descuentos para compradores
        </h2>

        {/* Descuento por volumen */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Percent className="h-5 w-5 text-[#FF5722]" />
            <h3 className="font-bold text-white">Descuento por volumen de compra</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-gray-300">Más de $100.000</span>
              <span className="font-bold text-[#39FF14]">10% OFF</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-gray-300">Más de $250.000</span>
              <span className="font-bold text-[#39FF14]">15% OFF</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-gray-300">Más de $1.000.000</span>
              <span className="font-bold text-[#39FF14]">20% OFF</span>
            </div>
          </div>
        </div>

        {/* Descuento cliente registrado */}
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-400" />
            <h3 className="font-bold text-white">Cliente registrado</h3>
          </div>
          <p className="text-sm text-gray-300">
            Registrate como cliente y obtené un <span className="font-bold text-blue-400">3% de descuento adicional</span> en todas tus compras.
          </p>
          <button
            onClick={() => router.push("/catalogo/cliente/login")}
            className="rounded-lg bg-blue-500/20 px-4 py-2 text-sm font-bold text-blue-400 hover:bg-blue-500/30"
          >
            Registrate como cliente →
          </button>
        </div>

        {/* Descuento por vendedor referido */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-purple-400" />
            <h3 className="font-bold text-white">Comprá con link de vendedor</h3>
          </div>
          <p className="text-sm text-gray-300">
            Si comprás usando el link de referido de un vendedor, obtenés un <span className="font-bold text-purple-400">3% de descuento extra</span>.
          </p>
          <div className="rounded-lg bg-white/5 p-3 text-xs text-gray-400">
            <p className="font-medium text-gray-300">Ejemplo de ahorro combinado:</p>
            <p className="mt-1">• Compra de $150.000 → 10% volumen + 3% cliente + 3% vendedor = <span className="text-[#39FF14] font-bold">16% total</span></p>
          </div>
        </div>
      </section>

      {/* ===== ENVÍO ===== */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#FDB71A]">
          <Truck className="h-5 w-5" />
          Costos de envío
        </h2>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-gray-300">Menos de $30.000</span>
              <span className="font-bold text-white">$10.000</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-gray-300">Menos de $50.000</span>
              <span className="font-bold text-white">$8.000</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
              <span className="text-gray-300">Menos de $100.000</span>
              <span className="font-bold text-white">$5.000</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#39FF14]/20 bg-[#39FF14]/5 px-3 py-2">
              <span className="text-[#39FF14]">Más de $100.000</span>
              <span className="font-bold text-[#39FF14]">¡GRATIS!</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BENEFICIOS PARA VENDEDORES ===== */}
      <section className="mt-8 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#FF5722]">
          <DollarSign className="h-5 w-5" />
          Beneficios para vendedores
        </h2>

        <div className="rounded-xl border border-[#FF5722]/20 bg-[#FF5722]/5 p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF5722]/20">
              <Percent className="h-6 w-6 text-[#FF5722]" />
            </div>
            <div>
              <h3 className="font-bold text-white">10% de comisión por cada venta</h3>
              <p className="text-sm text-gray-400">
                Ganás el 10% del total de cada pedido que hagan tus clientes referidos.
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-white/5 p-3 text-xs text-gray-400 space-y-1">
            <p className="font-medium text-gray-300">¿Cómo funciona?</p>
            <p>1. Registrate como vendedor</p>
            <p>2. Compartí tu link único con clientes</p>
            <p>3. Tus clientes compran con descuento</p>
            <p>4. Vos ganás el 10% de comisión</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={beneficioVendedor}
              className="input input-sm flex-1 bg-black/30 text-xs"
            />
            <button
              onClick={() => copyToClipboard(beneficioVendedor)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-[#FF5722] px-3 py-2 text-sm font-bold text-white hover:bg-[#E64A19]"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copiado" : "Copiar link"}
            </button>
          </div>

          <button
            onClick={() => router.push("/catalogo/vendedor/login")}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#39FF14] py-3 text-sm font-black text-black hover:bg-[#32E612]"
          >
            Quiero ser vendedor
            <ChevronRight className="h-4 w-4" />
          </button>

          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-gray-400">
            <p className="font-medium text-yellow-400">Reglas de seguridad:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>No podés ser vendedor con un email ya registrado como cliente</li>
              <li>El DNI/CUIT debe ser único por cuenta de vendedor</li>
              <li>Las comisiones se acreditan una vez confirmado el pago del pedido</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ===== RESUMEN VISUAL ===== */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-black text-white">
          <Gift className="h-5 w-5 text-[#FDB71A]" />
          Resumen de ahorro máximo
        </h2>
        <div className="mt-4 rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5 p-4">
          <p className="text-center text-sm text-gray-300">
            Cliente registrado + Link de vendedor + Volumen +$250.000
          </p>
          <p className="mt-2 text-center text-2xl font-black text-[#39FF14]">
            Hasta 21% de descuento + Envío gratis
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            15% volumen + 3% cliente + 3% vendedor referido
          </p>
        </div>
      </section>
    </main>
  );
}
