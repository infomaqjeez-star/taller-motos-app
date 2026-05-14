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

    // Obtener vendedores del equipo
    const { data: equipo } = await supabase
      .from("vendedores")
      .select("id, nombre, codigo_referido, nivel_vendedor, comision_pct")
      .eq("lider_id", gerenteId)
      .eq("estado", "activo");

    const equipoIds = (equipo || []).map((v: any) => v.id);

    if (equipoIds.length === 0) {
      return NextResponse.json({ pedidos: [], equipo: [], resumen: null });
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

    // Resumen del equipo
    const totalVentas = (pedidos || []).filter((p: any) => p.estado !== "cancelado").reduce((s: number, p: any) => s + (p.total || 0), 0);
    const comisionPendiente = (pedidos || []).filter((p: any) => p.comision_estado !== "pagada").reduce((s: number, p: any) => s + (p.comision_gerente_monto || 0), 0);
    const comisionPagada = (pedidos || []).filter((p: any) => p.comision_estado === "pagada").reduce((s: number, p: any) => s + (p.comision_gerente_monto || 0), 0);

    return NextResponse.json({
      pedidos: pedidos || [],
      equipo: equipo || [],
      resumen: {
        total_pedidos: (pedidos || []).length,
        total_ventas: totalVentas,
        comision_pendiente: comisionPendiente,
        comision_pagada: comisionPagada,
        total_vendedores: equipoIds.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
