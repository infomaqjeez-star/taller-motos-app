// ============================================================
// CAPA DE DATOS — Supabase (producción) con fallback a localStorage
// ============================================================

import { supabase } from "./supabase";
import { WorkOrder, StockItem, PartToOrder, Pago, PlantillaWhatsApp, AgendaCliente, HistorialReparacion, FlexEnvio, VentaRepuesto, VentaItem, VentasStats, VentasPorDia, TopProducto } from "./types";

// ─── Helpers de mapeo (snake_case DB ↔ camelCase app) ────────

function toOrder(r: Record<string, unknown>): WorkOrder {
  return {
    id:                 r.id as string,
    clientName:         r.client_name as string,
    clientPhone:        r.client_phone as string,
    motorType:          r.motor_type as WorkOrder["motorType"],
    brand:              r.brand as string,
    model:              r.model as string,
    reportedIssues:     r.reported_issues as string,
    budget:             r.budget as number | null,
    estimatedDays:      r.estimated_days as number | null,
    status:             r.status as WorkOrder["status"],
    clientNotification: r.client_notification as WorkOrder["clientNotification"],
    budgetAccepted:     r.budget_accepted as boolean,
    entryDate:          r.entry_date as string,
    completionDate:     r.completion_date as string | null,
    deliveryDate:       r.delivery_date as string | null,
    linkedParts:        (r.linked_parts as string[]) ?? [],
    internalNotes:      r.internal_notes as string,
    photoUrls:          (r.photo_urls as string[]) ?? [],
    extraMachines:      (r.extra_machines as WorkOrder["extraMachines"]) ?? [],
    machineTypeOther:   r.machine_type_other as string | undefined,
  };
}

function fromOrder(o: WorkOrder) {
  return {
    id:                  o.id,
    client_name:         o.clientName,
    client_phone:        o.clientPhone,
    motor_type:          o.motorType,
    brand:               o.brand,
    model:               o.model,
    reported_issues:     o.reportedIssues,
    budget:              o.budget,
    estimated_days:      o.estimatedDays,
    status:              o.status,
    client_notification: o.clientNotification,
    budget_accepted:     o.budgetAccepted,
    entry_date:          o.entryDate,
    completion_date:     o.completionDate,
    delivery_date:       o.deliveryDate,
    linked_parts:        o.linkedParts,
    internal_notes:      o.internalNotes,
    photo_urls:          o.photoUrls ?? [],
    extra_machines:      o.extraMachines ?? [],
    machine_type_other:  o.machineTypeOther ?? null,
  };
}

function toStock(r: Record<string, unknown>): StockItem {
  return {
    id:          r.id as string,
    name:        r.name as string,
    quantity:    r.quantity as number,
    location:    r.location as string,
    minQuantity: r.min_quantity as number,
    notes:       r.notes as string,
  };
}

function fromStock(s: StockItem) {
  return {
    id:           s.id,
    name:         s.name,
    quantity:     s.quantity,
    location:     s.location,
    min_quantity: s.minQuantity,
    notes:        s.notes,
  };
}

function toPart(r: Record<string, unknown>): PartToOrder {
  return {
    id:               r.id as string,
    name:             r.name as string,
    quantity:         r.quantity as number,
    orderId:          r.order_id as string | null,
    orderClientName:  r.order_client_name as string | null,
    supplier:         r.supplier as string,
    status:           r.status as PartToOrder["status"],
    notes:            r.notes as string,
    createdAt:        r.created_at as string,
  };
}

function fromPart(p: PartToOrder) {
  return {
    id:                p.id,
    name:              p.name,
    quantity:          p.quantity,
    order_id:          p.orderId,
    order_client_name: p.orderClientName,
    supplier:          p.supplier,
    status:            p.status,
    notes:             p.notes,
    created_at:        p.createdAt,
  };
}

// ─── Órdenes de Trabajo ───────────────────────────────────────

export const ordersDb = {
  async getAll(): Promise<WorkOrder[]> {
    const { data, error } = await supabase
      .from("reparaciones")
      .select("*")
      .order("entry_date", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => toOrder(r as Record<string, unknown>));
  },

  async getById(id: string): Promise<WorkOrder | undefined> {
    const { data, error } = await supabase
      .from("reparaciones")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return undefined;
    return toOrder(data as Record<string, unknown>);
  },

  async create(order: WorkOrder): Promise<void> {
    const payload = fromOrder(order);
    console.log("[DB] Insertando en reparaciones:", payload);
    const { error } = await supabase
      .from("reparaciones")
      .insert(payload);
    if (error) {
      console.error("[DB] Error Supabase:", error.message, error.details, error.hint);
      throw error;
    }
  },

  async update(id: string, updates: Partial<WorkOrder>): Promise<void> {
    const mapped: Record<string, unknown> = {};
    if (updates.clientName         !== undefined) mapped.client_name         = updates.clientName;
    if (updates.clientPhone        !== undefined) mapped.client_phone        = updates.clientPhone;
    if (updates.motorType          !== undefined) mapped.motor_type          = updates.motorType;
    if (updates.brand              !== undefined) mapped.brand               = updates.brand;
    if (updates.model              !== undefined) mapped.model               = updates.model;
    if (updates.reportedIssues     !== undefined) mapped.reported_issues     = updates.reportedIssues;
    if (updates.budget             !== undefined) mapped.budget              = updates.budget;
    if (updates.estimatedDays      !== undefined) mapped.estimated_days      = updates.estimatedDays;
    if (updates.status             !== undefined) mapped.status              = updates.status;
    if (updates.clientNotification !== undefined) mapped.client_notification = updates.clientNotification;
    if (updates.budgetAccepted     !== undefined) mapped.budget_accepted     = updates.budgetAccepted;
    if (updates.completionDate     !== undefined) mapped.completion_date     = updates.completionDate;
    if (updates.deliveryDate       !== undefined) mapped.delivery_date       = updates.deliveryDate;
    if (updates.linkedParts        !== undefined) mapped.linked_parts        = updates.linkedParts;
    if (updates.internalNotes      !== undefined) mapped.internal_notes      = updates.internalNotes;
    if (updates.photoUrls          !== undefined) mapped.photo_urls          = updates.photoUrls;
    if (updates.extraMachines      !== undefined) mapped.extra_machines      = updates.extraMachines;
    if (updates.machineTypeOther   !== undefined) mapped.machine_type_other  = updates.machineTypeOther;
    const { error } = await supabase.from("reparaciones").update(mapped).eq("id", id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("reparaciones").delete().eq("id", id);
    if (error) throw error;
  },
};

// ─── Stock ────────────────────────────────────────────────────

export const stockDb = {
  async getAll(): Promise<StockItem[]> {
    const { data, error } = await supabase
      .from("stock")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => toStock(r as Record<string, unknown>));
  },

  async create(item: StockItem): Promise<void> {
    const { error } = await supabase.from("stock").insert(fromStock(item));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<StockItem>): Promise<void> {
    const mapped: Record<string, unknown> = {};
    if (updates.name        !== undefined) mapped.name         = updates.name;
    if (updates.quantity    !== undefined) mapped.quantity     = updates.quantity;
    if (updates.location    !== undefined) mapped.location     = updates.location;
    if (updates.minQuantity !== undefined) mapped.min_quantity = updates.minQuantity;
    if (updates.notes       !== undefined) mapped.notes        = updates.notes;
    const { error } = await supabase.from("stock").update(mapped).eq("id", id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("stock").delete().eq("id", id);
    if (error) throw error;
  },
};

// ─── Repuestos a Pedir ────────────────────────────────────────

export const partsToOrderDb = {
  async getAll(): Promise<PartToOrder[]> {
    const { data, error } = await supabase
      .from("repuestos_a_pedir")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => toPart(r as Record<string, unknown>));
  },

  async create(part: PartToOrder): Promise<void> {
    const { error } = await supabase.from("repuestos_a_pedir").insert(fromPart(part));
    if (error) throw error;
  },

  async update(id: string, updates: Partial<PartToOrder>): Promise<void> {
    const mapped: Record<string, unknown> = {};
    if (updates.name             !== undefined) mapped.name               = updates.name;
    if (updates.quantity         !== undefined) mapped.quantity           = updates.quantity;
    if (updates.orderId          !== undefined) mapped.order_id           = updates.orderId;
    if (updates.orderClientName  !== undefined) mapped.order_client_name  = updates.orderClientName;
    if (updates.supplier         !== undefined) mapped.supplier           = updates.supplier;
    if (updates.status           !== undefined) mapped.status             = updates.status;
    if (updates.notes            !== undefined) mapped.notes              = updates.notes;
    const { error } = await supabase.from("repuestos_a_pedir").update(mapped).eq("id", id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("repuestos_a_pedir").delete().eq("id", id);
    if (error) throw error;
  },
};

// ─── Pagos ────────────────────────────────────────────────────

export const pagosDb = {
  async getByOrder(orderId: string): Promise<Pago[]> {
    const { data, error } = await supabase
      .from("pagos")
      .select("*")
      .eq("order_id", orderId)
      .order("paid_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id:      r.id as string,
      orderId: r.order_id as string,
      amount:  r.amount as number,
      method:  r.method as Pago["method"],
      notes:   r.notes as string,
      paidAt:  r.paid_at as string,
    }));
  },
  async create(p: Pago): Promise<void> {
    const { error } = await supabase.from("pagos").insert({
      id: p.id, order_id: p.orderId, amount: p.amount,
      method: p.method, notes: p.notes, paid_at: p.paidAt,
    });
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("pagos").delete().eq("id", id);
    if (error) throw error;
  },
};

// ─── Plantillas WhatsApp ──────────────────────────────────────

export const plantillasDb = {
  async getAll(): Promise<PlantillaWhatsApp[]> {
    const { data, error } = await supabase
      .from("plantillas_whatsapp")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id:        r.id as string,
      name:      r.name as string,
      message:   r.message as string,
      createdAt: r.created_at as string,
    }));
  },
  async create(t: PlantillaWhatsApp): Promise<void> {
    const { error } = await supabase.from("plantillas_whatsapp").insert({
      id: t.id, name: t.name, message: t.message, created_at: t.createdAt,
    });
    if (error) throw error;
  },
  async update(id: string, updates: Partial<PlantillaWhatsApp>): Promise<void> {
    const mapped: Record<string, unknown> = {};
    if (updates.name    !== undefined) mapped.name    = updates.name;
    if (updates.message !== undefined) mapped.message = updates.message;
    const { error } = await supabase.from("plantillas_whatsapp").update(mapped).eq("id", id);
    if (error) throw error;
  },
  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("plantillas_whatsapp").delete().eq("id", id);
    if (error) throw error;
  },
};

// ─── Agenda de Clientes ───────────────────────────────────────

export const agendaDb = {
  async getAll(): Promise<AgendaCliente[]> {
    const { data, error } = await supabase
      .from("agenda_clientes")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id:        r.id as string,
      nombre:    r.nombre as string,
      telefono:  r.telefono as string,
      createdAt: r.created_at as string,
    }));
  },

  async upsertByPhone(nombre: string, telefono: string): Promise<void> {
    const phone = telefono.trim();
    if (!phone) return;
    const { data } = await supabase
      .from("agenda_clientes")
      .select("id")
      .eq("telefono", phone)
      .maybeSingle();
    if (data) {
      // Cliente existe: actualizar nombre por si cambió
      await supabase
        .from("agenda_clientes")
        .update({ nombre: nombre.trim() })
        .eq("telefono", phone);
    } else {
      // Cliente nuevo
      await supabase.from("agenda_clientes").insert({
        nombre: nombre.trim(),
        telefono: phone,
      });
    }
  },

  async syncFromOrders(): Promise<number> {
    const { data: orders } = await supabase
      .from("reparaciones")
      .select("client_name, client_phone")
      .not("client_phone", "is", null);
    if (!orders) return 0;
    const seen = new Set<string>();
    let count = 0;
    for (const o of orders) {
      const phone = (o.client_phone as string)?.trim();
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      const { data: existing } = await supabase
        .from("agenda_clientes").select("id").eq("telefono", phone).maybeSingle();
      if (!existing) {
        await supabase.from("agenda_clientes").insert({
          nombre: (o.client_name as string)?.trim() || "Sin nombre",
          telefono: phone,
        });
        count++;
      }
    }
    return count;
  },

  async delete(id: string): Promise<void> {
    // Intentar borrar historial primero (ignorar error si la tabla no existe aún)
    try {
      await supabase.from("historial_reparaciones").delete().eq("cliente_id", id);
    } catch (_) { /* ignorar */ }
    const { error } = await supabase.from("agenda_clientes").delete().eq("id", id);
    if (error) throw error;
  },
};

// ─── Historial permanente de reparaciones ─────────────────────

export const historialDb = {
  async getByCliente(clienteId: string): Promise<HistorialReparacion[]> {
    const { data, error } = await supabase
      .from("historial_reparaciones")
      .select("*")
      .eq("cliente_id", clienteId)
      .order("fecha_ingreso", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => ({
      id:           r.id as string,
      clienteId:    r.cliente_id as string,
      ordenId:      r.orden_id as string | null,
      fechaIngreso: r.fecha_ingreso as string,
      motorType:    r.motor_type as string,
      brand:        r.brand as string,
      model:        r.model as string,
      falla:        r.falla as string,
      trabajo:      r.trabajo as string,
      presupuesto:  r.presupuesto as number | null,
      estadoFinal:  r.estado_final as string,
      photoUrls:    (r.photo_urls as string[]) ?? [],
      createdAt:    r.created_at as string,
    }));
  },

  async upsert(clienteId: string, order: WorkOrder): Promise<void> {
    const record = {
      id:            order.id + "_hist",
      cliente_id:    clienteId,
      orden_id:      order.id,
      fecha_ingreso: order.entryDate,
      motor_type:    order.motorType,
      brand:         order.brand,
      model:         order.model,
      falla:         order.reportedIssues,
      trabajo:       order.internalNotes ?? "",
      presupuesto:   order.budget,
      estado_final:  order.status,
      photo_urls:    order.photoUrls ?? [],
      updated_at:    new Date().toISOString(),
    };
    const { error } = await supabase
      .from("historial_reparaciones")
      .upsert(record, { onConflict: "id" });
    if (error) throw error;
  },
};

// ─── Logística Flex ───────────────────────────────────────────

function toFlex(r: Record<string, unknown>): FlexEnvio {
  return {
    id:                 r.id as string,
    fecha:              r.fecha as string,
    localidad:          r.localidad as string,
    zona:               r.zona as FlexEnvio["zona"],
    precioML:           r.precio_ml as number,
    pagoFlete:          r.pago_flete as number,
    ganancia:           r.ganancia as number,
    descripcion:        r.descripcion as string,
    nroSeguimiento:     (r.nro_seguimiento as string) ?? "",
    usuarioML:          (r.usuario_ml as string) ?? "",
    nombreDestinatario: (r.nombre_destinatario as string) ?? "",
    direccion:          (r.direccion as string) ?? "",
    codigoPostal:       (r.codigo_postal as string) ?? "",
    productoSku:        (r.producto_sku as string) ?? "",
    packId:             (r.pack_id as string) ?? "",
    createdAt:          r.created_at as string,
  };
}

export const flexDb = {
  async getAll(): Promise<FlexEnvio[]> {
    const { data, error } = await supabase
      .from("flex_envios")
      .select("*")
      .order("fecha", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(r => toFlex(r as Record<string, unknown>));
  },

  async create(e: FlexEnvio): Promise<{ duplicado: boolean }> {
    const row = {
      id:                  e.id,
      fecha:               e.fecha,
      localidad:           e.localidad,
      zona:                e.zona,
      precio_ml:           e.precioML,
      pago_flete:          e.pagoFlete,
      ganancia:            e.ganancia,
      descripcion:         e.descripcion,
      nro_seguimiento:     e.nroSeguimiento || null,
      usuario_ml:          e.usuarioML,
      nombre_destinatario: e.nombreDestinatario,
      direccion:           e.direccion,
      codigo_postal:       e.codigoPostal,
      producto_sku:        e.productoSku,
      pack_id:             e.packId || null,
      created_at:          e.createdAt,
    };

    // Si tiene nro_seguimiento, usar UPSERT para evitar duplicados
    // Si no tiene ID, usar INSERT simple (cada paquete sin ID es único)
    if (e.nroSeguimiento) {
      const { error } = await supabase.from("flex_envios").upsert(row, {
        onConflict: "nro_seguimiento",
        ignoreDuplicates: false,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("flex_envios").insert(row);
      if (error) throw error;
    }
    return { duplicado: false };
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from("flex_envios").delete().eq("id", id);
    if (error) throw error;
  },

  async updateTarifa(zona: string, nuevoPrecio: number): Promise<void> {
    const { error } = await supabase
      .from("flex_tarifas")
      .update({ precio: nuevoPrecio })
      .eq("zona", zona);
    if (error) throw error;
  },
};

// ─── Ventas de Repuestos ──────────────────────────────────────

function toVenta(r: Record<string, unknown>, items: VentaItem[]): VentaRepuesto {
  return {
    id:         r.id as string,
    vendedor:   r.vendedor as string,
    metodoPago: r.metodo_pago as VentaRepuesto["metodoPago"],
    total:      r.total as number,
    status:     r.status as VentaRepuesto["status"],
    notas:      (r.notas as string) ?? "",
    createdAt:  r.created_at as string,
    items,
  };
}

function toVentaItem(r: Record<string, unknown>): VentaItem {
  return {
    id:         r.id as string,
    ventaId:    r.venta_id as string,
    producto:   r.producto as string,
    sku:        (r.sku as string) ?? "",
    cantidad:   r.cantidad as number,
    precioUnit: r.precio_unit as number,
    subtotal:   r.subtotal as number,
  };
}

export const ventasDb = {
  async getAll(desde?: string, hasta?: string): Promise<VentaRepuesto[]> {
    let q = supabase
      .from("ventas_repuestos")
      .select("*, ventas_items(*)")
      .order("created_at", { ascending: false });
    if (desde) q = q.gte("created_at", desde);
    if (hasta) q = q.lte("created_at", hasta + "T23:59:59");
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []).map((r) => {
      const raw = r as Record<string, unknown>;
      const items = ((raw.ventas_items as Record<string, unknown>[]) ?? []).map(toVentaItem);
      return toVenta(raw, items);
    });
  },

  async getToday(): Promise<VentaRepuesto[]> {
    const hoy = new Date().toISOString().slice(0, 10);
    return ventasDb.getAll(hoy, hoy);
  },

  async create(v: VentaRepuesto): Promise<void> {
    const { error: ve } = await supabase.from("ventas_repuestos").insert({
      id:          v.id,
      vendedor:    v.vendedor,
      metodo_pago: v.metodoPago,
      total:       v.total,
      status:      v.status,
      notas:       v.notas,
      created_at:  v.createdAt,
    });
    if (ve) throw ve;

    if (v.items.length > 0) {
      const { error: ie } = await supabase.from("ventas_items").insert(
        v.items.map(i => ({
          id:          i.id,
          venta_id:    v.id,
          producto:    i.producto,
          sku:         i.sku,
          cantidad:    i.cantidad,
          precio_unit: i.precioUnit,
        }))
      );
      if (ie) throw ie;
    }
  },

  async update(v: VentaRepuesto): Promise<void> {
    const { error: ve } = await supabase
      .from("ventas_repuestos")
      .update({
        vendedor:    v.vendedor,
        metodo_pago: v.metodoPago,
        total:       v.total,
        notas:       v.notas,
      })
      .eq("id", v.id);
    if (ve) throw ve;

    await supabase.from("ventas_items").delete().eq("venta_id", v.id);
    if (v.items.length > 0) {
      const { error: ie } = await supabase.from("ventas_items").insert(
        v.items.map(i => ({
          id:          i.id,
          venta_id:    v.id,
          producto:    i.producto,
          sku:         i.sku,
          cantidad:    i.cantidad,
          precio_unit: i.precioUnit,
        }))
      );
      if (ie) throw ie;
    }
  },

  async cancelar(id: string): Promise<void> {
    const { error } = await supabase
      .from("ventas_repuestos")
      .update({ status: "cancelada" })
      .eq("id", id);
    if (error) throw error;
  },

  async getStats(desde: string, hasta: string): Promise<VentasStats> {
    const { data, error } = await supabase.rpc("get_ventas_stats", {
      fecha_desde: desde,
      fecha_hasta: hasta,
    });
    if (error) throw error;
    const row = (data as Record<string, unknown>[])?.[0] ?? {};
    return {
      totalFacturado: Number(row.total_facturado ?? 0),
      cantVentas:     Number(row.cant_ventas ?? 0),
      metodoTop:      (row.metodo_top as string) ?? null,
      productoTop:    (row.producto_top as string) ?? null,
    };
  },

  async getVentasPorDia(desde: string, hasta: string): Promise<VentasPorDia[]> {
    const { data, error } = await supabase.rpc("get_ventas_por_dia", {
      fecha_desde: desde,
      fecha_hasta: hasta,
    });
    if (error) throw error;
    return ((data as Record<string, unknown>[]) ?? []).map(r => ({
      dia:   r.dia as string,
      total: Number(r.total),
      cant:  Number(r.cant),
    }));
  },

  async getTopProductos(desde: string, hasta: string): Promise<TopProducto[]> {
    const { data, error } = await supabase.rpc("get_top_productos", {
      fecha_desde: desde,
      fecha_hasta: hasta,
      top_n: 5,
    });
    if (error) throw error;
    return ((data as Record<string, unknown>[]) ?? []).map(r => ({
      producto: r.producto as string,
      cantidad: Number(r.cantidad),
      total:    Number(r.total),
    }));
  },
};
