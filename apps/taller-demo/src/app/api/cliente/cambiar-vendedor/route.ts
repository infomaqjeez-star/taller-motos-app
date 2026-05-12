import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || "maqjeez-cliente-secret-key-2026"
);

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET, { clockTolerance: 60 });
    const clienteId = payload.sub as string;
    if (!clienteId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { vendedor_id } = await req.json();
    if (!vendedor_id) {
      return NextResponse.json({ error: "Vendedor requerido" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Obtener datos del cliente actual
    const { data: cliente } = await supabase
      .from("clientes_catalogo")
      .select("id, nombre, vendedor_referente_id")
      .eq("id", clienteId)
      .single();

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const vendedorAnteriorId = cliente.vendedor_referente_id;

    // Obtener datos del nuevo vendedor
    const { data: nuevoVendedor } = await supabase
      .from("vendedores")
      .select("id, nombre")
      .eq("id", vendedor_id)
      .single();

    if (!nuevoVendedor) {
      return NextResponse.json({ error: "Vendedor no encontrado" }, { status: 404 });
    }

    // Actualizar cliente
    const { error } = await supabase
      .from("clientes_catalogo")
      .update({ vendedor_referente_id: vendedor_id })
      .eq("id", clienteId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Actualizar pedidos pendientes del cliente al nuevo vendedor
    const { data: pedidosCliente } = await supabase
      .from("pedidos_catalogo")
      .select("id")
      .or(`datos_cliente->>'email' eq '${clienteId}', datos_cliente->>'cliente_id' eq '${clienteId}'`)
      .in("estado", ["pendiente", "confirmado"]);

    if (pedidosCliente && pedidosCliente.length > 0) {
      await supabase
        .from("pedidos_catalogo")
        .update({ vendedor_id })
        .in("id", pedidosCliente.map((p: any) => p.id));
    }

    // Notificar al nuevo vendedor
    await supabase.from("notificaciones").insert({
      tipo: "cambio_vendedor",
      titulo: "Nuevo cliente asignado",
      mensaje: `${cliente.nombre} te eligió como su vendedor.`,
      destinatario_rol: "vendedor",
      destinatario_id: vendedor_id,
      metadata: { cliente_id: clienteId, pedidos_actualizados: pedidosCliente?.length || 0 },
    });

    // Notificar al vendedor anterior (si existe)
    if (vendedorAnteriorId) {
      await supabase.from("notificaciones").insert({
        tipo: "cambio_vendedor",
        titulo: "Cliente cambió de vendedor",
        mensaje: `${cliente.nombre} cambió a otro vendedor.`,
        destinatario_rol: "vendedor",
        destinatario_id: vendedorAnteriorId,
        metadata: { cliente_id: clienteId, nuevo_vendedor_id: vendedor_id },
      });
    }

    // Notificar al admin
    await supabase.from("notificaciones").insert({
      tipo: "cambio_vendedor",
      titulo: "Cambio de vendedor",
      mensaje: `${cliente.nombre} cambió a vendedor ${nuevoVendedor.nombre}.`,
      destinatario_rol: "admin",
      metadata: { cliente_id: clienteId, vendedor_anterior_id: vendedorAnteriorId, nuevo_vendedor_id: vendedor_id },
    });

    return NextResponse.json({ success: true, vendedor: nuevoVendedor });
  } catch (err) {
    console.error("cambiar-vendedor error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
