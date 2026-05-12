import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dni = searchParams.get("dni")?.trim();
    const email = searchParams.get("email")?.trim().toLowerCase();
    const telefono = searchParams.get("telefono")?.trim();

    if (!dni && !email && !telefono) {
      return NextResponse.json({ pedidos: [] });
    }

    const supabase = getSupabaseServer();

    // Construir query con OR por DNI, email, telefono
    // datos_cliente es JSONB, usamos ->> para acceder a propiedades
    const conditions: string[] = [];
    if (dni) conditions.push(`datos_cliente->>'dni' = '${dni}'`);
    if (email) conditions.push(`datos_cliente->>'email' = '${email}'`);
    if (telefono) conditions.push(`datos_cliente->>'telefono' = '${telefono}'`);

    const orFilter = conditions.join(", ");

    const { data, error } = await supabase
      .from("pedidos_catalogo")
      .select("id, items, total, estado, created_at, datos_cliente, comision_monto, comision_estado")
      .or(orFilter)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("[buscar pedidos] error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Ordenar por prioridad: DNI exacto primero, luego email, luego telefono
    const pedidos = (data || []).map((p: any) => {
      const dc = p.datos_cliente || {};
      let matchScore = 0;
      if (dni && dc.dni === dni) matchScore += 100;
      if (email && dc.email?.toLowerCase() === email) matchScore += 50;
      if (telefono && dc.telefono === telefono) matchScore += 25;
      return { ...p, matchScore };
    }).sort((a: any, b: any) => b.matchScore - a.matchScore);

    return NextResponse.json({ pedidos });
  } catch (err) {
    console.error("[buscar pedidos] error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
