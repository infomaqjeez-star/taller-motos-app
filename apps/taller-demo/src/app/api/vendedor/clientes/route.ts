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
    const vendedorId = payload.sub as string;

    const supabase = getSupabaseServer();

    // Clientes registrados con este vendedor como referente
    const { data: clientes, error } = await supabase
      .from("clientes_catalogo")
      .select("id, nombre, email, telefono, codigo_referido, descuento_cliente_pct, created_at")
      .eq("vendedor_referente_id", vendedorId)
      .eq("estado", "activo")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Pedidos de este vendedor agrupados por cliente
    const { data: pedidos } = await supabase
      .from("pedidos_catalogo")
      .select("id, created_at, estado, estado_pago, estado_envio, total, comision_monto, comision_estado, datos_cliente, fecha_despacho, fecha_pago")
      .eq("vendedor_id", vendedorId)
      .order("created_at", { ascending: false });

    // Para clientes sin registro (anónimos con pedidos), extraer de datos_cliente
    const clientesIds = new Set((clientes || []).map((c: any) => c.id));
    const clientesAnonimos: Record<string, any> = {};

    for (const p of pedidos || []) {
      const clienteId = p.datos_cliente?.cliente_id;
      if (!clienteId || clientesIds.has(clienteId)) continue;
      // Cliente con id pero no en la lista (raro) — skip
      if (!clientesAnonimos[p.datos_cliente?.email || p.id]) {
        clientesAnonimos[p.datos_cliente?.email || p.id] = {
          id: null,
          nombre: p.datos_cliente?.nombre || "Sin nombre",
          email: p.datos_cliente?.email || null,
          telefono: p.datos_cliente?.telefono || null,
          codigo_referido: null,
          descuento_cliente_pct: 0,
          created_at: p.created_at,
          es_anonimo: true,
        };
      }
    }

    // Construir mapa de pedidos por cliente_id y por email para anónimos
    const pedidosPorCliente: Record<string, any[]> = {};
    for (const p of pedidos || []) {
      const key = p.datos_cliente?.cliente_id || p.datos_cliente?.email || "sin_id";
      if (!pedidosPorCliente[key]) pedidosPorCliente[key] = [];
      pedidosPorCliente[key].push(p);
    }

    // Armar respuesta: clientes registrados
    const clientesConPedidos = (clientes || []).map((c: any) => {
      const ps = pedidosPorCliente[c.id] || [];
      const totalComprado = ps.filter((p: any) => p.estado !== "cancelado").reduce((s: number, p: any) => s + (p.total || 0), 0);
      const comisionTotal = ps.filter((p: any) => p.estado !== "cancelado").reduce((s: number, p: any) => s + (p.comision_monto || 0), 0);
      const ultimoPedido = ps[0] || null;
      return {
        ...c,
        es_anonimo: false,
        total_pedidos: ps.length,
        total_comprado: totalComprado,
        comision_generada: comisionTotal,
        ultimo_pedido: ultimoPedido,
        pedidos: ps,
      };
    });

    // Anónimos: clientes que compraron pero no se registraron
    const anonimosConPedidos = Object.values(clientesAnonimos).map((c: any) => {
      const ps = pedidosPorCliente[c.email || "sin_id"] || [];
      const totalComprado = ps.filter((p: any) => p.estado !== "cancelado").reduce((s: number, p: any) => s + (p.total || 0), 0);
      const comisionTotal = ps.filter((p: any) => p.estado !== "cancelado").reduce((s: number, p: any) => s + (p.comision_monto || 0), 0);
      return {
        ...c,
        total_pedidos: ps.length,
        total_comprado: totalComprado,
        comision_generada: comisionTotal,
        ultimo_pedido: ps[0] || null,
        pedidos: ps,
      };
    });

    return NextResponse.json({
      clientes: clientesConPedidos,
      anonimos: anonimosConPedidos,
      resumen: {
        total_clientes: clientesConPedidos.length,
        total_anonimos: anonimosConPedidos.length,
        total_comprado: [...clientesConPedidos, ...anonimosConPedidos].reduce((s, c) => s + c.total_comprado, 0),
        comision_total: [...clientesConPedidos, ...anonimosConPedidos].reduce((s, c) => s + c.comision_generada, 0),
      },
    });
  } catch {
    return NextResponse.json({ error: "Token inválido" }, { status: 401 });
  }
}
