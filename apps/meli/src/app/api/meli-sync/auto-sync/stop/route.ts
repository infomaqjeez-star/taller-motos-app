import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/meli";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { job_id?: string };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.job_id) return NextResponse.json({ error: "job_id requerido" }, { status: 400 });

  const supabase = getSupabase();
  const { error } = await supabase
    .from("sync_jobs")
    .update({ status: "stopping", updated_at: new Date().toISOString() })
    .eq("id", body.job_id)
    .eq("status", "running"); // Only stop if still running

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Señal de detención enviada" });
}
