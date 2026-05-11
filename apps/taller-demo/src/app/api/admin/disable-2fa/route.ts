import { NextRequest, NextResponse } from "next/server";
import { getAdminFromRequest } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: "Código requerido para desactivar" }, { status: 400 });
    }

    // Verificar código antes de permitir desactivar
    if (admin.totp_enabled && admin.totp_secret) {
      const { TOTP } = await import("otpauth");
      const totp = new TOTP({
        secret: admin.totp_secret,
        digits: 6,
        period: 30,
      });
      const valid = totp.validate({ token: String(code).trim(), window: 1 });
      if (valid === null) {
        return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
      }
    }

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("admins_catalogo")
      .update({ totp_enabled: false, totp_secret: null })
      .eq("id", admin.id);

    if (error) {
      return NextResponse.json({ error: "Error al desactivar 2FA" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "2FA desactivado" });
  } catch (err) {
    console.error("admin/disable-2fa error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
