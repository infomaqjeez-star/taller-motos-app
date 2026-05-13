import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { jwtVerify } from "jose";

const CLIENTE_JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || "maqjeez-cliente-secret-key-2026"
);

export async function GET(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.headers.get("x-cliente-token");

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { payload } = await jwtVerify(token, CLIENTE_JWT_SECRET, { clockTolerance: 60 });
    const clienteId = payload.sub as string;

    const supabase = getSupabaseServer();

    const { data: pedidos, error } = await supabase
      .from("pedidos_catalogo")
      .select("id, created_at, estado, total, subtotal, items, datos_cliente, comision_estado")
      .eq("datos_cliente->>cliente_id", clienteId)
      .order("created_at", { ascending: false })
      .limit(50);

    // Error real de DB: retornar 500
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Si no hay resultados por cliente_id, intentar por email como fallback
    if (!pedidos?.length) {
      const { data: clienteData } = await supabase
        .from("clientes_catalogo")
        .select("email")
        .eq("id", clienteId)
        .single();

      if (clienteData?.email) {
        const { data: pedidosByEmail } = await supabase
          .from("pedidos_catalogo")
          .select("id, created_at, estado, total, subtotal, items, datos_cliente, comision_estado")
          .eq("datos_cliente->>email", clienteData.email)
          .order("created_at", { ascending: false })
          .limit(50);

        return NextResponse.json({ pedidos: pedidosByEmail || [] });
      }
    }

    return NextResponse.json({ pedidos: pedidos || [] });
  } catch (err: any) {
    console.error("cliente/pedidos error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// PATCH: subir/actualizar comprobante de un pedido existente
export async function PATCH(req: NextRequest) {
  try {
    const token =
      req.headers.get("authorization")?.replace("Bearer ", "") ||
      req.headers.get("x-cliente-token");

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    await jwtVerify(token, CLIENTE_JWT_SECRET, { clockTolerance: 60 });

    const { pedido_id, comprobante_url } = await req.json();
    if (!pedido_id || !comprobante_url) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: pedido } = await supabase
      .from("pedidos_catalogo")
      .select("datos_cliente")
      .eq("id", pedido_id)
      .single();

    if (!pedido) {
      return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
    }

    const nuevosDatos = { ...pedido.datos_cliente, comprobante: comprobante_url };

    const { error } = await supabase
      .from("pedidos_catalogo")
      .update({ datos_cliente: nuevosDatos })
      .eq("id", pedido_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("cliente/pedidos PATCH error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
