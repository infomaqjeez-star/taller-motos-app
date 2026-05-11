import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { jwtVerify } from "jose";

const VENDEDOR_JWT_SECRET = new TextEncoder().encode(
  process.env.VENDEDOR_JWT_SECRET || "maqjeez-vendedor-secret-key-2026"
);
const CLIENTE_JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || "maqjeez-cliente-secret-key-2026"
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, datos_cliente, subtotal, descuento_pct, descuento_monto, envio, total, vendedor_id, comision_monto } = body;

    const supabase = getSupabaseServer();

    // Si hay vendedor_id del link de referido, usarlo
    let finalVendedorId = vendedor_id || null;

    // Si no hay vendedor del link, verificar si el cliente logueado tiene un vendedor referente
    if (!finalVendedorId) {
      const clienteToken = req.headers.get("x-cliente-token");
      if (clienteToken) {
        try {
          const { payload } = await jwtVerify(clienteToken, CLIENTE_JWT_SECRET, { clockTolerance: 60 });
          const { data: cliente } = await supabase
            .from("clientes_catalogo")
            .select("vendedor_referente_id")
            .eq("id", payload.sub)
            .single();
          if (cliente?.vendedor_referente_id) {
            finalVendedorId = cliente.vendedor_referente_id;
          }
        } catch {
          // ignorar error de token
        }
      }
    }

    let fechaLimitePago = null;
    let finalComisionMonto = comision_monto || 0;
    let comisionGerenteMonto = 0;
    let finalGerenteId = null;

    if (finalVendedorId) {
      const { data: vendedor } = await supabase
        .from("vendedores")
        .select("id, estado, nivel_vendedor, comision_pct, lider_id, es_gerente")
        .eq("id", finalVendedorId)
        .single();
      if (!vendedor || vendedor.estado !== "activo") {
        finalVendedorId = null;
      } else {
        // Calcular fecha límite según nivel
        const diasMap: Record<string, number> = {
          nuevo: 30,
          junior: 30,
          senior: 20,
          senior_pro: 15,
          master: 7,
          gerente: 7,
        };
        const dias = diasMap[vendedor.nivel_vendedor || 'nuevo'] || 30;
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + dias);
        fechaLimitePago = fecha.toISOString();

        // Calcular comisión base
        let comisionPct = vendedor.comision_pct || 10;

        // Si tiene gerente (lider_id), el vendedor gana +3% extra
        if (vendedor.lider_id) {
          const { data: gerente } = await supabase
            .from("vendedores")
            .select("id, estado, es_gerente")
            .eq("id", vendedor.lider_id)
            .single();
          if (gerente && gerente.estado === "activo" && gerente.es_gerente) {
            comisionPct += 3;
            finalGerenteId = gerente.id;
          }
        }

        finalComisionMonto = Math.round((subtotal * comisionPct) / 100);

        // Si hay gerente, gana 10% de la comisión del vendedor
        if (finalGerenteId) {
          comisionGerenteMonto = Math.round(finalComisionMonto * 0.10);
        }
      }
    }

    const insertData: Record<string, any> = {
      vendedor_id: finalVendedorId,
      gerente_id: finalGerenteId,
      items,
      datos_cliente,
      subtotal,
      descuento_pct,
      descuento_monto,
      envio,
      total,
      comision_monto: finalComisionMonto,
      comision_gerente_monto: comisionGerenteMonto,
      estado: "pendiente",
      comision_estado: finalVendedorId ? "pendiente" : null,
      whatsapp_enviado: true,
    };

    if (fechaLimitePago) {
      insertData.fecha_limite_pago = fechaLimitePago;
    }

    const { data: pedido, error } = await supabase
      .from("pedidos_catalogo")
      .insert(insertData)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ pedido });
  } catch (err) {
    console.error("pedidos/catalogo error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
