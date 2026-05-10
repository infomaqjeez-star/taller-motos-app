"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Tag, Plus, Minus, Users, X, Package, AlertCircle, Lightbulb, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import CartDrawer from "@/components/catalogo/CartDrawer";
import CartButton from "@/components/catalogo/CartButton";
import { useCart } from "@/components/catalogo/CartContext";
import { useVendedorAuth } from "@/components/vendedor/VendedorAuthContext";
import { useClienteAuth } from "@/components/cliente/ClienteAuthContext";
import ReferralTracker from "@/components/catalogo/ReferralTracker";

interface Producto {
  sku: string;
  name: string;
  catalog_price: number;
  image_url: string | null;
  category: string;
}

function fmtPrecio(precio: number) {
  if (!precio || precio <= 0) return "Consultar";
  return "$" + precio.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function useReferralBanner() {
  const [banner, setBanner] = useState<{ codigo: string; nombre: string } | null>(null);

  useEffect(() => {
    const code = localStorage.getItem("ref_codigo");
    const nombre = localStorage.getItem("ref_nombre");
    if (code && nombre) setBanner({ codigo: code, nombre });

    const onRef = () => {
      const c = localStorage.getItem("ref_codigo");
      const n = localStorage.getItem("ref_nombre");
      setBanner(c && n ? { codigo: c, nombre: n } : null);
    };
    window.addEventListener("ref-updated", onRef);
    return () => window.removeEventListener("ref-updated", onRef);
  }, []);

  const clear = () => {
    localStorage.removeItem("ref_codigo");
    localStorage.removeItem("ref_nombre");
    localStorage.removeItem("ref_vendedor_id");
    setBanner(null);
  };

  return { banner, clear };
}

export default function CatalogoMaqjeezPage() {
  return (
    <Suspense fallback={null}>
      <ReferralTracker />
      <CatalogoContent />
    </Suspense>
  );
}

function CatalogoContent() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState<string | "todas">("todas");
  const { addItem } = useCart();
  const { vendedor: vendedorLogueado } = useVendedorAuth();
  const { cliente: clienteLogueado, logout: logoutCliente } = useClienteAuth();
  const { banner: refBanner, clear: clearRef } = useReferralBanner();

  useEffect(() => {
    let ok = true;
    supabase
      .from("catalog_products")
      .select("sku, name, catalog_price, image_url, category")
      .eq("active", true)
      .order("sku", { ascending: true })
      .then(({ data, error }) => {
        if (!ok) return;
        if (error) console.error(error);
        setProductos(data || []);
        setLoading(false);
      });
    return () => { ok = false; };
  }, []);

  const categorias = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of productos) {
      map.set(p.category, (map.get(p.category) || 0) + 1);
    }
    const cats = Array.from(map.entries()).map(([id, count]) => ({ id, nombre: id, count }));
    // Ordenar alfabéticamente pero poner "Repuestos Varios" al final
    return cats.sort((a, b) => {
      if (a.id === "Repuestos Varios") return 1;
      if (b.id === "Repuestos Varios") return -1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [productos]);

  const filtrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return productos.filter((p) => {
      if (catId !== "todas" && p.category !== catId) return false;
      if (!qq) return true;
      return (
        p.sku.toLowerCase().includes(qq) ||
        p.name.toLowerCase().includes(qq)
      );
    });
  }, [productos, catId, q]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, Producto[]>();
    for (const p of filtrados) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return map;
  }, [filtrados]);

  return (
    <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 pb-12 sm:px-5 lg:px-8">
      {/* Header del catálogo */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[#FDB71A]">
                <BookOpen className="h-6 w-6 shrink-0" />
                <h1 className="truncate text-xl font-black text-white sm:text-2xl">
                  Catálogo Maqjeez
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-400">
                Lista pública de repuestos. Precios de referencia.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Contador de productos */}
            {!loading && (
              <span className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs font-medium text-gray-400">
                <Package className="h-3.5 w-3.5 text-[#FDB71A]" />
                {productos.length.toLocaleString("es-AR")} productos
              </span>
            )}
            {/* Cliente */}
            {clienteLogueado ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-400">
                  👤 {clienteLogueado.nombre}
                </span>
                <button
                  onClick={logoutCliente}
                  className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-gray-400 hover:text-white"
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link
                href="/catalogo/cliente/login"
                className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20"
              >
                👤 Cliente (-3%)
              </Link>
            )}
            {/* Vendedor */}
            {vendedorLogueado ? (
              <Link
                href="/catalogo/vendedor/dashboard"
                className="flex items-center gap-1.5 rounded-lg border border-[#FF5722]/30 bg-[#FF5722]/10 px-3 py-1.5 text-xs font-bold text-[#FF5722] hover:bg-[#FF5722]/20"
              >
                <Users className="h-3.5 w-3.5" />
                Mi cuenta
              </Link>
            ) : (
              <Link
                href="/catalogo/vendedor/login"
                className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-white/20 hover:text-white"
              >
                <Users className="h-3.5 w-3.5" />
                Soy vendedor
              </Link>
            )}
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-wrap gap-2">
          <ActionButton
            icon={<AlertCircle className="h-3.5 w-3.5" />}
            label="Reportar error"
            onClick={() =>
              window.open(
                "https://wa.me/5491121816064?text=" +
                  encodeURIComponent(
                    "Hola, quiero reportar un error en el catálogo Maqjeez:\n\n" +
                      "- Producto/SKU: \n" +
                      "- Descripción del error: \n" +
                      "- Captura (opcional): "
                  ),
                "_blank"
              )
            }
          />
          <ActionButton
            icon={<Lightbulb className="h-3.5 w-3.5" />}
            label="Sugerencia"
            onClick={() =>
              window.open(
                "https://wa.me/5491121816064?text=" +
                  encodeURIComponent(
                    "Hola, tengo una sugerencia para el catálogo Maqjeez:\n\n" +
                      "- Tipo de sugerencia: \n" +
                      "- Detalle: "
                  ),
                "_blank"
              )
            }
          />
          <ActionButton
            icon={<PlusCircle className="h-3.5 w-3.5" />}
            label="Solicitar producto"
            onClick={() =>
              window.open(
                "https://wa.me/5491121816064?text=" +
                  encodeURIComponent(
                    "Hola, quiero solicitar un nuevo producto en el catálogo Maqjeez:\n\n" +
                      "- Nombre del producto: \n" +
                      "- SKU (si lo conoce): \n" +
                      "- Descripción: "
                  ),
                "_blank"
              )
            }
          />
        </div>
      </div>

      {refBanner && (
        <div className="flex items-center justify-between rounded-xl border border-[#39FF14]/30 bg-[#39FF14]/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#39FF14]" />
            <p className="text-sm text-gray-300">
              Comprando con el vendedor{" "}
              <span className="font-bold text-[#39FF14]">{refBanner.nombre}</span> ({refBanner.codigo})
            </p>
          </div>
          <button
            onClick={clearRef}
            className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
        {/* Categorías — dropdown compacto */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Categoría:</span>
          <select
            value={catId}
            onChange={(e) => setCatId(e.target.value)}
            className="flex-1 min-w-0 rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-8 text-xs font-bold text-gray-200 focus:border-[#FF5722] focus:outline-none appearance-none truncate"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23999999' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '14px' }}
          >
            <option value="todas">Todas las categorías ({productos.length})</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} ({c.count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="card flex items-center gap-3 border border-white/10 py-10">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF5722] border-t-transparent" />
          <p className="text-gray-400">Cargando catálogo…</p>
        </div>
      )}

      {!loading && productos.length === 0 && (
        <div className="card flex flex-col items-center gap-3 border border-[#FDB71A]/30 bg-[#FDB71A]/5 py-14 text-center">
          <Tag className="h-10 w-10 text-[#FDB71A]" />
          <p className="font-bold text-white">Catálogo sin artículos</p>
          <p className="max-w-lg text-sm text-gray-400">
            El catálogo está vacío. Ejecutá el script de importación para cargar los productos.
          </p>
        </div>
      )}

      {!loading && productos.length > 0 && filtrados.length === 0 && (
        <div className="card flex flex-col items-center gap-2 border border-white/10 py-14 text-center">
          <Tag className="h-10 w-10 text-gray-600" />
          <p className="font-semibold text-gray-300">No hay productos con ese criterio</p>
          <p className="max-w-md text-sm text-gray-500">Probá otra categoría o limpiá la búsqueda.</p>
        </div>
      )}

      {!loading && catId === "todas" && filtrados.length > 0 && (
        <div className="space-y-10">
          {categorias.map((c) => {
            const lista = porCategoria.get(c.id);
            if (!lista?.length) return null;
            return (
              <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-24 space-y-4">
                <h2 className="border-b border-[#FDB71A]/40 pb-2 text-lg font-black text-[#FDB71A]">
                  {c.nombre}
                </h2>
                <div className="grid auto-rows-fr grid-cols-3 gap-2 sm:gap-4 xl:gap-6">
                  {lista.map((p) => (
                    <ProductCard key={p.sku} producto={p} addItem={addItem} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {!loading && catId !== "todas" && filtrados.length > 0 && (
        <section className="space-y-4">
          <h2 className="border-b border-[#FDB71A]/40 pb-2 text-lg font-black text-[#FDB71A]">
            {catId}
          </h2>
          <div className="grid auto-rows-fr grid-cols-3 gap-2 sm:gap-4 xl:gap-6">
            {filtrados.map((p) => (
              <ProductCard key={p.sku} producto={p} addItem={addItem} />
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

      <CartDrawer />
      <CartButton />
    </main>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-white/20 hover:bg-white/[0.05] hover:text-white transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}

function ProductCard({ producto, addItem }: { producto: Producto; addItem: ReturnType<typeof useCart>["addItem"] }) {
  const [qty, setQty] = useState(1);

  const increase = () => setQty((q) => q + 1);
  const decrease = () => setQty((q) => Math.max(1, q - 1));

  const handleAdd = () => {
    addItem({
      sku: producto.sku,
      nombre: producto.name,
      precio: producto.catalog_price || 0,
      imagen: producto.image_url || "",
      cantidad: qty,
    });
    setQty(1);
  };

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      {/* Imagen - se adapta al contenedor sin recortar */}
      <div className="relative flex aspect-square items-center justify-center bg-white/[0.04] overflow-hidden p-1 sm:p-2">
        {producto.image_url ? (
          <img
            src={producto.image_url}
            alt={producto.name}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-600">
            <Tag className="h-5 w-5" />
            <span className="text-[9px]">Sin imagen</span>
          </div>
        )}
      </div>

      {/* Contenido - compacto para 3 columnas en móvil */}
      <div className="flex flex-1 flex-col px-1.5 pt-1.5 pb-2 sm:px-2 sm:pb-3">
        <p className="text-center font-mono text-[9px] sm:text-xs font-black tracking-wide text-blue-400">
          {producto.sku}
        </p>
        <h3 className="mt-0.5 line-clamp-2 text-center text-[10px] sm:text-sm font-semibold leading-tight text-gray-200">
          {producto.name}
        </h3>
        <p className="mt-0.5 text-center text-[11px] sm:text-base font-black text-[#39FF14]">
          {fmtPrecio(producto.catalog_price)}
        </p>

        {/* Selector de cantidad */}
        <div className="mt-1 flex items-center justify-center gap-1 sm:gap-2">
          <button
            onClick={decrease}
            className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-md sm:rounded-lg bg-white/10 text-white hover:bg-white/20 active:scale-95"
          >
            <Minus className="h-3 w-3" />
          </button>
          <span className="w-4 sm:w-6 text-center text-[10px] sm:text-sm font-bold text-white">{qty}</span>
          <button
            onClick={increase}
            className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-md sm:rounded-lg bg-white/10 text-white hover:bg-white/20 active:scale-95"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {/* Botón Agregar - siempre al final */}
        <button
          onClick={handleAdd}
          className="mt-auto flex w-full items-center justify-center gap-0.5 rounded-md sm:rounded-lg bg-[#FF5722] py-1.5 sm:py-2 text-[10px] sm:text-sm font-bold text-white hover:bg-[#E64A19] active:scale-[0.98] transition-all"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="truncate">{qty > 1 ? `${qty}x` : "+"}</span>
        </button>
      </div>
    </article>
  );
}
