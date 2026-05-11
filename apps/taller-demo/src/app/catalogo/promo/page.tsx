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
  const [modo, setModo] = useState<"story_oscuro" | "story_claro" | "post_oscuro" | "post_claro" | "wa_azul" | "wa_neon">("wa_azul");

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

  // Post Oscuro - Impacto Industrial (1:1)
  const PostOscuro = () => (
    <div
      className="relative flex flex-col overflow-hidden rounded-xl shadow-2xl border border-gray-800 p-6"
      style={{ width: 450, height: 450, background: "radial-gradient(at center, #374151, #111827)" }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-3">
        <div>
          <h3 className="text-4xl font-black text-white tracking-tighter leading-none">
            MAQ<span className="text-orange-500">JEEZ</span>
          </h3>
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-1">
            Repuestos Moto-Implementos
          </p>
        </div>
        <div className="text-white text-xs font-black px-3 py-1 rounded uppercase tracking-wider shadow-lg"
          style={{ background: "#ea580c", transform: "rotate(3deg)" }}>
          Catálogo 2026
        </div>
      </div>

      {/* Grid de Beneficios */}
      <div className="grid grid-cols-2 gap-3 mb-auto">
        <div className="flex flex-col items-center text-center bg-gray-800/60 p-3 rounded-lg border border-gray-700">
          <span className="text-orange-500 text-2xl font-black mb-1">%</span>
          <p className="text-gray-200 text-xs font-semibold leading-tight">
            Hasta 20% OFF<br /><span className="text-[10px] text-gray-400">por volumen</span>
          </p>
        </div>
        <div className="flex flex-col items-center text-center bg-gray-800/60 p-3 rounded-lg border border-gray-700">
          <span className="text-orange-500 text-2xl mb-1">🚚</span>
          <p className="text-gray-200 text-xs font-semibold leading-tight">
            Envío Gratis<br /><span className="text-[10px] text-gray-400">+$100.000</span>
          </p>
        </div>
        <div className="flex flex-col items-center text-center bg-gray-800/60 p-3 rounded-lg border border-gray-700">
          <span className="text-orange-500 text-2xl mb-1">⚡</span>
          <p className="text-gray-200 text-xs font-semibold leading-tight">
            3% Extra<br /><span className="text-[10px] text-gray-400">cliente registrado</span>
          </p>
        </div>
        <div className="flex flex-col items-center text-center bg-gray-800/60 p-3 rounded-lg border border-gray-700">
          <span className="text-orange-500 text-2xl mb-1">🤝</span>
          <p className="text-gray-200 text-xs font-semibold leading-tight">
            3% Extra<br /><span className="text-[10px] text-gray-400">con referido</span>
          </p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="mt-4 p-4 rounded-xl border text-center relative overflow-hidden"
        style={{ background: "linear-gradient(to right, #111827, #000000)", borderColor: "rgba(249,115,22,0.3)" }}>
        <div className="absolute inset-0" style={{ background: "rgba(249,115,22,0.1)", filter: "blur(20px)" }} />
        <p className="text-gray-300 text-[11px] font-bold uppercase relative z-10 mb-1">
          Usá el código{" "}
          <span className="text-orange-500 text-sm px-2 py-0.5 rounded border"
            style={{ background: "#1f2937", borderColor: "#374151" }}>{codigo}</span>
        </p>
        <div className="text-white font-black text-sm px-6 py-2.5 rounded-lg shadow-lg relative z-10 w-full mt-1"
          style={{ background: "#ea580c" }}>
          APPJEEZPRO.STORE/CATALOGO
        </div>
      </div>
    </div>
  );

  // Post Claro - Claro B2B (1:1)
  const PostClaro = () => (
    <div
      className="relative flex flex-col overflow-hidden rounded-xl shadow-2xl border border-gray-200 bg-white"
      style={{ width: 450, height: 450 }}
    >
      {/* Barra superior naranja */}
      <div className="h-2 w-full" style={{ background: "#ea580c" }} />

      <div className="p-6 flex flex-col h-full">
        {/* Header */}
        <div className="text-center mb-5">
          <h3 className="text-4xl font-black text-gray-900 tracking-tighter">MAQJEEZ</h3>
          <p className="font-bold text-xs uppercase tracking-widest mt-0.5" style={{ color: "#ea580c" }}>
            Repuestos Moto-Implementos
          </p>
        </div>

        {/* Lista de Beneficios */}
        <div className="rounded-xl p-4 border flex-grow mb-4 flex flex-col justify-center"
          style={{ background: "#f9fafb", borderColor: "#f3f4f6" }}>
          <ul className="space-y-3">
            <li className="flex items-center">
              <div className="rounded-lg p-1.5 mr-3 text-sm font-bold w-8 h-8 flex items-center justify-center"
                style={{ background: "#ffedd5", color: "#ea580c" }}>%</div>
              <p className="text-gray-800 text-sm font-bold">Hasta 20% OFF por volumen</p>
            </li>
            <li className="flex items-center">
              <div className="rounded-lg p-1.5 mr-3 text-sm font-bold w-8 h-8 flex items-center justify-center"
                style={{ background: "#dcfce7", color: "#16a34a" }}>🚚</div>
              <p className="text-gray-800 text-sm font-bold">Envío gratis superando $100.000</p>
            </li>
            <li className="flex items-center">
              <div className="rounded-lg p-1.5 mr-3 text-sm font-bold w-8 h-8 flex items-center justify-center"
                style={{ background: "#dbeafe", color: "#2563eb" }}>⚡</div>
              <p className="text-gray-800 text-sm font-bold">3% extra para clientes registrados</p>
            </li>
            <li className="flex items-center">
              <div className="rounded-lg p-1.5 mr-3 text-sm font-bold w-8 h-8 flex items-center justify-center"
                style={{ background: "#f3e8ff", color: "#9333ea" }}>🤝</div>
              <p className="text-gray-800 text-sm font-bold">3% extra con link de referido</p>
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="text-white rounded-xl p-4 text-center flex items-center justify-between"
          style={{ background: "#111827" }}>
          <div className="text-left">
            <p className="text-gray-400 text-[10px] font-bold uppercase mb-0.5">Código Promocional</p>
            <p className="font-black text-lg" style={{ color: "#fb923c" }}>{codigo}</p>
          </div>
          <div className="h-8 w-px bg-gray-700 mx-2" />
          <div className="text-right">
            <p className="text-white font-bold text-[11px] leading-tight mb-1">Ingresá a la tienda:</p>
            <p className="font-bold text-[11px] underline" style={{ color: "#fb923c" }}>appjeezpro.store</p>
          </div>
        </div>
      </div>
    </div>
  );

  // WhatsApp Azul & Naranja Premium
  const WaAzul = () => (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl shadow-2xl border-4 border-gray-900"
      style={{
        width: 360, height: 640,
        backgroundColor: "#0f172a",
        backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 2px, transparent 2px)",
        backgroundSize: "24px 24px",
      }}
    >
      {/* Zona segura superior simulada */}
      <div className="h-[60px] w-full z-20 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }} />

      {/* Contenido principal */}
      <div className="flex-grow flex flex-col justify-center px-6 py-12 z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h3 className="text-5xl font-black text-white tracking-tighter">
            MAQ<span className="text-orange-500">JEEZ</span>
          </h3>
          <div className="inline-block px-3 py-1 rounded-full mt-2"
            style={{ background: "rgba(249,115,22,0.2)", border: "1px solid rgba(249,115,22,0.5)" }}>
            <p className="text-orange-400 font-bold text-[10px] uppercase tracking-widest">Catálogo Mayorista 2026</p>
          </div>
        </div>

        {/* Beneficios en Cajas Oscuras */}
        <div className="space-y-3 mb-8">
          <div className="flex items-center p-3 rounded-xl border shadow-lg"
            style={{ background: "rgba(30,41,59,0.8)", borderColor: "#334155" }}>
            <div className="rounded-lg p-2 mr-3" style={{ background: "#334155" }}>
              <span className="text-orange-400 text-lg font-black block w-5 text-center">%</span>
            </div>
            <p className="text-gray-200 text-xs font-bold leading-tight">
              Hasta 20% OFF<br /><span className="text-[10px] text-gray-400 font-normal">comprando por volumen</span>
            </p>
          </div>
          <div className="flex items-center p-3 rounded-xl border shadow-lg"
            style={{ background: "rgba(30,41,59,0.8)", borderColor: "#334155" }}>
            <div className="rounded-lg p-2 mr-3" style={{ background: "#334155" }}>
              <span className="text-orange-400 text-lg font-black block w-5 text-center">🚚</span>
            </div>
            <p className="text-gray-200 text-xs font-bold leading-tight">
              Envío Gratis<br /><span className="text-[10px] text-gray-400 font-normal">en compras +$100.000</span>
            </p>
          </div>
          <div className="flex items-center p-3 rounded-xl border shadow-lg"
            style={{ background: "rgba(30,41,59,0.8)", borderColor: "#334155" }}>
            <div className="rounded-lg p-2 mr-3" style={{ background: "#334155" }}>
              <span className="text-orange-400 text-lg font-black block w-5 text-center">⭐</span>
            </div>
            <p className="text-gray-200 text-xs font-bold leading-tight">
              +6% de Descuento Extra<br /><span className="text-[10px] text-gray-400 font-normal">sumando registro y referidos</span>
            </p>
          </div>
        </div>

        {/* Código y Link */}
        <div className="text-center p-4 rounded-2xl border shadow-lg"
          style={{ background: "#0f172a", borderColor: "#475569", boxShadow: "0 0 20px rgba(0,0,0,0.5)" }}>
          <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">Tu código de acceso:</p>
          <p className="text-white font-black text-2xl tracking-widest mb-3">
            {codigo.slice(0, 3)}<span className="text-orange-500">{codigo.slice(3)}</span>
          </p>
          <div className="text-white font-bold text-sm py-3 px-4 rounded-xl shadow-lg"
            style={{ background: "#f97316" }}>
            appjeezpro.store/catalogo
          </div>
        </div>
      </div>

      {/* Zona segura inferior simulada */}
      <div className="h-[80px] w-full z-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }} />
    </div>
  );

  // WhatsApp Azul Profundo & Verde Neón
  const WaNeon = () => (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl shadow-2xl border-4 border-gray-200"
      style={{
        width: 360, height: 640,
        background: "linear-gradient(135deg, #020617 0%, #1e3a8a 100%)",
      }}
    >
      {/* Zona segura superior */}
      <div className="h-[60px] w-full z-20 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }} />

      <div className="flex-grow flex flex-col px-6 py-10 z-10 relative">
        {/* Elementos decorativos de fondo */}
        <div className="absolute top-20 right-[-50px] w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "rgba(74,222,128,0.1)", filter: "blur(40px)" }} />
        <div className="absolute bottom-20 left-[-50px] w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "rgba(59,130,246,0.2)", filter: "blur(40px)" }} />

        {/* Título */}
        <div className="text-left mt-6 mb-6 z-10">
          <h3 className="text-4xl font-black text-white tracking-tighter">MAQJEEZ</h3>
          <div className="h-1 w-12 mt-2 mb-2" style={{ background: "#4ade80" }} />
          <p className="font-semibold text-xs uppercase tracking-wide" style={{ color: "#bfdbfe" }}>
            Repuestos para<br />Moto-Implementos
          </p>
        </div>

        {/* Gran Ahorro Destacado */}
        <div className="rounded-2xl p-5 mb-6 z-10"
          style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)" }}>
          <p className="text-xs font-bold uppercase mb-1" style={{ color: "#bfdbfe" }}>Ahorro Máximo Posible</p>
          <div className="flex items-baseline">
            <span className="text-5xl font-black" style={{ color: "#4ade80" }}>21%</span>
            <span className="text-lg font-bold ml-1" style={{ color: "#4ade80" }}>OFF</span>
          </div>
        </div>

        {/* Beneficios Lista Limpia */}
        <ul className="space-y-4 z-10 mb-auto">
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full mr-3" style={{ background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
            <p className="text-white text-sm font-semibold">20% OFF por compras por volumen</p>
          </li>
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full mr-3" style={{ background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
            <p className="text-white text-sm font-semibold">Envío bonificado (+$100.000)</p>
          </li>
          <li className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full mr-3" style={{ background: "#4ade80", boxShadow: "0 0 5px #4ade80" }} />
            <p className="text-white text-sm font-semibold">Beneficios extra clientes & referidos</p>
          </li>
        </ul>

        {/* CTA Bottom */}
        <div className="mt-6 z-10">
          <p className="text-center text-[11px] mb-2" style={{ color: "#93c5fd" }}>
            Ingresá tu código{" "}
            <span className="font-bold px-1 rounded" style={{ color: "#4ade80", background: "rgba(30,58,138,0.5)" }}>{codigo}</span>{" "}
            en:
          </p>
          <div className="text-slate-900 font-black text-sm py-3 text-center rounded-lg w-full"
            style={{ background: "#4ade80" }}>
            appjeezpro.store/catalogo
          </div>
        </div>
      </div>

      {/* Zona segura inferior */}
      <div className="h-[80px] w-full z-20 pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)" }} />
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
        Diseños optimizados para WhatsApp, Instagram y Facebook. Elegí tu formato y estilo.
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
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          onClick={() => setModo("story_oscuro")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
            modo === "story_oscuro"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          🌙 Story Oscuro
        </button>
        <button
          onClick={() => setModo("story_claro")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
            modo === "story_claro"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          ☀️ Story Claro
        </button>
        <button
          onClick={() => setModo("post_oscuro")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
            modo === "post_oscuro"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          🖼️ Post Oscuro
        </button>
        <button
          onClick={() => setModo("post_claro")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
            modo === "post_claro"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          📋 Post Claro
        </button>
        <button
          onClick={() => setModo("wa_azul")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
            modo === "wa_azul"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          💬 WA Azul/Naranja
        </button>
        <button
          onClick={() => setModo("wa_neon")}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
            modo === "wa_neon"
              ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
              : "border-white/10 text-gray-400 hover:border-white/20"
          }`}
        >
          ⚡ WA Verde Neón
        </button>
      </div>

      {/* Vista previa del banner */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-300">
            {modo === "story_oscuro" ? "Story · Industrial Premium (9:16)" :
             modo === "story_claro" ? "Story · Claro / Corporativo (9:16)" :
             modo === "post_oscuro" ? "Post · Impacto Industrial (1:1)" :
             modo === "post_claro" ? "Post · Claro B2B (1:1)" :
             modo === "wa_azul" ? "WhatsApp · Azul & Naranja" :
             "WhatsApp · Verde Neón"}
          </h3>
          <span className="text-xs text-gray-500">
            {modo.startsWith("story") || modo.startsWith("wa") ? "360 x 640 px · 9:16" : "450 x 450 px · 1:1"}
          </span>
        </div>

        <div className="flex justify-center bg-gray-800/50 rounded-xl p-6">
          {modo === "story_oscuro" ? <BannerOscuro /> :
           modo === "story_claro" ? <BannerClaro /> :
           modo === "post_oscuro" ? <PostOscuro /> :
           modo === "post_claro" ? <PostClaro /> :
           modo === "wa_azul" ? <WaAzul /> :
           <WaNeon />}
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
