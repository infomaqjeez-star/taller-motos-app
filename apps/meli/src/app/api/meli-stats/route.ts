import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder"
);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userId = user.id;
    const { searchParams } = new URL(request.url);
    const periodo = searchParams.get("periodo") || "mes"; // hoy | semana | mes | todo

    // Calcular fecha desde
    const now = new Date();
    let fechaDesde: Date;
    if (periodo === "hoy") {
      fechaDesde = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (periodo === "semana") {
      fechaDesde = new Date(now); fechaDesde.setDate(now.getDate() - 7);
    } else if (periodo === "mes") {
      fechaDesde = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      fechaDesde = new Date("2020-01-01");
    }

    // Obtener cuentas del usuario
    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    const accountIds = (accounts || []).map((a: any) => a.id);

    if (accountIds.length === 0) {
      return NextResponse.json({
        accounts: [],
        totales: { ventas: 0, facturacion: 0, preguntas: 0, respondidas: 0, publicaciones: 0, mensajes: 0 },
        por_cuenta: [],
        ventas_por_dia: [],
      });
    }

    // Ventas / ordenes
    const { data: ordenes } = await supabase
      .from("meli_orders")
      .select("id, meli_account_id, total_amount, status, date_created")
      .in("meli_account_id", accountIds)
      .gte("date_created", fechaDesde.toISOString())
      .eq("status", "paid");

    // Preguntas
    const { data: preguntas } = await supabase
      .from("meli_questions")
      .select("id, meli_account_id, status, date_created")
      .in("meli_account_id", accountIds)
      .gte("date_created", fechaDesde.toISOString());

    // Mensajes
    const { data: mensajes } = await supabase
      .from("meli_messages")
      .select("id, meli_account_id, status, date_created")
      .in("meli_account_id", accountIds)
      .gte("date_created", fechaDesde.toISOString());

    // Publicaciones activas
    const { data: publicaciones } = await supabase
      .from("meli_items")
      .select("id, meli_account_id, status, price")
      .in("meli_account_id", accountIds)
      .eq("status", "active");

    const ordenesArr = ordenes || [];
    const preguntasArr = preguntas || [];
    const mensajesArr = mensajes || [];
    const pubsArr = publicaciones || [];

    // Totales generales
    const totales = {
      ventas: ordenesArr.length,
      facturacion: ordenesArr.reduce((s: number, o: any) => s + (o.total_amount || 0), 0),
      preguntas: preguntasArr.length,
      respondidas: preguntasArr.filter((q: any) => q.status === "answered").length,
      publicaciones: pubsArr.length,
      mensajes: mensajesArr.length,
    };

    // Stats por cuenta
    const por_cuenta = (accounts || []).map((acc: any) => ({
      id: acc.id,
      meli_user_id: acc.meli_user_id,
      nickname: acc.meli_nickname,
      ventas: ordenesArr.filter((o: any) => o.meli_account_id === acc.id).length,
      facturacion: ordenesArr
        .filter((o: any) => o.meli_account_id === acc.id)
        .reduce((s: number, o: any) => s + (o.total_amount || 0), 0),
      preguntas: preguntasArr.filter((q: any) => q.meli_account_id === acc.id).length,
      respondidas: preguntasArr.filter((q: any) => q.meli_account_id === acc.id && q.status === "answered").length,
      publicaciones: pubsArr.filter((p: any) => p.meli_account_id === acc.id).length,
    }));

    // Ventas por dia (ultimos 30 dias)
    const ventasPorDia: Record<string, number> = {};
    for (const o of ordenesArr) {
      const dia = o.date_created?.slice(0, 10);
      if (dia) ventasPorDia[dia] = (ventasPorDia[dia] || 0) + (o.total_amount || 0);
    }
    const ventas_por_dia = Object.entries(ventasPorDia)
      .map(([dia, total]) => ({ dia, total }))
      .sort((a, b) => a.dia.localeCompare(b.dia));

    return NextResponse.json({
      accounts: accounts || [],
      totales,
      por_cuenta,
      ventas_por_dia,
    });
  } catch (err) {
    console.error("[meli-stats] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
