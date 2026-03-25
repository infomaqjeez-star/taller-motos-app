"use client";

import { useState, useEffect, useCallback } from "react";
import { WorkOrder, RepairStatus, MotorType } from "@/lib/types";
import { ordersDb } from "@/lib/db";
import { isOverdue90Days } from "@/lib/utils";

export interface OrderFilters {
  motorType: MotorType | "all";
  status: RepairStatus | "all";
  search: string;
  overdueOnly: boolean;
}

export function useOrders() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [filters, setFilters] = useState<OrderFilters>({
    motorType: "all",
    status: "all",
    search: "",
    overdueOnly: false,
  });

  const refresh = useCallback(() => {
    setOrders(ordersDb.getAll());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    (order: WorkOrder) => {
      ordersDb.create(order);
      refresh();
    },
    [refresh]
  );

  const update = useCallback(
    (id: string, updates: Partial<WorkOrder>) => {
      ordersDb.update(id, updates);
      refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    (id: string) => {
      ordersDb.delete(id);
      refresh();
    },
    [refresh]
  );

  const filtered = orders.filter((o) => {
    if (filters.motorType !== "all" && o.motorType !== filters.motorType)
      return false;
    if (filters.status !== "all" && o.status !== filters.status) return false;
    if (filters.overdueOnly && !isOverdue90Days(o)) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      return (
        o.clientName.toLowerCase().includes(q) ||
        o.brand.toLowerCase().includes(q) ||
        o.model.toLowerCase().includes(q) ||
        o.clientPhone.includes(q)
      );
    }
    return true;
  });

  const overdueCount = orders.filter(isOverdue90Days).length;

  return {
    orders,
    filtered,
    filters,
    setFilters,
    create,
    update,
    remove,
    overdueCount,
    refresh,
  };
}
