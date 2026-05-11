import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { TOTP } from "otpauth";
import { getSupabaseServer } from "@/lib/supabase-server";

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "fallback-secret"
);

export async function POST(req: NextRequest) {
  try {
    const { tempToken, code } = await req.json();
    if (!tempToken || !code) {
      return NextResponse.json({ error: "Token y código requeridos" }, { status: 400 });
    }

    let payload;
    try {
      const { payload: p } = await jwtVerify(tempToken, SECRET, { clockTolerance: 60 });
      payload = p;
    } catch {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
    }

    if (payload.step !== "2fa" || !payload.admin_id) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    const { data: admin, error } = await supabase
      .from("admins_catalogo")
      .select("id, nombre, email, totp_secret, totp_enabled")
      .eq("id", payload.admin_id)
      .single();

    if (error || !admin || !admin.totp_secret) {
      return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 });
    }

    const totp = new TOTP({
      secret: admin.totp_secret,
      digits: 6,
      period: 30,
    });

    const valid = totp.validate({ token: String(code).trim(), window: 1 });
    if (valid === null) {
      return NextResponse.json({ error: "Código incorrecto o expirado" }, { status: 401 });
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error("admin/verify-2fa error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
