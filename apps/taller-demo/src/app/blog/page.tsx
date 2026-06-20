import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/store";
import { ArrowLeft, Clock, Tag } from "lucide-react";

export const revalidate = 60;

const SITE = "https://appjeezpro.store";
const BRAND_ORANGE = "#ea580c";

export const metadata: Metadata = {
  title: "Blog · Repuestos, talleres y motovehículos",
  description:
    "Artículos prácticos para mecánicos y dueños de talleres: repuestos, mantenimiento, integración con Mercado Libre, gestión de stock y novedades del catálogo MaqJeez.",
  alternates: { canonical: "/blog", types: { "application/rss+xml": "/feed.xml" } },
  openGraph: {
    type: "website",
    url: `${SITE}/blog`,
    title: "Blog MaqJeez",
    description: "Repuestos, mantenimiento y gestión de talleres en Argentina.",
  },
  twitter: { card: "summary_large_image" },
};

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <main className="min-h-[100dvh] bg-[#0a0a0a] text-white">
      <div className="mx-auto max-w-5xl px-5 md:px-8 pt-10 pb-16">
        <Link
          href="/landing"
          className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al sitio
        </Link>

        <header className="mt-10 mb-12 grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-4 items-end">
          <div className="md:col-span-8">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
              style={{ borderColor: `${BRAND_ORANGE}30`, color: BRAND_ORANGE }}
            >
              Blog
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Repuestos, talleres y motovehículos.
              <span className="block text-white/40">Sin vueltas.</span>
            </h1>
          </div>
          <div className="md:col-span-4 md:text-right">
            <p className="text-sm text-white/60 leading-relaxed">
              {posts.length === 0
                ? "Pronto vas a encontrar acá guías, tips y novedades del catálogo."
                : `${posts.length} ${posts.length === 1 ? "artículo publicado" : "artículos publicados"}.`}
            </p>
            <Link
              href="/feed.xml"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white transition"
            >
              Suscribirte por RSS →
            </Link>
          </div>
        </header>

        {posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-10 text-center">
            <p className="text-white/70">Todavía no hay artículos publicados.</p>
            <p className="text-sm text-white/40 mt-2">
              Mientras tanto, mirá el{" "}
              <Link href="/ayuda" className="underline underline-offset-2 hover:text-white" style={{ color: BRAND_ORANGE }}>
                centro de ayuda
              </Link>{" "}
              con 33 tutoriales.
            </p>
          </div>
        ) : (
          <ol className="space-y-3">
            {posts.map((p, idx) => (
              <li key={p.slug}>
                <article className="rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition">
                  <Link href={`/blog/${p.slug}`} className="block p-6 md:p-7">
                    <div className="flex items-baseline gap-3 text-[11px] text-white/40 mb-2">
                      <span className="font-mono tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                      <span>{fmtDate(p.publishedAt)}</span>
                      <span className="hidden md:inline">·</span>
                      <span className="hidden md:inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {p.readingTime} min lectura
                      </span>
                      {p.category && (
                        <>
                          <span className="hidden md:inline">·</span>
                          <span className="hidden md:inline">{p.category}</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight leading-tight text-white">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="mt-3 text-base text-white/65 leading-relaxed max-w-[60ch]">{p.excerpt}</p>
                    )}
                    {p.tags && p.tags.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {p.tags.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[11px] text-white/60"
                          >
                            <Tag className="h-3 w-3" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </article>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
