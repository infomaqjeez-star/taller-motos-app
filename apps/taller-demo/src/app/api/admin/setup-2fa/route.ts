import { NextRequest, NextResponse } from "next/server";
import { TOTP, Secret } from "otpauth";
import QRCode from "qrcode";
import { getAdminFromRequest } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Generar nuevo secret TOTP
    const secret = new Secret({ size: 20 });

    const totp = new TOTP({
      secret: secret.base32,
      digits: 6,
      period: 30,
      issuer: "MaqJeez",
      label: admin.email,
    });

    // Generar QR como data URL
    const otpauthUrl = totp.toString();
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 300,
      margin: 2,
      color: { dark: "#f97316", light: "#ffffff" },
    });

    // Guardar secret temporal (no activado hasta confirmar)
    const supabase = getSupabaseServer();
    await supabase
      .from("admins_catalogo")
      .update({ totp_secret: secret.base32, totp_enabled: false })
      .eq("id", admin.id);

    return NextResponse.json({
      qrDataUrl,
      secret: secret.base32,
      manualEntryKey: secret.base32.match(/.{1,4}/g)?.join(" ") || secret.base32,
    });
  } catch (err) {
    console.error("admin/setup-2fa error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
