"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, Search, DollarSign, Tag, Percent, CheckCircle,
  XCircle, Loader2, Package, ImageOff, Zap, Slash
} from "lucide-react";

interface ProductoData {
  sku: string;
  name: string;
  catalog_price: number;
  discount_price: number | null;
  on_sale: boolean;
  discount_pct: number;
  image_url: string | null;
  active: boolean;
}

function fmtPrecio(precio: number | null) {
  if (!precio || precio <= 0) return "$0";
  return "$" + precio.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function AdminPreciosPage() {
  const [skuInput, setSkuInput] = useState("");
  const [producto, setProducto] = useState<ProductoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [precioNormal, setPrecioNormal] = useState("");
  const [enOferta, setEnOferta] = useState(false);
  const [pctDescuento, setPctDescuento] = useState("");
  const [precioOferta, setPrecioOferta] = useState("");

  const buscar = useCallback(async () => {
    const sku = skuInput.trim();
    if (!sku) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setProducto(null);
    try {
      const res = await fetch(`/api/catalogo/precios-sku?sku=${encodeURIComponent(sku)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al buscar");
        return;
      }
      const p = data.producto as ProductoData;
      setProducto(p);
      setPrecioNormal(String(p.catalog_price || ""));
      setEnOferta(p.on_sale || false);
      setPctDescuento(String(p.discount_pct || ""));
      setPrecioOferta(p.discount_price ? String(p.discount_price) : "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [skuInput]);

  const calcularOfertaDesdePct = useCallback(() => {
    const precio = Number(precioNormal);
    const pct = Number(pctDescuento);
    if (precio > 0 && pct > 0 && pct <= 100) {
      const oferta = Math.round(precio * (1 - pct / 100));
      setPrecioOferta(String(oferta));
    }
  }, [precioNormal, pctDescuento]);

  const calcularPctDesdeOferta = useCallback(() => {
    const precio = Number(precioNormal);
    const oferta = Number(precioOferta);
    if (precio > 0 && oferta > 0 && oferta < precio) {
      const pct = Math.round(((precio - oferta) / precio) * 100);
      setPctDescuento(String(pct));
    }
  }, [precioNormal, precioOferta]);

  const guardar = useCallback(async () => {
    if (!producto) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const body: Record<string, unknown> = {
        sku: producto.sku,
        catalog_price: Number(precioNormal) || 0,
        on_sale: enOferta,
      };

      if (enOferta) {
        const oferta = Number(precioOferta);
        if (oferta > 0 && oferta < Number(precioNormal)) {
          body.discount_price = oferta;
        } else {
          body.discount_price = null;
        }
        const pct = Number(pctDescuento);
        if (pct > 0 && pct <= 100) {
          body.discount_pct = pct;
        } else {
          body.discount_pct = 0;
        }
      } else {
        body.discount_price = null;
        body.discount_pct = 0;
      }

      const res = await fetch("/api/catalogo/precios-sku", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        return;
      }
      setSuccess(`Guardado: ${producto.sku} — ${data.producto.name}`);
      setProducto(data.producto);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [producto, precioNormal, enOferta, precioOferta, pctDescuento]);

  return (
    <main className="min-h-screen pb-12" style={{ background: "#121212" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 border-b"
        style={{ background: "#121212", borderColor: "rgba(255,255,255,0.07)" }}>
        <Link href="/catalogo" className="p-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="font-black text-white text-base flex items-center gap-2">
            <DollarSign className="w-5 h-5" style={{ color: "#39FF14" }} /> Precios por SKU
          </h1>
          <p className="text-[10px]" style={{ color: "#6B7280" }}>Subir precio o poner en oferta un producto</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 pt-5 space-y-4">

        {/* Buscador SKU */}
        <div className="rounded-2xl p-4 space-y-3"
          style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
          <label className="text-xs font-bold text-gray-400 block">Buscar por SKU</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#6B7280" }} />
              <input
                value={skuInput}
                onChange={(e) => setSkuInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && buscar()}
                placeholder="Ej: AK-123, CARDAN-456"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none uppercase"
                style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            </div>
            <button
              onClick={buscar}
              disabled={loading || !skuInput.trim()}
              className="px-4 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40"
              style={{ background: "#39FF14", color: "#121212" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
            </button>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#ef444418", border: "1px solid #ef444440" }}>
            <XCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#ef4444" }} />
            <p className="text-sm text-white">{error}</p>
          </div>
        )}
        {success && (
          <div className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: "#39FF1418", border: "1px solid #39FF1440" }}>
            <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#39FF14" }} />
            <p className="text-sm text-white">{success}</p>
          </div>
        )}

        {/* Producto encontrado */}
        {producto && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "#1F1F1F", border: "1px solid rgba(255,255,255,0.07)" }}>
            {/* Card producto */}
            <div className="p-4 flex gap-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-slate-800 flex items-center justify-center">
                {producto.image_url ? (
                  <img src={producto.image_url} alt={producto.name} className="w-full h-full object-contain" />
                ) : (
                  <ImageOff className="w-8 h-8 text-gray-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-800 text-gray-300">{producto.sku}</span>
                  {producto.on_sale && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: "#ef444420", color: "#ef4444" }}>
                      <Zap className="w-3 h-3 inline mr-0.5" />EN OFERTA -{producto.discount_pct}%
                    </span>
                  )}
                  {!producto.active && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gray-700 text-gray-400">INACTIVO</span>
                  )}
                </div>
                <p className="text-sm font-bold text-white line-clamp-2">{producto.name}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  {producto.on_sale && producto.discount_price ? (
                    <>
                      <span className="text-lg font-black" style={{ color: "#39FF14" }}>{fmtPrecio(producto.discount_price)}</span>
                      <span className="text-sm" style={{ color: "#6B7280", textDecoration: "line-through" }}>{fmtPrecio(producto.catalog_price)}</span>
                    </>
                  ) : (
                    <span className="text-lg font-black" style={{ color: "#39FF14" }}>{fmtPrecio(producto.catalog_price)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Formulario edición */}
            <div className="p-4 space-y-4">
              <p className="text-sm font-black text-white flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: "#FFE600" }} /> Editar precio
              </p>

              {/* Precio normal */}
              <div>
                <label className="text-xs font-bold text-gray-400 mb-1.5 block">Precio normal (catálogo)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#39FF14" }} />
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={precioNormal}
                    onChange={(e) => {
                      setPrecioNormal(e.target.value);
                      if (enOferta && pctDescuento) {
                        const precio = Number(e.target.value);
                        const pct = Number(pctDescuento);
                        if (precio > 0 && pct > 0) {
                          setPrecioOferta(String(Math.round(precio * (1 - pct / 100))));
                        }
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "#121212", border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                </div>
              </div>

              {/* Toggle oferta */}
              <div className="flex items-center justify-between p-3 rounded-xl"
                style={{ background: "#121212", border: `1px solid ${enOferta ? "#ef444430" : "rgba(255,255,255,0.07)"}` }}>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" style={{ color: enOferta ? "#ef4444" : "#6B7280" }} />
                  <div>
                    <p className="text-xs font-bold text-white">Poner en oferta</p>
                    <p className="text-[10px]" style={{ color: "#6B7280" }}>Muestra precio tachado + descuento en el catálogo</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !enOferta;
                    setEnOferta(next);
                    if (!next) {
                      setPrecioOferta("");
                      setPctDescuento("");
                    } else if (precioNormal && !precioOferta) {
                      // Precargar con 10% de descuento por defecto
                      setPctDescuento("10");
                      const oferta = Math.round(Number(precioNormal) * 0.9);
                      setPrecioOferta(String(oferta));
                    }
                  }}
                  className="w-12 h-6 rounded-full relative transition-all flex-shrink-0"
                  style={{ background: enOferta ? "#ef4444" : "#374151" }}
                >
                  <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
                    style={{ background: "white", left: enOferta ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>

              {/* Campos de oferta */}
              {enOferta && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* % Descuento */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 mb-1.5 block flex items-center gap-1">
                        <Percent className="w-3 h-3" /> % Descuento
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={1}
                          max={99}
                          value={pctDescuento}
                          onChange={(e) => {
                            setPctDescuento(e.target.value);
                            const precio = Number(precioNormal);
                            const pct = Number(e.target.value);
                            if (precio > 0 && pct > 0 && pct <= 100) {
                              setPrecioOferta(String(Math.round(precio * (1 - pct / 100))));
                            }
                          }}
                          onBlur={calcularOfertaDesdePct}
                          className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                          style={{ background: "#121212", border: "1px solid #ef444433" }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: "#ef4444" }}>%</span>
                      </div>
                    </div>

                    {/* Precio oferta */}
                    <div>
                      <label className="text-xs font-bold text-gray-400 mb-1.5 block flex items-center gap-1">
                        <Slash className="w-3 h-3" /> Precio oferta
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#ef4444" }} />
                        <input
                          type="number"
                          min={0}
                          value={precioOferta}
                          onChange={(e) => {
                            setPrecioOferta(e.target.value);
                            const precio = Number(precioNormal);
                            const oferta = Number(e.target.value);
                            if (precio > 0 && oferta > 0 && oferta < precio) {
                              const pct = Math.round(((precio - oferta) / precio) * 100);
                              setPctDescuento(String(pct));
                            }
                          }}
                          onBlur={calcularPctDesdeOferta}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-white outline-none"
                          style={{ background: "#121212", border: "1px solid #ef444433" }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  {Number(precioNormal) > 0 && Number(precioOferta) > 0 && (
                    <div className="rounded-xl p-3 flex items-center justify-between"
                      style={{ background: "#ef444410", border: "1px solid #ef444425" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: "#6B7280", textDecoration: "line-through" }}>{fmtPrecio(Number(precioNormal))}</span>
                        <span className="text-base font-black" style={{ color: "#39FF14" }}>{fmtPrecio(Number(precioOferta))}</span>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 rounded" style={{ background: "#ef444420", color: "#ef4444" }}>
                        -{pctDescuento}%
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Botón guardar */}
              <button
                onClick={guardar}
                disabled={saving}
                className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                style={{ background: "#39FF14", color: "#121212" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
