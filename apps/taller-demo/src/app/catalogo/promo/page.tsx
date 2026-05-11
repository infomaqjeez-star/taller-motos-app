"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import {
  ArrowLeft,
  Download,
  Smartphone,
  Image,
  Share2,
  Copy,
  Check,
  Camera,
  ShoppingBag,
  Percent,
  Truck,
  Zap,
} from "lucide-react";

export default function PromoBannersPage() {
  const router = useRouter();
  const { vendedor } = useVendedorAuth();
  const [copied, setCopied] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(0);
  const bannerRef = useRef<HTMLDivElement>(null);

  const linkReferido = vendedor
    ? `https://appjeezpro.store/catalogo?ref=${vendedor.codigo_referido}`
    : "https://appjeezpro.store/catalogo";

  const codigo = vendedor?.codigo_referido || "MAQ001";

  const copyLink = () => {
    navigator.clipboard.writeText(linkReferido);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const banners = [
    {
      id: 0,
      name: "Story WhatsApp / Instagram",
      ratio: "9:16",
      style: { width: 360, height: 640 },
      tipo: "story",
    },
    {
      id: 1,
      name: "Post Instagram / Facebook",
      ratio: "1:1",
      style: { width: 500, height: 500 },
      tipo: "post",
    },
    {
      id: 2,
      name: "Estado WhatsApp",
      ratio: "9:16",
      style: { width: 360, height: 640 },
      tipo: "whatsapp",
    },
  ];

  const downloadBanner = () => {
    // Por ahora, instruimos al usuario a hacer captura de pantalla
    alert(
      "Para descargar el banner:\n\n" +
      "1. Hacé clic derecho sobre el banner → 'Guardar imagen como...'\n" +
      "2. O usá la tecla Impr Pant y recortá el banner\n\n" +
      "Tip: En Chrome podés hacer clic derecho → Inspect → en la consola ejecutá: document.querySelector('[data-banner]').scrollIntoView() y luego capturá."
    );
  };

  const BannerContent = ({ tipo }: { tipo: string }) => {
    const isStory = tipo === "story" || tipo === "whatsapp";
    const isWhatsApp = tipo === "whatsapp";

    return (
      <div
        ref={bannerRef}
        data-banner="true"
        className={`relative flex flex-col items-center justify-center overflow-hidden ${
          isStory ? "aspect-[9/16]" : "aspect-square"
        }`}
        style={{
          background: isWhatsApp
            ? "linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)"
            : "linear-gradient(135deg, #FF5722 0%, #E64A19 30%, #FDB71A 70%, #39FF14 100%)",
          width: "100%",
          height: "100%",
        }}
      >
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Logo / Marca */}
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <div className={`${isStory ? "text-5xl mb-4" : "text-4xl mb-3"} font-black text-white drop-shadow-lg`}>
            MAQJEEZ
          </div>
          
          <div className={`${isStory ? "text-lg mb-2" : "text-base mb-1"} font-bold text-white/90`}>
            Repuestos para Moto-Implementos
          </div>

          {/* Beneficios */}
          <div className={`mt-4 ${isStory ? "space-y-3" : "space-y-2"}`}>
            <div className={`flex items-center gap-2 ${isStory ? "text-base" : "text-sm"} text-white font-semibold`}>
              <Percent className={`${isStory ? "h-5 w-5" : "h-4 w-4"} text-[#39FF14]`} />
              Hasta 20% OFF por volumen
            </div>
            <div className={`flex items-center gap-2 ${isStory ? "text-base" : "text-sm"} text-white font-semibold`}>
              <Truck className={`${isStory ? "h-5 w-5" : "h-4 w-4"} text-[#39FF14]`} />
              Envío gratis +$100.000
            </div>
            <div className={`flex items-center gap-2 ${isStory ? "text-base" : "text-sm"} text-white font-semibold`}>
              <Zap className={`${isStory ? "h-5 w-5" : "h-4 w-4"} text-[#39FF14]`} />
              3% extra cliente registrado
            </div>
            {vendedor && (
              <div className={`flex items-center gap-2 ${isStory ? "text-base" : "text-sm"} text-white font-semibold`}>
                <ShoppingBag className={`${isStory ? "h-5 w-5" : "h-4 w-4"} text-[#39FF14]`} />
                3% extra con mi link de referido
              </div>
            )}
          </div>

          {/* Precio destacado */}
          {isStory && (
            <div className="mt-6 rounded-2xl border-2 border-white/30 bg-white/10 px-6 py-3 backdrop-blur-sm">
              <p className="text-sm text-white/80">Ahorrá hasta</p>
              <p className="text-3xl font-black text-[#39FF14]">21%</p>
              <p className="text-sm text-white/80">en tu compra</p>
            </div>
          )}

          {/* Link */}
          <div className={`mt-${isStory ? "8" : "4"} rounded-xl border border-white/30 bg-black/30 px-4 py-2 backdrop-blur-sm`}>
            <p className={`${isStory ? "text-base" : "text-sm"} font-mono text-white font-bold`}>
              appjeezpro.store/catalogo
            </p>
            {vendedor && (
              <p className={`${isStory ? "text-sm" : "text-xs"} text-[#39FF14] font-mono mt-1`}>
                Código: {codigo}
              </p>
            )}
          </div>

          {/* QR hint */}
          <div className={`mt-${isStory ? "4" : "2"} text-white/60 ${isStory ? "text-sm" : "text-xs"}`}>
            Escanéá o ingresá al link
          </div>
        </div>

        {/* Footer marca */}
        <div className="absolute bottom-4 left-0 right-0 text-center">
          <p className={`text-white/50 ${isStory ? "text-xs" : "text-[10px]"}`}>
            Catálogo Maqjeez 2026
          </p>
        </div>
      </div>
    );
  };

  const currentBanner = banners[selectedBanner];

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
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
        Creá banners promocionales para WhatsApp, Instagram y Facebook.
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

      {/* Selector de formato */}
      <div className="mt-6 flex flex-wrap gap-2">
        {banners.map((b) => (
          <button
            key={b.id}
            onClick={() => setSelectedBanner(b.id)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium ${
              selectedBanner === b.id
                ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
                : "border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            {b.tipo === "story" ? <Smartphone className="h-3.5 w-3.5" /> : b.tipo === "whatsapp" ? <Share2 className="h-3.5 w-3.5" /> : <Image className="h-3.5 w-3.5" />}
            {b.name}
          </button>
        ))}
      </div>

      {/* Vista previa del banner */}
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-300">Vista previa</h3>
          <button
            onClick={downloadBanner}
            className="flex items-center gap-1 rounded-lg bg-[#39FF14] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#32E612]"
          >
            <Download className="h-3.5 w-3.5" />
            Cómo guardar
          </button>
        </div>

        <div className="flex justify-center bg-gray-800/50 rounded-xl p-6">
          <div
            className="overflow-hidden rounded-xl shadow-2xl"
            style={{ maxWidth: currentBanner.style.width, width: "100%" }}
          >
            <BannerContent tipo={currentBanner.tipo} />
          </div>
        </div>

        <p className="mt-3 text-center text-xs text-gray-500">
          {currentBanner.ratio} · Hacé clic derecho sobre el banner → "Guardar imagen como..."
        </p>
      </div>

      {/* Instrucciones */}
      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#FDB71A]">
          Cómo usar en WhatsApp / Instagram
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
            <p>🎁 3% extra usando mi link: {codigo}</p>
          )}
          <p className="text-[#39FF14] font-mono mt-2">{linkReferido}</p>
        </div>
        <button
          onClick={() => {
            const texto = `🛒 ¡Catálogo MAQJEEZ 2026!\n\nRepuestos para desmalezadoras, motosierras, grupos electrógenos y más.\n\n💰 Hasta 20% OFF por volumen\n🚚 Envío gratis en compras +$100.000\n${vendedor ? `🎁 3% extra con mi código: ${codigo}\n` : ''}\n${linkReferido}`;
            navigator.clipboard.writeText(texto);
            alert("Texto copiado al portapapeles");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF5722] py-2 text-xs font-bold text-white hover:bg-[#E64A19]"
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar texto para publicar
        </button>
      </div>
    </main>
  );
}
