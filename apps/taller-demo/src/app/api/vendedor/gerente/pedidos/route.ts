import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.VENDEDOR_JWT_SECRET || "maqjeez-vendedor-secret-key-2026"
);

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, JWT_SECRET, { clockTolerance: 60 });
    const gerenteId = payload.sub as string;

    const supabase = getSupabaseServer();

    // Verificar que sea gerente
    const { data: gerente } = await supabase
      .from("vendedores")
      .select("id, nombre, es_gerente")
      .eq("id", gerenteId)
      .single();

    if (!gerente?.es_gerente) {
      return NextResponse.json({ error: "No sos gerente" }, { status: 403 });
    }

    // Obtener vendedores del equipo (subordinados + el propio gerente)
    const { data: subordinados } = await supabase
      .from("vendedores")
      .select("id, nombre, email, codigo_referido, nivel_vendedor, comision_pct, estado, lider_id")
      .eq("lider_id", gerenteId);

    // También incluir al gerente para que se vea a sí mismo
    const { data: gerenteData } = await supabase
      .from("vendedores")
      .select("id, nombre, email, codigo_referido, nivel_vendedor, comision_pct, estado, lider_id")
      .eq("id", gerenteId)
      .single();

    const equipo = [...(subordinados || [])];
    if (gerenteData && !equipo.find((v: any) => v.id === gerenteData.id)) {
      equipo.push(gerenteData);
    }

    const equipoIds = equipo.map((v: any) => v.id);

    if (equipoIds.length === 0) {
      return NextResponse.json({ pedidos: [], equipo: [], resumen: null, debug: { gerenteId, message: "No hay vendedores asignados a este gerente" } });
    }

    // Pedidos de todo el equipo
    const { data: pedidos, error } = await supabase
      .from("pedidos_catalogo")
      .select("id, created_at, estado, estado_pago, estado_envio, total, comision_monto, comision_estado, comision_gerente_monto, datos_cliente, fecha_limite_pago, fecha_pago_comision, fecha_pago, fecha_despacho, fecha_entrega, vendedor_id")
      .in("vendedor_id", equipoIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clientes registrados de cada vendedor del equipo
    const { data: clientesEquipo } = await supabase
      .from("clientes_catalogo")
      .select("id, nombre, email, telefono, codigo_referido, descuento_cliente_pct, created_at, vendedor_referente_id")
      .in("vendedor_referente_id", equipoIds)
      .eq("estado", "activo")
      .order("created_at", { ascending: false });

    // Resumen del equipo
    const pedidosActivos = (pedidos || []).filter((p: any) => p.estado !== "cancelado");
    const totalVentas = pedidosActivos.reduce((s: number, p: any) => s + (p.total || 0), 0);
    const comisionPendiente = (pedidos || []).filter((p: any) => p.comision_estado !== "pagada").reduce((s: number, p: any) => s + (p.comision_gerente_monto || 0), 0);
    const comisionPagada = (pedidos || []).filter((p: any) => p.comision_estado === "pagada").reduce((s: number, p: any) => s + (p.comision_gerente_monto || 0), 0);
    const pedidosDespachados = (pedidos || []).filter((p: any) => p.estado_envio === "enviado" || p.estado_envio === "entregado").length;
    const pedidosPagados = (pedidos || []).filter((p: any) => p.estado_pago === "pagado").length;

    return NextResponse.json({
      pedidos: pedidos || [],
      equipo: equipo || [],
      clientes: clientesEquipo || [],
      resumen: {
        total_pedidos: (pedidos || []).length,
        total_ventas: totalVentas,
        comision_pendiente: comisionPendiente,
        comision_pagada: comisionPagada,
        total_vendedores: equipoIds.length,
        total_clientes: (clientesEquipo || []).length,
        pedidos_despachados: pedidosDespachados,
        pedidos_pagados: pedidosPagados,
      },
    });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
