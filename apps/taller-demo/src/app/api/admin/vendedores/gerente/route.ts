import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { jwtVerify } from "jose";

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "maqjeez-admin-secret-key-2026"
);

async function verifyAdmin(req: NextRequest) {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(auth.slice(7), ADMIN_JWT_SECRET, { clockTolerance: 60 });
    return payload;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
