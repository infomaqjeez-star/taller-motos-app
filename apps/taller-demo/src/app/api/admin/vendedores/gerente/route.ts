import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { getAdminFromRequest } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const admin = await getAdminFromRequest(req);
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { vendedor_id, lider_id, es_gerente } = await req.json();
    if (!vendedor_id) return NextResponse.json({ error: "vendedor_id requerido" }, { status: 400 });

    const supabase = getSupabaseServer();
    const update: Record<string, any> = {};
    if (lider_id !== undefined) update.lider_id = lider_id || null;
    if (es_gerente !== undefined) update.es_gerente = Boolean(es_gerente);

    const { error } = await supabase.from("vendedores").update(update).eq("id", vendedor_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notificar al vendedor afectado
    const { data: vendedor } = await supabase.from("vendedores").select("nombre").eq("id", vendedor_id).single();
    if (es_gerente === true) {
      await supabase.from("notificaciones").insert({
        tipo: "nuevo_gerente",
        titulo: "Nuevo Gerente asignado",
        mensaje: `${vendedor?.nombre || vendedor_id} fue promovido a Gerente por el admin ${admin.nombre}.`,
        destinatario_rol: "admin",
        metadata: { vendedor_id, admin_id: admin.id },
      });
      await supabase.from("notificaciones").insert({
        tipo: "nuevo_gerente",
        titulo: "¡Felicitaciones, sos Gerente!",
        mensaje: `Fuiste promovido a Gerente. Ahora podés liderar un equipo de vendedores.`,
        destinatario_rol: "vendedor",
        destinatario_id: vendedor_id,
        metadata: { admin_id: admin.id },
      });
    } else if (lider_id) {
      const { data: lider } = await supabase.from("vendedores").select("nombre").eq("id", lider_id).single();
      await supabase.from("notificaciones").insert({
        tipo: "cambio_gerente",
        titulo: "Vendedor asignado a Gerente",
        mensaje: `${vendedor?.nombre || vendedor_id} fue asignado al gerente ${lider?.nombre || lider_id}.`,
        destinatario_rol: "admin",
        metadata: { vendedor_id, lider_id, admin_id: admin.id },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
