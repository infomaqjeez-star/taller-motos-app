import Link from "next/link";

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#121212] text-gray-100">
      <header className="border-b border-white/10 bg-black/50 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <Link href="/catalogo" className="text-lg font-black tracking-tight text-[#FDB71A]">
            Maqjeez — Catálogo público
          </Link>
          <p className="max-w-xl text-xs text-gray-500">
            Solo se muestran datos de catálogo (SKU, descripción, precio). El taller requiere sesión con Google.
          </p>
          <Link
            href="/login?next=/taller"
            className="shrink-0 rounded-xl border border-[#1E3A8A]/40 bg-[#1E3A8A]/20 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1E3A8A]/40"
          >
            Ingresar al taller
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
