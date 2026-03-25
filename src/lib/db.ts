// ============================================================
// CAPA DE DATOS — localStorage (MVP)
// Para migrar a Supabase: reemplazar cada función por su
// equivalente con el cliente de Supabase manteniendo la misma firma.
// ============================================================

import { WorkOrder, StockItem, PartToOrder } from "./types";

const KEYS = {
  orders: "maqjeez_orders",
  stock: "maqjeez_stock",
  partsToOrder: "maqjeez_parts_to_order",
};

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ——— Órdenes de Trabajo ———
export const ordersDb = {
  getAll(): WorkOrder[] {
    return read<WorkOrder>(KEYS.orders).sort(
      (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    );
  },
  getById(id: string): WorkOrder | undefined {
    return read<WorkOrder>(KEYS.orders).find((o) => o.id === id);
  },
  create(order: WorkOrder): void {
    const all = read<WorkOrder>(KEYS.orders);
    write(KEYS.orders, [order, ...all]);
  },
  update(id: string, updates: Partial<WorkOrder>): void {
    const all = read<WorkOrder>(KEYS.orders).map((o) =>
      o.id === id ? { ...o, ...updates } : o
    );
    write(KEYS.orders, all);
  },
  delete(id: string): void {
    const all = read<WorkOrder>(KEYS.orders).filter((o) => o.id !== id);
    write(KEYS.orders, all);
  },
};

// ——— Stock ———
export const stockDb = {
  getAll(): StockItem[] {
    return read<StockItem>(KEYS.stock);
  },
  create(item: StockItem): void {
    const all = read<StockItem>(KEYS.stock);
    write(KEYS.stock, [item, ...all]);
  },
  update(id: string, updates: Partial<StockItem>): void {
    const all = read<StockItem>(KEYS.stock).map((i) =>
      i.id === id ? { ...i, ...updates } : i
    );
    write(KEYS.stock, all);
  },
  delete(id: string): void {
    const all = read<StockItem>(KEYS.stock).filter((i) => i.id !== id);
    write(KEYS.stock, all);
  },
};

// ——— Repuestos a Pedir ———
export const partsToOrderDb = {
  getAll(): PartToOrder[] {
    return read<PartToOrder>(KEYS.partsToOrder).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
  create(part: PartToOrder): void {
    const all = read<PartToOrder>(KEYS.partsToOrder);
    write(KEYS.partsToOrder, [part, ...all]);
  },
  update(id: string, updates: Partial<PartToOrder>): void {
    const all = read<PartToOrder>(KEYS.partsToOrder).map((p) =>
      p.id === id ? { ...p, ...updates } : p
    );
    write(KEYS.partsToOrder, all);
  },
  delete(id: string): void {
    const all = read<PartToOrder>(KEYS.partsToOrder).filter((p) => p.id !== id);
    write(KEYS.partsToOrder, all);
  },
};
