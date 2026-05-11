"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  ArrowLeft,
  Copy,
  Check,
  Camera,
} from "lucide-react";

export default function PromoBannersPage() {
  const router = useRouter();
  const { vendedor } = useVendedorAuth();
  const [copied, setCopied] = useState(false);
  const [copiedTexto, setCopiedTexto] = useState(false);
  const [modo, setModo] = useState<"oscuro" | "claro">("oscuro");

  const codigo = vendedor?.codigo_referido || "MAQ001";
  const linkReferido = vendedor
    ? `https://appjeezpro.store/catalogo?ref=${vendedor.codigo_referido}`
    : "https://appjeezpro.store/catalogo";

  const copyLink = () => {
    navigator.clipboard.writeText(linkReferido);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyTexto = () => {
    const texto = `🛒 ¡Catálogo MAQJEEZ 2026!\n\nRepuestos para desmalezadoras, motosierras, grupos electrógenos y más.\n\n💰 Hasta 20% OFF por volumen\n🚚 Envío gratis en compras +$100.000\n${vendedor ? `🎁 3% extra con mi código: ${codigo}\n` : ''}\n${linkReferido}`;
    navigator.clipboard.writeText(texto);
    setCopiedTexto(true);
    setTimeout(() => setCopiedTexto(false), 2000);
  };

  // Banner Oscuro - Industrial Premium
  const BannerOscuro = () => (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl border-4 border-gray-900 shadow-2xl"
      style={{ width: 360, height: 640, background: "radial-gradient(at top left, #374151, #111827)" }}
    >
      {/* Header */}
      <div className="pt-10 pb-6 px-6 text-center z-10">
        <h3 className="text-5xl font-black text-white tracking-tighter drop-shadow-lg">
          MAQ<span className="text-orange-500">JEEZ</span>
        </h3>
        <p className="text-gray-300 font-semibold text-sm mt-1 uppercase tracking-widest">
          Repuestos Moto-Implementos
        </p>
      </div>

      {/* Beneficios */}
      <div className="px-6 flex-grow flex flex-col justify-center space-y-4 z-10">
        <div className="flex items-center bg-gray-800/80 p-3 rounded-xl border border-gray-700">
          <span className="text-orange-500 text-xl mr-3 font-bold">%</span>
          <p className="text-white text-sm font-semibold">Hasta 20% OFF por volumen</p>
        </div>
        <div className="flex items-center bg-gray-800/80 p-3 rounded-xl border border-gray-700">
          <span className="text-orange-500 text-xl mr-3">🚚</span>
          <p className="text-white text-sm font-semibold">Envío gratis +$100.000</p>
        </div>
        <div className="flex items-center bg-gray-800/80 p-3 rounded-xl border border-gray-700">
          <span className="text-orange-500 text-xl mr-3">⚡</span>
          <p className="text-white text-sm font-semibold">3% extra cliente registrado</p>
        </div>
        <div className="flex items-center bg-gray-800/80 p-3 rounded-xl border border-gray-700">
          <span className="text-orange-500 text-xl mr-3">🤝</span>
          <p className="text-white text-sm font-semibold">3% extra link de referido</p>
        </div>
      </div>

      {/* Destacado 21% */}
      <div className="mx-6 mt-4 mb-4 text-center z-10">
        <div className="inline-block px-6 py-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
          style={{ boxShadow: "0 0 20px rgba(249,115,22,0.4)" }}>
          <p className="text-white text-sm font-bold">
            AHORRÁ HASTA UN <span className="text-2xl font-black">21%</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-6 pb-8 px-6 text-center border-t border-gray-800 z-10" style={{ background: "#111827" }}>
        <div className="border border-orange-500/50 rounded-lg p-3 mb-2" style={{ background: "rgba(0,0,0,0.5)" }}>
          <p className="text-gray-300 text-xs mb-1">Ingresá con el código:</p>
          <p className="text-orange-400 font-black text-xl tracking-wider">{codigo}</p>
        </div>
        <p className="text-white font-bold text-sm py-3 rounded-lg" style={{ background: "#ea580c" }}>
          appjeezpro.store/catalogo
        </p>
        <p className="text-gray-500 text-xs mt-3">Catálogo Maqjeez 2026</p>
      </div>
    </div>
  );

  // Banner Claro - Corporativo
  const BannerClaro = () => (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl border-4 border-gray-200 shadow-2xl bg-white"
      style={{ width: 360, height: 640 }}
    >
      {/* Fondo Superior */}
      <div
        className="pt-12 pb-24 px-6 text-center"
        style={{
          background: "linear-gradient(to bottom right, #f97316, #c2410c)",
          borderBottomLeftRadius: "50%",
          borderBottomRightRadius: "50%",
        }}
      >
        <h3 className="text-5xl font-black text-white tracking-tighter">MAQJEEZ</h3>
        <p className="text-orange-100 font-semibold text-sm mt-1 uppercase">
          Repuestos Moto-Implementos
        </p>
      </div>

      {/* Contenido */}
      <div className="px-6 -mt-16 flex-grow flex flex-col z-10">
        {/* Tarjeta de Beneficios */}
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100 mb-4">
          <ul className="space-y-4">
            <li className="flex items-start">
              <span className="bg-orange-100 text-orange-600 rounded-full p-1 mr-3 text-sm font-bold w-6 h-6 flex items-center justify-center">%</span>
              <p className="text-gray-800 text-sm font-bold mt-0.5">Hasta 20% OFF por volumen</p>
            </li>
            <li className="flex items-start">
              <span className="bg-green-100 text-green-600 rounded-full p-1 mr-3 text-sm font-bold w-6 h-6 flex items-center justify-center">🚚</span>
              <p className="text-gray-800 text-sm font-bold mt-0.5">Envío gratis +$100.000</p>
            </li>
            <li className="flex items-start">
              <span className="bg-blue-100 text-blue-600 rounded-full p-1 mr-3 text-sm font-bold w-6 h-6 flex items-center justify-center">⚡</span>
              <p className="text-gray-800 text-sm font-bold mt-0.5">3% extra cliente registrado</p>
            </li>
            <li className="flex items-start">
              <span className="bg-purple-100 text-purple-600 rounded-full p-1 mr-3 text-sm font-bold w-6 h-6 flex items-center justify-center">🤝</span>
              <p className="text-gray-800 text-sm font-bold mt-0.5">3% extra con referido</p>
            </li>
          </ul>
        </div>

        {/* Destacado */}
        <div className="text-center my-auto">
          <p className="text-gray-500 font-bold uppercase text-xs">Ahorrá en tu compra hasta</p>
          <p className="text-5xl font-black text-orange-600 mt-1">21%</p>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 text-center border-t border-gray-200" style={{ background: "#f9fafb" }}>
        <p className="text-gray-500 text-xs font-bold uppercase mb-2">Usá este código:</p>
        <div className="border-2 border-dashed border-orange-500 bg-orange-50 text-orange-600 font-black text-2xl py-2 rounded-lg mb-4 tracking-widest">
          {codigo}
        </div>
        <div className="text-white font-bold py-3 rounded-lg w-full mb-2" style={{ background: "#111827" }}>
          IR AL CATÁLOGO
        </div>
        <p className="text-gray-400 text-[10px]">appjeezpro.store/catalogo</p>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-20">
      <button
        onClick={() => router.push("/catalogo")}
        className="mb-4 flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver al catálogo
      </button>

      <div className="flex items-center gap-2 text-[#FF5722]">
        <Camera className="h-7 w-7" />
        <h1 className="text-2xl font-black text-white">Generador de Banners</h1>
      </div>
      <p className="mt-2 text-sm text-gray-400">
        Diseños optimizados para WhatsApp e Instagram Stories. Elegí tu estilo.
      </p>

      {/* Link de referido */}
      {vendedor && (
        <div className="mt-6 rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5 p-4">
          <p className="text-sm text-[#39FF14] font-medium">Tu link de referido</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={linkReferido}
              className="input input-sm flex-1 bg-black/30 text-xs font-mono"
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
      )}

      {/* Selector de modo */}
      <div className="mt-6 flex gap-2">
        <button
          onClick={() => setModo("oscuro")}
          className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium ${
            modo === "oscuro"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          🌙 Industrial Premium
        </button>
        <button
          onClick={() => setModo("claro")}
          className={`flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium ${
            modo === "claro"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          ☀️ Claro / Corporativo
        </button>
      </div>

      {/* Vista previa del banner */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-300">
            {modo === "oscuro" ? "Opción 1: Industrial Premium" : "Opción 2: Claro / Corporativo"}
          </h3>
          <span className="text-xs text-gray-500">360 x 640 px · 9:16</span>
        </div>

        <div className="flex justify-center bg-gray-800/50 rounded-xl p-6">
          {modo === "oscuro" ? <BannerOscuro /> : <BannerClaro />}
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          Hacé clic derecho sobre el banner → "Guardar imagen como..."
        </p>
      </div>

      {/* Instrucciones */}
      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#FDB71A]">
          Cómo publicar en WhatsApp / Instagram
        </h3>
        <div className="space-y-2 text-xs text-gray-400">
          <p>1. Hacé clic derecho sobre el banner → "Guardar imagen como..."</p>
          <p>2. En WhatsApp: Estado → 📎 → Galería → Seleccioná el banner</p>
          <p>3. En Instagram: Story → Subir desde galería</p>
          <p>4. Agregá tu link de referido en el sticker de enlace</p>
          <p>5. ¡Publicá y empezá a ganar comisiones!</p>
        </div>
      </div>

      {/* Texto sugerido */}
      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#39FF14]">Texto sugerido para publicar</h3>
        <div className="rounded-lg bg-black/30 p-3 text-sm text-gray-300 space-y-1">
          <p>🛒 ¡Catálogo MAQJEEZ 2026!</p>
          <p>Repuestos para desmalezadoras, motosierras, grupos electrógenos y más.</p>
          <p>💰 Hasta 20% OFF por volumen</p>
          <p>🚚 Envío gratis en compras +$100.000</p>
          {vendedor && (
            <p>🎁 3% extra usando mi código: {codigo}</p>
          )}
          <p className="text-[#39FF14] font-mono mt-2">{linkReferido}</p>
        </div>
        <button
          onClick={copyTexto}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5722] py-2 text-xs font-bold text-white hover:bg-[#E64A19]"
        >
          {copiedTexto ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copiedTexto ? "¡Copiado!" : "Copiar texto para publicar"}
        </button>
      </div>
    </main>
  );
}
