"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Share2, Copy, Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/catalogo/CartContext";

interface ProductoDetalle {
  sku: string;
  name: string;
  catalog_price: number;
  discount_price: number | null;
  on_sale: boolean;
  discount_pct: number;
  image_url: string | null;
  category: string;
}

function fmtPrecio(precio: number) {
  if (!precio || precio <= 0) return "Consultar";
  return "$" + precio.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function ProductoPage() {
  const { sku } = useParams();
  const { addItem } = useCart();
  const [producto, setProducto] = useState<ProductoDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/catalogo/productos?${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(({ productos }) => {
        const p = productos?.find((x: any) => x.sku === sku);
        setProducto(p || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sku]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: producto?.name || "", url });
      } catch (_) {}
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAdd = () => {
    if (!producto) return;
    const precio = producto.on_sale && producto.discount_price
      ? producto.discount_price
      : producto.catalog_price;
    addItem({
      sku: producto.sku,
      nombre: producto.name,
      precio: precio || 0,
      imagen: producto.image_url || "",
      cantidad: 1,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl font-bold">Producto no encontrado</p>
        <Link href="/catalogo" className="text-orange-400 hover:underline flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver al catálogo
        </Link>
      </div>
    );
  }

  const precioFinal = producto.on_sale && producto.discount_price
    ? producto.discount_price
    : producto.catalog_price;

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/catalogo" className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Catálogo</span>
          </Link>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" /> Copiado
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" /> Compartir
              </>
            )}
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Imagen */}
        <div className="bg-white rounded-2xl p-6 sm:p-10 mb-6 flex items-center justify-center min-h-[300px]">
          {producto.image_url ? (
            <Image
              src={producto.image_url}
              alt={producto.name}
              width={400} height={400}
              className="max-h-[400px] object-contain"
              priority
            />
          ) : (
            <div className="w-32 h-32 bg-slate-200 rounded-full flex items-center justify-center">
              <span className="text-slate-400 text-4xl">?</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-xs font-mono text-slate-400 bg-slate-800 px-2 py-1 rounded">{producto.sku}</span>
              <h1 className="text-xl sm:text-2xl font-bold mt-2">{producto.name}</h1>
              <p className="text-slate-400 text-sm mt-1">{producto.category}</p>
            </div>
          </div>

          <div className="flex items-baseline gap-3">
            {producto.on_sale && producto.discount_price ? (
              <>
                <span className="text-3xl sm:text-4xl font-black" style={{ color: "#10b981" }}>
                  {fmtPrecio(producto.discount_price)}
                </span>
                <span className="text-lg text-slate-500 line-through">{fmtPrecio(producto.catalog_price)}</span>
                <span className="text-sm font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  -{producto.discount_pct}%
                </span>
              </>
            ) : (
              <span className="text-3xl sm:text-4xl font-black" style={{ color: "#10b981" }}>
                {fmtPrecio(producto.catalog_price)}
              </span>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleAdd}
              className="flex-1 flex items-center justify-center gap-2 font-bold rounded-xl py-3 text-white transition-all active:scale-95"
              style={{ background: "#f97316" }}
            >
              <ShoppingCart className="h-5 w-5" />
              Agregar al carrito
            </button>
            <button
              onClick={handleShare}
              className="px-4 py-3 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-2"
            >
              {copied ? <Check className="h-5 w-5 text-emerald-400" /> : <Copy className="h-5 w-5" />}
              {copied ? "Copiado" : "Copiar link"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
