import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// GET /api/correo - Listar despachos
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const desde = searchParams.get("desde");
    const hasta = searchParams.get("hasta");

    let query = supabase
      .from("correo_despachos")
      .select("*")
      .order("fecha", { ascending: false })
      .limit(50);

    if (desde) query = query.gte("fecha", desde);
    if (hasta) query = query.lte("fecha", hasta);

    const { data, error } = await query;

    if (error) {
      console.error("[API Correo] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err: any) {
    console.error("[API Correo] Error inesperado:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/correo - Crear o eliminar despacho
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const body = await request.json();
    const { action, despacho, id } = body;

    switch (action) {
      case "create": {
        const { fecha, archivo_url, archivo_tipo, notas, cantidad_envios } = despacho;
        const { data, error } = await supabase
          .from("correo_despachos")
          .insert({
            fecha: fecha || new Date().toISOString().split("T")[0],
            archivo_url: archivo_url || null,
            archivo_tipo: archivo_tipo || null,
            notas: notas || "",
            cantidad_envios: cantidad_envios || 0,
          })
          .select()
          .single();

        if (error) {
          console.error("[API Correo] Error creando:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
      }

      case "update": {
        const { fecha, archivo_url, archivo_tipo, notas, cantidad_envios } = despacho;
        const { data, error } = await supabase
          .from("correo_despachos")
          .update({
            fecha,
            archivo_url: archivo_url || null,
            archivo_tipo: archivo_tipo || null,
            notas: notas || "",
            cantidad_envios: cantidad_envios || 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          console.error("[API Correo] Error actualizando:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data });
      }

      case "delete": {
        const { error } = await supabase
          .from("correo_despachos")
          .delete()
          .eq("id", id);

        if (error) {
          console.error("[API Correo] Error eliminando:", error);
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: "Acción no soportada" }, { status: 400 });
    }
  } catch (err: any) {
    console.error("[API Correo] Error inesperado:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
