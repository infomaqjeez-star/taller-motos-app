import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/meli";

export const dynamic = "force-dynamic";

// Returns the last paused job (if any) for the caller to offer a "Resume" button
export async function GET() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from("sync_jobs")
    .select("id, status, checkpoint, summary, created_at")
    .eq("status", "paused")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return NextResponse.json({ job: null });
  return NextResponse.json({ job: data });
}
