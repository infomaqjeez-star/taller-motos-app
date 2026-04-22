"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { WorkOrder, MotorType, RepairStatus } from "@/lib/types";
import { ordersDb } from "@/lib/db";
import { isOverdue90Days } from "@/lib/utils";

// Tipo para los filtros de órdenes (compatible con la UI existente)
export interface OrderFilters {
  status: RepairStatus | "all";
  search: string;
  motorType: MotorType | "all";
  dateFrom?: string | null;
  dateTo?: string | null;
  overdueOnly?: boolean;
}

// Tipo para el estado de las órdenes (simplificado para UI)
export type OrderStatus = "recibido" | "diagnostico" | "presupuesto" | "espera_repuesto" | "reparacion" | "listo" | "entregado";

const STATUS_ORDER: OrderStatus[] = [
  "recibido",
  "diagnostico",
  "presupuesto",
  "espera_repuesto",
  "reparacion",
  "listo",
  "entregado",
];

// Mapeo de RepairStatus a OrderStatus
const repairStatusToOrderStatus: Record<RepairStatus, OrderStatus> = {
  "ingresado": "recibido",
  "diagnosticando": "diagnostico",
  "esperando_repuesto": "espera_repuesto",
  "en_reparacion": "reparacion",
  "listo_para_retiro": "listo",
  "entregado": "entregado",
};

export function useOrders() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<OrderFilters>({
    status: "all",
    search: "",
    motorType: "all",
    dateFrom: null,
    dateTo: null,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ordersDb.getAll();
      // Ordenar: primero por estado (no entregados primero), luego por fecha de entrada
      const sorted = data.sort((a, b) => {
        // Si uno está entregado y el otro no, el no entregado va primero
        if (a.status === "entregado" && b.status !== "entregado") return 1;
        if (a.status !== "entregado" && b.status === "entregado") return -1;
        // Si ambos tienen el mismo estado, ordenar por fecha de entrada (más reciente primero)
        return new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime();
      });
      setOrders(sorted);
    } catch (e) {
      console.error("Error cargando órdenes:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      // Filtro por estado
      if (filters.status !== "all" && order.status !== filters.status) {
        return false;
      }

      // Filtro por tipo de motor
      if (filters.motorType !== "all" && order.motorType !== filters.motorType) {
        return false;
      }

      // Filtro por overdueOnly
      if (filters.overdueOnly && !(order.status === "listo_para_retiro" && isOverdue90Days(order))) {
        return false;
      }

      // Filtro por búsqueda
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const matchSearch =
          order.clientName.toLowerCase().includes(search) ||
          order.clientPhone.toLowerCase().includes(search) ||
          order.brand.toLowerCase().includes(search) ||
          order.model.toLowerCase().includes(search) ||
          order.reportedIssues.toLowerCase().includes(search) ||
          order.id.toLowerCase().includes(search);
        if (!matchSearch) return false;
      }

      // Filtro por fecha desde
      if (filters.dateFrom) {
        const orderDate = new Date(order.entryDate);
        const fromDate = new Date(filters.dateFrom);
        if (orderDate < fromDate) return false;
      }

      // Filtro por fecha hasta
      if (filters.dateTo) {
        const orderDate = new Date(order.entryDate);
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (orderDate > toDate) return false;
      }

      return true;
    });
  }, [orders, filters]);

  const create = useCallback(
    async (order: Omit<WorkOrder, "id" | "entryDate" | "completionDate" | "deliveryDate">) => {
      const now = new Date().toISOString();
      const newOrder: WorkOrder = {
        ...order,
        id: crypto.randomUUID(),
        entryDate: now,
        completionDate: null,
        deliveryDate: null,
      };
      await ordersDb.create(newOrder);
      await refresh();
      return newOrder;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, updates: Partial<WorkOrder>) => {
      await ordersDb.update(id, updates);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await ordersDb.delete(id);
      await refresh();
    },
    [refresh]
  );

  // Contar equipos con más de 90 días esperando retiro (estado "listo_para_retiro")
  const overdueCount = useMemo(() => {
    return orders.filter(
      (order) => order.status === "listo_para_retiro" && isOverdue90Days(order)
    ).length;
  }, [orders]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = orders.length;
    const allStatuses: RepairStatus[] = [
      "ingresado",
      "diagnosticando",
      "esperando_repuesto",
      "en_reparacion",
      "listo_para_retiro",
      "entregado",
    ];
    const byStatus = allStatuses.reduce((acc, status) => {
      acc[status] = orders.filter((o) => o.status === status).length;
      return acc;
    }, {} as Record<RepairStatus, number>);

    return {
      total,
      byStatus,
      active: total - (byStatus["entregado"] || 0),
      delivered: byStatus["entregado"] || 0,
    };
  }, [orders]);

  return {
    orders,
    filtered,
    filters,
    setFilters,
    create,
    update,
    remove,
    refresh,
    loading,
    overdueCount,
    stats,
  };
}
