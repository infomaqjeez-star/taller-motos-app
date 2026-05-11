"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen, Search, Tag, Plus, Minus, Users, X, Package, AlertCircle,
  Lightbulb, PlusCircle, ChevronDown, Clock, AlertTriangle, Megaphone,
  Funnel, User, TagIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import CartDrawer from "@/components/catalogo/CartDrawer";
import CartButton from "@/components/catalogo/CartButton";
import { useCart, CartItem } from "@/components/catalogo/CartContext";
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

function DropdownCategorias({
  catId,
  onChange,
  productos,
  categorias,
}: {
  catId: string;
  onChange: (id: string) => void;
  productos: Producto[];
  categorias: { id: string; nombre: string; count: number }[];
}) {
  const [open, setOpen] = useState(false);
  const selected = catId === "todas"
    ? `Todas las categorías (${productos.length})`
    : categorias.find((c) => c.id === catId)?.nombre || "Seleccionar";

  return (
    <div className="relative w-full md:w-72 shrink-0 z-30">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <Funnel className="h-4 w-4 text-slate-400" />
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 py-3.5 pl-11 pr-4 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
      >
        <span className="truncate">{selected}</span>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 py-1 shadow-xl">
            <button
              type="button"
              onClick={() => { onChange("todas"); setOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm ${catId === "todas" ? "bg-orange-500/10 text-orange-400 font-bold" : "text-slate-300 hover:bg-white/5"}`}
            >
              Todas las categorías ({productos.length})
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm ${catId === c.id ? "bg-orange-500/10 text-orange-400 font-bold" : "text-slate-300 hover:bg-white/5"}`}
              >
                {c.nombre} ({c.count})
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EntregasStatus() {
  const [open, setOpen] = useState(false);
  const estado = "normal";

  if (estado === "normal") {
    return (
      <div
        className="rounded-lg px-4 py-2.5 flex items-center gap-3"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
        </span>
        <p className="text-sm text-slate-300">
          <strong className="font-bold uppercase tracking-wider" style={{ color: "#10b981" }}>Normal</strong>
          {" "}— Entregas despachadas en 2 a 5 días hábiles
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-lg px-4 py-2.5 flex items-center gap-3" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
      <AlertTriangle className="h-4 w-4 text-amber-400" />
      <p className="text-sm text-slate-300">
        <strong className="font-bold uppercase tracking-wider text-amber-400">Demora</strong>
        {" "}— Entregas: 5 a 10 días hábiles
      </p>
    </div>
  );
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

const ORDEN_CATEGORIA: Record<string, number> = {
  "Motosierras": 0,
  "Desmalezadoras": 1,
  "Grupos Electrógenos": 2,
};
function pesoCategoria(cat?: string): number {
  if (!cat) return 9998;
  const exact = ORDEN_CATEGORIA[cat];
  if (exact !== undefined) return exact;
  if (cat === "Repuestos Varios") return 9999;
  return 100;
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

  // Ordenar productos por categoria (Motosierras primero) y luego por SKU
  const productosOrdenados = useMemo(() => {
    return [...productos].sort((a, b) => {
      const pa = pesoCategoria(a.category);
      const pb = pesoCategoria(b.category);
      if (pa !== pb) return pa - pb;
      return (a.sku || "").localeCompare(b.sku || "", undefined, { numeric: true, sensitivity: "base" });
    });
  }, [productos]);

  const categorias = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of productosOrdenados) map.set(p.category, (map.get(p.category) || 0) + 1);
    const cats = Array.from(map.entries()).map(([id, count]) => ({ id, nombre: id, count }));
    return cats.sort((a, b) => {
      const oa = pesoCategoria(a.id);
      const ob = pesoCategoria(b.id);
      if (oa !== ob) return oa - ob;
      return a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [productosOrdenados]);

  const filtrados = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return productosOrdenados.filter((p) => {
      if (catId !== "todas" && p.category !== catId) return false;
      if (!qq) return true;
      return p.sku.toLowerCase().includes(qq) || p.name.toLowerCase().includes(qq);
    });
  }, [productosOrdenados, catId, q]);

  const porCategoria = useMemo(() => {
    const map = new Map<string, Producto[]>();
    // Insertar en el orden de categorias (ya ordenadas) para preservar orden
    for (const c of categorias) {
      map.set(c.id, []);
    }
    for (const p of filtrados) {
      const arr = map.get(p.category);
      if (arr) arr.push(p);
    }
    return map;
  }, [filtrados, categorias]);

  return (
    <main className="min-h-screen pb-12">
      {/* TOP NAV FIXED */}
      <nav
        className="sticky top-0 z-50 px-4 md:px-8 py-4"
        style={{
          background: "rgba(2,6,23,0.8)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{ background: "linear-gradient(to bottom right, #f97316, #dc2626)" }}
            >
              <BookOpen className="text-xl text-white h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight leading-none">Catálogo MaqJeez</h1>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest mt-1">Repuestos & Accesorios</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
            {!loading && (
              <span className="bg-slate-800 text-slate-300 border border-slate-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                <Package className="h-3.5 w-3.5" style={{ color: "#f97316" }} /> Más de 5000 productos
              </span>
            )}
            {clienteLogueado ? (
              <span className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-3 py-1.5 rounded-full flex items-center gap-1">
                <User className="h-3.5 w-3.5" /> {clienteLogueado.nombre} (-3%)
              </span>
            ) : (
              <Link href="/catalogo/cliente/login" className="bg-blue-900/30 text-blue-400 border border-blue-800/50 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-blue-900/50 transition-colors">
                <User className="h-3.5 w-3.5" /> Cliente (-3%)
              </Link>
            )}
            <Link href="/catalogo/descuentos" className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-emerald-500/20 transition-colors">
              <TagIcon className="h-3.5 w-3.5" /> Promociones activas
            </Link>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            <Link
              href="/catalogo/promo"
              className="bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
            >
              <Megaphone className="h-4 w-4" /> Promocionar
            </Link>
            {vendedorLogueado ? (
              <Link
                href="/catalogo/vendedor/dashboard"
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Users className="h-4 w-4" /> Mi cuenta
              </Link>
            ) : (
              <Link
                href="/catalogo/vendedor/login"
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
              >
                <Users className="h-4 w-4" /> Soy vendedor
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        {/* STATUS & TOOLBAR */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <EntregasStatus />
          <div className="flex gap-2">
            <ActionBtn icon={<AlertCircle className="h-3.5 w-3.5" />} label="Error" onClick={() => window.open("https://wa.me/5491121816064?text=" + encodeURIComponent("Hola, quiero reportar un error en el catálogo Maqjeez:\n\n- Producto/SKU: \n- Descripción del error: \n- Captura (opcional): "), "_blank")} />
            <ActionBtn icon={<Lightbulb className="h-3.5 w-3.5" />} label="Sugerencia" onClick={() => window.open("https://wa.me/5491121816064?text=" + encodeURIComponent("Hola, tengo una sugerencia para el catálogo Maqjeez:\n\n- Tipo de sugerencia: \n- Detalle: "), "_blank")} />
            <ActionBtn icon={<PlusCircle className="h-3.5 w-3.5" />} label="Solicitar repuesto" onClick={() => window.open("https://wa.me/5491121816064?text=" + encodeURIComponent("Hola, quiero solicitar un nuevo producto en el catálogo Maqjeez:\n\n- Nombre del producto: \n- SKU (si lo conoce): \n- Descripción: "), "_blank")} />
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-10 flex flex-col md:flex-row gap-4 shadow-lg shadow-black/50">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por SKU, nombre o modelo de máquina..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-white text-sm rounded-xl block pl-11 p-3.5 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
            />
          </div>
          <DropdownCategorias catId={catId} onChange={setCatId} productos={productos} categorias={categorias} />
        </div>

        {/* Referral Banner */}
        {refBanner && (
          <div
            className="flex items-center justify-between rounded-xl px-4 py-3 mb-6"
            style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.3)" }}
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <p className="text-sm text-slate-300">
                Comprando con el vendedor <span className="font-bold text-emerald-400">{refBanner.nombre}</span> ({refBanner.codigo})
              </p>
            </div>
            <button onClick={clearRef} className="rounded-lg p-1 text-slate-500 hover:bg-white/10 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
            <p className="text-slate-400">Cargando catálogo…</p>
          </div>
        )}

        {/* EMPTY */}
        {!loading && productos.length === 0 && (
          <div className="flex flex-col items-center gap-3 border border-orange-500/20 py-14 text-center rounded-2xl" style={{ background: "rgba(249,115,22,0.05)" }}>
            <Tag className="h-10 w-10 text-orange-400" />
            <p className="font-bold text-white">Catálogo sin artículos</p>
            <p className="max-w-lg text-sm text-slate-400">Ejecutá el script de importación para cargar los productos.</p>
          </div>
        )}

        {/* NO RESULTS */}
        {!loading && productos.length > 0 && filtrados.length === 0 && (
          <div className="flex flex-col items-center gap-2 border border-slate-800 py-14 text-center rounded-2xl">
            <Tag className="h-10 w-10 text-slate-600" />
            <p className="font-semibold text-slate-300">No hay productos con ese criterio</p>
            <p className="max-w-md text-sm text-slate-500">Probá otra categoría o limpiá la búsqueda.</p>
          </div>
        )}

        {/* ALL CATEGORIES */}
        {!loading && catId === "todas" && filtrados.length > 0 && (
          <div className="space-y-12">
            {categorias.map((c) => {
              const lista = porCategoria.get(c.id);
              if (!lista?.length) return null;
              return (
                <section key={c.id} id={`cat-${c.id}`} className="scroll-mt-24">
                  <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider" style={{ color: "#f97316" }}>{c.nombre}</h2>
                    <div className="h-px flex-grow" style={{ background: "#1e293b" }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {lista.map((p) => (
                      <ProductCard key={p.sku} producto={p} addItem={addItem} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* SINGLE CATEGORY */}
        {!loading && catId !== "todas" && filtrados.length > 0 && (
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider" style={{ color: "#f97316" }}>{catId}</h2>
              <div className="h-px flex-grow" style={{ background: "#1e293b" }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtrados.map((p) => (
                <ProductCard key={p.sku} producto={p} addItem={addItem} />
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-slate-600 mt-12">
          ¿Trabajás en el taller?{" "}
          <Link href="/login?next=/taller" className="text-orange-400 hover:underline underline-offset-2">Ingresá con Google</Link>
        </p>
      </div>

      <CartDrawer />
      <CartButton />
    </main>
  );
}

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:border-slate-700 transition-colors"
    >
      {icon} {label}
    </button>
  );
}

function ProductCard({ producto, addItem }: { producto: Producto; addItem: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => void }) {
  const [qty, setQty] = useState(1);
  const increase = () => setQty((q) => q + 1);
  const decrease = () => setQty((q) => Math.max(1, q - 1));
  const handleAdd = () => {
    addItem({ sku: producto.sku, nombre: producto.name, precio: producto.catalog_price || 0, imagen: producto.image_url || "", cantidad: qty });
    setQty(1);
  };

  const hasImage = !!producto.image_url;

  return (
    <article
      className="flex flex-col overflow-hidden rounded-2xl group"
      style={{
        background: "linear-gradient(145deg, rgba(15,23,42,0.9) 0%, rgba(15,23,42,0.4) 100%)",
        border: "1px solid rgba(255,255,255,0.05)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(249,115,22,0.5)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 10px 25px -5px rgba(0,0,0,0.5), 0 8px 10px -6px rgba(249,115,22,0.1)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.05)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      {/* Image */}
      <div className="bg-slate-50 h-48 p-4 relative flex items-center justify-center overflow-hidden">
        <span
          className="absolute top-3 left-3 text-white text-xs font-bold font-mono px-2 py-1 rounded shadow-md border"
          style={{ background: "rgba(15,23,42,0.9)", backdropFilter: "blur(4px)", borderColor: "#334155" }}
        >
          SKU: {producto.sku}
        </span>
        {hasImage ? (
          <img
            src={producto.image_url!}
            alt={producto.name}
            className="max-h-full max-w-full object-contain group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-32 h-32 bg-slate-300 rounded-full flex items-center justify-center shadow-inner">
            <Tag className="h-12 w-12 text-slate-500" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-slate-200 font-semibold text-sm leading-tight min-h-[2.5rem] mb-2">{producto.name}</h3>
        <div className="mt-auto">
          <p className="text-xs text-slate-500 mb-0.5">Precio de referencia</p>
          <div className="font-black text-2xl tracking-tight mb-4" style={{ color: "#10b981" }}>{fmtPrecio(producto.catalog_price)}</div>

          <div className="flex items-stretch gap-2">
            <div className="flex items-center bg-slate-950 rounded-xl border border-slate-700 overflow-hidden w-24 shrink-0">
              <button onClick={decrease} className="w-8 h-full flex justify-center items-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <input type="number" value={qty} readOnly className="w-full h-10 bg-transparent text-center text-white font-bold text-sm outline-none" />
              <button onClick={increase} className="w-8 h-full flex justify-center items-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-grow font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-white text-sm"
              style={{ background: "#f97316", boxShadow: "0 10px 25px rgba(249,115,22,0.2)" }}
            >
              {qty > 1 ? `${qty}x Agregar` : "Agregar"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
