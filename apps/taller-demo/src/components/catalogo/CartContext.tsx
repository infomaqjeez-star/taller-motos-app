"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";

function getDiscountsFromStorage() {
  if (typeof window === "undefined") return { cliente: 0, vendedor: 0 };
  const cliente = localStorage.getItem("cliente_token") ? 3 : 0;
  const vendedor = localStorage.getItem("ref_vendedor_id") ? 3 : 0;
  return { cliente, vendedor };
}

export interface CartItem {
  sku: string;
  nombre: string;
  precio: number; // precio unitario (minorista)
  imagen?: string;
  cantidad: number;
}

export interface CartTotals {
  subtotal: number;
  descuentoVolumenPct: number;
  descuentoVolumenMonto: number;
  descuentoClientePct: number;
  descuentoClienteMonto: number;
  descuentoVendedorPct: number;
  descuentoVendedorMonto: number;
  descuentoTotalMonto: number;
  envio: number;
  total: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cantidad"> & { cantidad?: number }) => void;
  removeItem: (sku: string) => void;
  updateQuantity: (sku: string, cantidad: number) => void;
  clearCart: () => void;
  totals: CartTotals;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  itemCount: number;
}

function calcularTotales(
  items: CartItem[],
  descuentoClientePct: number = 0,
  descuentoVendedorPct: number = 0
): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  // Descuento por volumen
  let descuentoVolumenPct = 0;
  if (subtotal >= 1_000_000) descuentoVolumenPct = 20;
  else if (subtotal >= 250_000) descuentoVolumenPct = 15;
  else if (subtotal >= 100_000) descuentoVolumenPct = 10;

  const descuentoVolumenMonto = Math.round((subtotal * descuentoVolumenPct) / 100);

  // Descuento por cliente logueado (3%)
  const descuentoClienteMonto = Math.round((subtotal * descuentoClientePct) / 100);

  // Descuento por vendedor referido (3%)
  const descuentoVendedorMonto = Math.round((subtotal * descuentoVendedorPct) / 100);

  const descuentoTotalMonto = descuentoVolumenMonto + descuentoClienteMonto + descuentoVendedorMonto;
  const conDescuento = Math.max(0, subtotal - descuentoTotalMonto);

  let envio = 0;
  if (conDescuento < 30_000) envio = 10_000;
  else if (conDescuento < 50_000) envio = 8_000;
  else if (conDescuento < 100_000) envio = 5_000;

  const total = conDescuento + envio;

  return {
    subtotal,
    descuentoVolumenPct,
    descuentoVolumenMonto,
    descuentoClientePct,
    descuentoClienteMonto,
    descuentoVendedorPct,
    descuentoVendedorMonto,
    descuentoTotalMonto,
    envio,
    total,
  };
}

const CartContext = createContext<CartContextValue | null>(null);

const CART_STORAGE_KEY = "catalogo_cart";

function getCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCartToStorage(items: CartItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(getCartFromStorage);
  const [isOpen, setIsOpen] = useState(false);
  const [discounts, setDiscounts] = useState(() => getDiscountsFromStorage());

  // Persistir carrito en localStorage
  useEffect(() => {
    saveCartToStorage(items);
  }, [items]);

  // Recalcular descuentos cuando cambia el auth (login/logout)
  useEffect(() => {
    const refresh = () => setDiscounts(getDiscountsFromStorage());
    window.addEventListener("storage", refresh);
    window.addEventListener("cliente-auth-changed", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("cliente-auth-changed", refresh);
    };
  }, []);

  const addItem = useCallback((newItem: Omit<CartItem, "cantidad"> & { cantidad?: number }) => {
    const qty = Math.max(1, newItem.cantidad || 1);
    setItems((prev) => {
      const existing = prev.find((i) => i.sku === newItem.sku);
      if (existing) {
        return prev.map((i) =>
          i.sku === newItem.sku ? { ...i, cantidad: i.cantidad + qty } : i
        );
      }
      return [...prev, { ...newItem, cantidad: qty }];
    });
  }, []);

  const removeItem = useCallback((sku: string) => {
    setItems((prev) => prev.filter((i) => i.sku !== sku));
  }, []);

  const updateQuantity = useCallback((sku: string, cantidad: number) => {
    if (cantidad <= 0) {
      setItems((prev) => prev.filter((i) => i.sku !== sku));
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, cantidad } : i))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totals = useMemo(() => {
    return calcularTotales(items, discounts.cliente, discounts.vendedor);
  }, [items, discounts]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.cantidad, 0), [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totals, isOpen, setIsOpen, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
