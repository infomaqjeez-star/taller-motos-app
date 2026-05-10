"use client";

import { useCart } from "./CartContext";
import { ShoppingCart, X, Plus, Minus, Trash2, ArrowRight, Package } from "lucide-react";

function fmtMoney(n: number) {
  return "$" + n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}

export default function CartDrawer() {
  const { items, totals, updateQuantity, removeItem, isOpen, setIsOpen, itemCount } = useCart();

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 z-50 h-full w-full max-w-md transform bg-[#121212] border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-[#FF5722]" />
              <h2 className="text-lg font-bold text-white">Tu pedido</h2>
              {itemCount > 0 && (
                <span className="rounded-full bg-[#FF5722] px-2 py-0.5 text-xs font-bold text-white">
                  {itemCount}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <Package className="h-12 w-12 text-gray-600" />
                <p className="text-gray-400">El carrito está vacío</p>
                <p className="text-sm text-gray-500">Agregá productos desde el catálogo</p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.sku}
                    className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white/5">
                      {item.imagen ? (
                        <img
                          src={item.imagen}
                          alt={item.nombre}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-600" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-gray-200">{item.nombre}</p>
                      <p className="text-xs text-blue-400">{item.sku}</p>
                      <p className="text-sm font-bold text-[#39FF14]">{fmtMoney(item.precio)} c/u</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.sku, item.cantidad - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-6 text-center text-sm font-bold text-white">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.sku, item.cantidad + 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => removeItem(item.sku)}
                          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="border-t border-white/10 px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-400">
                <span>Subtotal</span>
                <span>{fmtMoney(totals.subtotal)}</span>
              </div>
              {totals.descuentoPorcentaje > 0 && (
                <div className="flex justify-between text-sm text-[#39FF14]">
                  <span>Descuento ({totals.descuentoPorcentaje}%)</span>
                  <span>-{fmtMoney(totals.descuentoMonto)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-400">
                <span>Envío</span>
                <span>{totals.envio === 0 ? "Gratis" : fmtMoney(totals.envio)}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-black text-white">
                <span>Total</span>
                <span className="text-[#FF5722]">{fmtMoney(totals.total)}</span>
              </div>

              {/* Discount milestones */}
              <div className="rounded-lg bg-white/5 p-2 text-xs text-gray-400">
                {totals.descuentoPorcentaje === 0 && (
                  <p>Sumá ${(100_000 - totals.subtotal).toLocaleString("es-AR")} más para 10% OFF</p>
                )}
                {totals.descuentoPorcentaje === 10 && (
                  <p>Sumá ${(250_000 - totals.subtotal).toLocaleString("es-AR")} más para 15% OFF</p>
                )}
                {totals.descuentoPorcentaje === 15 && (
                  <p>Sumá ${(1_000_000 - totals.subtotal).toLocaleString("es-AR")} más para 20% OFF</p>
                )}
                {totals.descuentoPorcentaje === 20 && (
                  <p className="text-[#39FF14]">¡Tenés el máximo descuento!</p>
                )}
              </div>

              <a
                href="/catalogo/checkout"
                onClick={() => setIsOpen(false)}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF5722] px-4 py-3 font-bold text-white hover:bg-[#E64A19] transition-colors"
              >
                Finalizar pedido
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
