import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * GET /api/cron/cleanup-history
 * 
 * Elimina registros de printed_labels con mas de 60 dias.
 * Protegido con CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "") || request.nextUrl.searchParams.get("secret");
  
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("meli_printed_labels")
      .delete()
      .lt("printed_at", cutoff)
      .select("shipment_id");

    if (error) {
      console.error("[cleanup-history] Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const deleted = data?.length || 0;
    console.log(`[cleanup-history] Eliminados ${deleted} registros con mas de 60 dias`);

    return NextResponse.json({
      message: `Limpieza completada`,
      deleted,
      cutoff_date: cutoff,
    });
  } catch (error) {
    console.error("[cleanup-history] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
