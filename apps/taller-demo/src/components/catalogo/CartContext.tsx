"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface CartItem {
  sku: string;
  nombre: string;
  precio: number; // precio unitario (minorista)
  imagen?: string;
  cantidad: number;
}

export interface CartTotals {
  subtotal: number;
  descuentoPorcentaje: number;
  descuentoMonto: number;
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

function calcularTotales(items: CartItem[]): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);

  let descuentoPorcentaje = 0;
  if (subtotal >= 1_000_000) descuentoPorcentaje = 20;
  else if (subtotal >= 250_000) descuentoPorcentaje = 15;
  else if (subtotal >= 100_000) descuentoPorcentaje = 10;

  const descuentoMonto = Math.round((subtotal * descuentoPorcentaje) / 100);
  const conDescuento = subtotal - descuentoMonto;

  let envio = 0;
  if (conDescuento < 30_000) envio = 10_000;
  else if (conDescuento < 50_000) envio = 8_000;
  else if (conDescuento < 100_000) envio = 5_000;
  // >= 100k envio gratis

  const total = conDescuento + envio;

  return { subtotal, descuentoPorcentaje, descuentoMonto, envio, total };
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

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

  const totals = useMemo(() => calcularTotales(items), [items]);
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
