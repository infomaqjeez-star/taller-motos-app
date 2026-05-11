"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Search, Tag, Plus, Minus, Users, X, Package, AlertCircle, Lightbulb, PlusCircle, ChevronDown, Clock, AlertTriangle } from "lucide-react";
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
    <div className="relative flex-1 min-w-0 z-30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 py-2 pl-3 pr-2 text-xs font-bold text-gray-200 hover:border-white/20"
      >
        <span className="truncate">{selected}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-[#1a1a1a] py-1 shadow-xl">
            <button
              type="button"
              onClick={() => { onChange("todas"); setOpen(false); }}
              className={`w-full px-3 py-2 text-left text-xs ${catId === "todas" ? "bg-[#FF5722]/20 text-[#FF5722] font-bold" : "text-gray-300 hover:bg-white/5"}`}
            >
              Todas las categorías ({productos.length})
            </button>
            {categorias.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { onChange(c.id); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-xs ${catId === c.id ? "bg-[#FF5722]/20 text-[#FF5722] font-bold" : "text-gray-300 hover:bg-white/5"}`}
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

function fmtPrecio(precio: number) {
  if (!precio || precio <= 0) return "Consultar";
  return "$" + precio.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

function EntregasStatus() {
  const [open, setOpen] = useState(false);
  // Cambiar a "demora" cuando haya alta demanda
  const estado = "normal";

  if (estado === "normal") {
    return (
      <div className="rounded-xl border border-[#39FF14]/20 bg-[#39FF14]/5 px-4 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-[#39FF14] animate-pulse" />
            <span className="text-xs font-bold text-[#39FF14]">NORMAL</span>
            <span className="text-xs text-gray-400">— Entrega: 2 a 5 días hábiles</span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="text-gray-500 hover:text-white"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </div>
        {open && (
          <div className="mt-2 space-y-1 text-xs text-gray-400">
            <p className="text-[#39FF14]">✓ Despacho en 24-48hs</p>
            <p>✓ Días hábiles: Lunes a Viernes</p>
            <p className="text-gray-500">En alta demanda podrían extenderse los plazos.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span className="text-xs font-bold text-yellow-400">DEMORA</span>
          <span className="text-xs text-gray-400">— Entrega: 5 a 10 días hábiles</span>
        </div>
        <button
          onClick={() => setOpen(!open)}
          className="text-gray-500 hover:text-white"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="mt-2 space-y-1 text-xs text-gray-400">
          <p className="text-yellow-400 font-bold">⚠ ALTA DEMANDA</p>
          <p>• Despacho en 48-72hs</p>
          <p>• Te contactaremos por WhatsApp</p>
          <p className="text-gray-500">Disculpá las molestias. Estamos normalizando.</p>
        </div>
      )}
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
              <div className="flex flex-col items-end gap-1">
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
                {clienteLogueado.vendedor_referente && (
                  <span className="text-[9px] text-purple-400">
                    Referido por: {clienteLogueado.vendedor_referente.nombre}
                  </span>
                )}
              </div>
            ) : (
              <Link
                href="/catalogo/cliente/login"
                className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-bold text-blue-400 hover:bg-blue-500/20"
              >
                👤 Cliente (-3%)
              </Link>
            )}
            {/* Descuentos */}
            <Link
              href="/catalogo/descuentos"
              className="flex items-center gap-1 rounded-lg border border-[#39FF14]/30 bg-[#39FF14]/10 px-2 py-1 text-[10px] font-bold text-[#39FF14] hover:bg-[#39FF14]/20"
            >
              🎁 Descuentos
            </Link>
            {/* Promo */}
            <Link
              href="/catalogo/promo"
              className="flex items-center gap-1 rounded-lg border border-[#FF5722]/30 bg-[#FF5722]/10 px-2 py-1 text-[10px] font-bold text-[#FF5722] hover:bg-[#FF5722]/20"
            >
              📢 Promocionar
            </Link>
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

      {/* Estado de entregas */}
      <EntregasStatus />

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
        {/* Categorías — dropdown custom con estilos dark */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Categoría:</span>
          <DropdownCategorias
            catId={catId}
            onChange={setCatId}
            productos={productos}
            categorias={categorias}
          />
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
      {/* Imagen - recorta parte inferior para ocultar precio de costo */}
      <div className="relative flex aspect-square items-center justify-center bg-white/[0.04] overflow-hidden p-1 sm:p-2">
        {producto.image_url ? (
          <>
            <img
              src={producto.image_url}
              alt={producto.name}
              className="h-full w-full object-cover object-top"
              loading="lazy"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {/* Overlay blanco para tapar precio de costo residual */}
            <div className="absolute bottom-0 left-0 right-0 h-[15%] bg-gradient-to-t from-[#1a1a1a] to-transparent" />
          </>
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
          className="mt-auto flex w-full items-center justify-center rounded-md sm:rounded-lg bg-[#FF5722] py-1.5 sm:py-2 text-[10px] sm:text-sm font-bold text-white hover:bg-[#E64A19] active:scale-[0.98] transition-all"
        >
          {qty > 1 ? `${qty}x` : "Agregar"}
        </button>
      </div>
    </article>
  );
}
