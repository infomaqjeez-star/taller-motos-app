import { NextRequest, NextResponse } from "next/server";
import { TOTP } from "otpauth";
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
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    if (!admin.totp_secret) {
      return NextResponse.json({ error: "2FA no configurado. Solicitá un QR primero." }, { status: 400 });
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

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("admins_catalogo")
      .update({ totp_enabled: true })
      .eq("id", admin.id);

    if (error) {
      return NextResponse.json({ error: "Error al activar 2FA" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "2FA activado correctamente" });
  } catch (err) {
    console.error("admin/confirm-2fa error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
