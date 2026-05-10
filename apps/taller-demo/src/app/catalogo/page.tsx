"use client";

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
  );
}
