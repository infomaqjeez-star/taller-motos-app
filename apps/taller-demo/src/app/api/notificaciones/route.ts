import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { jwtVerify } from "jose";

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || "maqjeez-admin-secret-key-2026"
);
const VENDEDOR_JWT_SECRET = new TextEncoder().encode(
  process.env.VENDEDOR_JWT_SECRET || "maqjeez-vendedor-secret-key-2026"
);

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServer();

    // Verificar admin
    const adminAuth = req.headers.get("Authorization");
    if (adminAuth?.startsWith("Bearer ")) {
      try {
        await jwtVerify(adminAuth.slice(7), ADMIN_JWT_SECRET, { clockTolerance: 60 });
        const { data } = await supabase
          .from("notificaciones")
          .select("*")
          .eq("destinatario_rol", "admin")
          .eq("leido", false)
          .order("created_at", { ascending: false })
          .limit(20);
        return NextResponse.json({ notificaciones: data || [] });
      } catch {
        // No es admin, continuar
      }
    }

    // Verificar vendedor
    const vendedorAuth = req.headers.get("x-vendedor-token");
    if (vendedorAuth) {
      try {
        const { payload } = await jwtVerify(vendedorAuth, VENDEDOR_JWT_SECRET, { clockTolerance: 60 });
        const vendedorId = payload.sub as string;
        const { data } = await supabase
          .from("notificaciones")
          .select("*")
          .eq("destinatario_rol", "vendedor")
          .eq("destinatario_id", vendedorId)
          .eq("leido", false)
          .order("created_at", { ascending: false })
          .limit(20);
        return NextResponse.json({ notificaciones: data || [] });
      } catch {
        // No es vendedor
      }
    }

    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  } catch (err) {
    console.error("notificaciones error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  // Verificar que el caller sea admin o vendedor válido
  const authHeader = req.headers.get("Authorization");
  const vendedorHeader = req.headers.get("x-vendedor-token");
  let authorized = false;

  if (authHeader?.startsWith("Bearer ")) {
    try { await jwtVerify(authHeader.slice(7), ADMIN_JWT_SECRET, { clockTolerance: 60 }); authorized = true; } catch {}
  }
  if (!authorized && vendedorHeader) {
    try { await jwtVerify(vendedorHeader, VENDEDOR_JWT_SECRET, { clockTolerance: 60 }); authorized = true; } catch {}
  }
  if (!authorized) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const supabase = getSupabaseServer();
    await supabase.from("notificaciones").update({ leido: true }).eq("id", id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("notificaciones patch error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
