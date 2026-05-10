"use client";

<<<<<<< HEAD
import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  ArrowLeft,
  Package,
  Tag,
  Filter,
  Loader2,
  Eye,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface CatalogProduct {
  id: string;
  sku: string;
  name: string;
  catalog_price: number;
  image_url: string;
  category: string;
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function CatalogoPage() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("catalog_products")
      .select("id, sku, name, catalog_price, image_url, category")
      .eq("active", true)
      .order("name");

    if (error) {
      setError("Error cargando productos: " + error.message);
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  }

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  const filtered = products.filter((p) => {
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = !categoryFilter || p.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/taller"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight">
              Catálogo <span className="text-[#FF5722]">MaQjeez</span>
            </h1>
            <p className="text-xs text-gray-500">
              {products.length} productos disponibles
            </p>
          </div>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-[#FF5722]" />}
        </div>

        {/* Filtros */}
        <div className="max-w-7xl mx-auto px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#FF5722]/50"
            />
          </div>
          {categories.length > 1 && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-[#1a1a1a] border border-white/10 text-sm text-gray-300 focus:outline-none focus:border-[#FF5722]/50"
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/50 border border-red-800/40 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-[#FF5722]" />
            <p className="text-gray-500 text-sm">Cargando catálogo...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Package className="w-12 h-12 text-gray-700" />
            <p className="text-gray-500 text-sm">
              {search || categoryFilter
                ? "No hay productos que coincidan con los filtros"
                : "El catálogo está vacío"}
            </p>
            {(search || categoryFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setCategoryFilter("");
                }}
                className="text-[#FF5722] text-sm font-semibold hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-600 mb-3">
              Mostrando {filtered.length} de {products.length} productos
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: CatalogProduct }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="group rounded-xl bg-[#121212] border border-white/6 hover:border-[#FF5722]/30 transition-all overflow-hidden flex flex-col">
      {/* Imagen */}
      <div className="relative aspect-square bg-[#1a1a1a] overflow-hidden">
        {!imgError && product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            unoptimized
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-700">
            <Package className="w-8 h-8" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-gray-400 border border-white/10">
            {product.sku}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1">
        <p className="text-[11px] font-medium text-gray-300 line-clamp-2 leading-tight mb-2 flex-1">
          {product.name}
        </p>
        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black text-[#FF5722]">
            {fmtPrice(product.catalog_price)}
          </span>
        </div>
      </div>
    </div>
=======
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Tag } from "lucide-react";
import CatalogoProductImage from "@/components/catalogo/CatalogoProductImage";
import {
  fetchCatalogoJson,
  ordenarCategorias,
  precioMostrarCatalogo,
  type CatalogoDocumento,
  type CatalogoProducto,
} from "@/lib/catalogoMaqjeez";

function fmtPrecioVenta(precioLista: number) {
  const v = precioMostrarCatalogo(precioLista);
  if (v <= 0) return "Consultar";
  return "$" + v.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function CatalogoMaqjeezPage() {
  const [doc, setDoc] = useState<CatalogoDocumento | null>(null);
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string | "todas">("todas");

  useEffect(() => {
    let ok = true;
    fetchCatalogoJson().then((d) => {
      if (ok) setDoc(d);
    });
    return () => {
      ok = false;
    };
  }, []);

  const categorias = useMemo(
    () => (doc ? ordenarCategorias(doc.categorias) : []),
    [doc]
  );

  const productos = doc?.productos ?? [];

  const filtrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return productos.filter((p) => {
      if (catId !== "todas" && p.categoriaId !== catId) return false;
      if (!qq) return true;
      return (
        p.sku.toLowerCase().includes(qq) ||
        p.nombre.toLowerCase().includes(qq)
      );
    });
  }, [productos, catId, q]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, CatalogoProducto[]>();
    for (const p of filtrados) {
      const arr = map.get(p.categoriaId) ?? [];
      arr.push(p);
      map.set(p.categoriaId, arr);
    }
    return map;
  }, [filtrados]);

  const catNombre = (id: string) =>
    categorias.find((c) => c.id === id)?.nombre ?? id;

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-12 sm:px-5 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#FDB71A]">
              <BookOpen className="h-6 w-6 shrink-0" />
              <h1 className="truncate text-xl font-black text-white sm:text-2xl">
                {doc?.titulo ?? "Catálogo Maqjeez"}
              </h1>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              {doc?.subtitulo ??
                "Lista pública: solo SKU, descripción y precio (×4). Sin datos del taller."}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Precio mostrado = precio lista del catálogo × 4.
            </p>
          </div>
        </div>
      </div>

      <div className="card border border-white/10 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            className="input input-sm !min-h-[48px] pl-10"
            placeholder="Buscar por SKU o nombre…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="no-scrollbar flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCatId("todas")}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              catId === "todas"
                ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
                : "border-white/10 text-gray-400 hover:border-white/20"
            }`}
          >
            Todas ({productos.length})
          </button>
          {categorias.map((c) => {
            const n = productos.filter((p) => p.categoriaId === c.id).length;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setCatId(c.id)}
                className={`max-w-full truncate rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  catId === c.id
                    ? "border-[#FF5722] bg-[#FF5722]/20 text-[#FF5722]"
                    : "border-white/10 text-gray-400 hover:border-white/20"
                }`}
              >
                {c.nombre} ({n})
              </button>
            );
          })}
        </div>
      </div>

      {!doc && (
        <div className="card flex items-center gap-3 border border-white/10 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5722] border-t-transparent" />
          <p className="text-gray-400">Cargando catálogo…</p>
        </div>
      )}

      {doc && productos.length === 0 && (
        <div className="card flex flex-col items-center gap-3 border border-[#FDB71A]/30 bg-[#FDB71A]/5 py-14 text-center">
          <Tag className="h-10 w-10 text-[#FDB71A]" />
          <p className="font-bold text-white">Catálogo sin artículos</p>
          <p className="max-w-lg text-sm text-gray-400">
            Volcá el PDF con{" "}
            <span className="font-mono text-[#39FF14]">scripts/catalogo/extract_catalogo_pdf.py</span> o editá{" "}
            <span className="font-mono text-gray-300">apps/taller-demo/data/catalogo-public.json</span> (solo campos
            públicos). Imágenes tarjeta 360×480:{" "}
            <span className="font-mono text-gray-300">public/catalogo/productos/…/imagen.webp</span>.
          </p>
        </div>
      )}

      {doc && productos.length > 0 && filtrados.length === 0 && (
        <div className="card flex flex-col items-center gap-2 border border-white/10 py-14 text-center">
          <Tag className="h-10 w-10 text-gray-600" />
          <p className="font-semibold text-gray-300">No hay productos con ese criterio</p>
          <p className="max-w-md text-sm text-gray-500">Probá otra categoría o limpiá la búsqueda.</p>
        </div>
      )}

      {doc && catId === "todas" && filtrados.length > 0 && (
        <div className="space-y-10">
          {categorias.map((c) => {
            const lista = porCategoria.get(c.id);
            if (!lista?.length) return null;
            return (
              <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-[#FDB71A]/40 pb-2 text-lg font-black text-[#FDB71A]">
                  {c.nombre}
                </h2>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {lista.map((p) => (
                    <article
                      key={p.sku}
                      className="card flex flex-col overflow-hidden border border-white/10 bg-white/[0.03]"
                    >
                      <CatalogoProductImage producto={p} />
                      <div className="mt-3 space-y-1 px-2">
                        <p className="text-center font-mono text-sm font-black tracking-wide text-blue-400">
                          {p.sku}
                        </p>
                        <h3 className="whitespace-pre-line text-center text-sm font-semibold leading-snug text-gray-200">
                          {p.nombre}
                        </h3>
                        <p className="text-center text-lg font-black text-[#39FF14]">
                          {fmtPrecioVenta(p.precio)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {doc && catId !== "todas" && filtrados.length > 0 && (
        <section className="space-y-4">
          <h2 className="border-b border-[#FDB71A]/40 pb-2 text-lg font-black text-[#FDB71A]">
            {catNombre(catId)}
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filtrados.map((p) => (
              <article
                key={p.sku}
                className="card flex flex-col overflow-hidden border border-white/10 bg-white/[0.03]"
              >
                <CatalogoProductImage producto={p} />
                <div className="mt-3 space-y-1 px-2">
                  <p className="text-center font-mono text-sm font-black tracking-wide text-blue-400">
                    {p.sku}
                  </p>
                  <h3 className="whitespace-pre-line text-center text-sm font-semibold leading-snug text-gray-200">
                    {p.nombre}
                  </h3>
                  <p className="text-center text-lg font-black text-[#39FF14]">{fmtPrecioVenta(p.precio)}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-gray-600">
        ¿Trabajás en el taller?{" "}
        <Link href="/login?next=/taller" className="text-[#FDB71A] underline-offset-2 hover:underline">
          Ingresá con Google
        </Link>
      </p>
    </main>
>>>>>>> origin/main
  );
}
