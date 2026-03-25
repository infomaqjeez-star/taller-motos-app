"use client";

import { useState, useEffect, useCallback } from "react";
import { StockItem, PartToOrder } from "@/lib/types";
import { stockDb, partsToOrderDb } from "@/lib/db";

export function useInventory() {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [partsToOrder, setPartsToOrder] = useState<PartToOrder[]>([]);

  const refresh = useCallback(() => {
    setStock(stockDb.getAll());
    setPartsToOrder(partsToOrderDb.getAll());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const createStock = useCallback(
    (item: StockItem) => { stockDb.create(item); refresh(); },
    [refresh]
  );
  const updateStock = useCallback(
    (id: string, updates: Partial<StockItem>) => { stockDb.update(id, updates); refresh(); },
    [refresh]
  );
  const deleteStock = useCallback(
    (id: string) => { stockDb.delete(id); refresh(); },
    [refresh]
  );

  const createPart = useCallback(
    (part: PartToOrder) => { partsToOrderDb.create(part); refresh(); },
    [refresh]
  );
  const updatePart = useCallback(
    (id: string, updates: Partial<PartToOrder>) => { partsToOrderDb.update(id, updates); refresh(); },
    [refresh]
  );
  const deletePart = useCallback(
    (id: string) => { partsToOrderDb.delete(id); refresh(); },
    [refresh]
  );

  const lowStockCount = stock.filter((s) => s.quantity <= s.minQuantity).length;
  const pendingPartsCount = partsToOrder.filter(
    (p) => p.status === "pendiente" || p.status === "pedido"
  ).length;

  return {
    stock,
    partsToOrder,
    createStock,
    updateStock,
    deleteStock,
    createPart,
    updatePart,
    deletePart,
    lowStockCount,
    pendingPartsCount,
    refresh,
  };
}
