import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://maqjeez.netlify.app";

export async function POST(req: NextRequest) {
  try {
    const { email, rol } = await req.json();
    if (!email || !rol) {
      return NextResponse.json({ error: "Email y rol requeridos" }, { status: 400 });
    }
    if (!["cliente", "vendedor", "admin"].includes(rol)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const emailNorm = email.trim().toLowerCase();

    // Verificar que el email existe para ese rol
    const tablas: Record<string, string> = {
      cliente: "clientes_catalogo",
      vendedor: "vendedores",
      admin: "admins_catalogo",
    };
    const tabla = tablas[rol];
    const { data: usuario } = await supabase
      .from(tabla)
      .select("id, nombre, email")
      .eq("email", emailNorm)
      .maybeSingle();

    // Respuesta genérica para no revelar si el email existe
    const respuestaOk = NextResponse.json({
      success: true,
      message: "Si el email está registrado, recibirás un link para restablecer tu contraseña.",
    });

    if (!usuario) return respuestaOk;

    // Generar token único de 32 bytes
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token (invalidar anteriores del mismo email/rol)
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("email", emailNorm)
      .eq("rol", rol);

    await supabase.from("password_reset_tokens").insert({
      token,
      email: emailNorm,
      rol,
      expires_at: expiresAt.toISOString(),
    });

    // URL de reset según rol
    const resetUrls: Record<string, string> = {
      cliente: `${APP_URL}/catalogo/cliente/reset-password?token=${token}`,
      vendedor: `${APP_URL}/catalogo/vendedor/reset-password?token=${token}`,
      admin: `${APP_URL}/catalogo/admin/reset-password?token=${token}`,
    };
    const resetUrl = resetUrls[rol];

    const rolLabel: Record<string, string> = {
      cliente: "Cliente",
      vendedor: "Vendedor",
      admin: "Administrador",
    };

    // Enviar email
    await resend.emails.send({
      from: FROM_EMAIL,
      to: emailNorm,
      subject: "Restablecer contraseña — MaqJeez",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0a0b10; color: #ffffff; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0a0b10 100%); padding: 40px 32px 32px; border-bottom: 1px solid rgba(255,94,58,0.3);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div style="width: 40px; height: 40px; background: rgba(255,94,58,0.15); border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 20px;">🔑</span>
              </div>
              <span style="font-size: 22px; font-weight: 900; color: #FF5E3A;">MaqJeez</span>
            </div>
            <h1 style="margin: 16px 0 4px; font-size: 22px; font-weight: 800; color: #ffffff;">Restablecer contraseña</h1>
            <p style="margin: 0; color: #94a3b8; font-size: 14px;">Solicitud de recuperación · ${rolLabel[rol]}</p>
          </div>
          <div style="padding: 32px;">
            <p style="color: #cbd5e1; font-size: 15px; margin: 0 0 12px;">Hola <strong style="color: #fff;">${usuario.nombre}</strong>,</p>
            <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 28px;">
              Recibimos una solicitud para restablecer la contraseña de tu cuenta en MaqJeez. 
              Si no fuiste vos, ignorá este email — tu contraseña no cambiará.
            </p>
            <a href="${resetUrl}"
              style="display: block; text-align: center; background: #FF5E3A; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 10px; margin-bottom: 20px;">
              Restablecer mi contraseña →
            </a>
            <p style="color: #475569; font-size: 12px; text-align: center; margin: 0 0 8px;">
              Este link expira en <strong style="color: #94a3b8;">1 hora</strong>.
            </p>
            <p style="color: #334155; font-size: 11px; text-align: center; word-break: break-all; margin: 0;">
              ${resetUrl}
            </p>
          </div>
          <div style="padding: 16px 32px; border-top: 1px solid rgba(255,255,255,0.06); text-align: center;">
            <p style="color: #334155; font-size: 11px; margin: 0;">MaqJeez · Repuestos y equipos · soporte@maqjeez.com</p>
          </div>
        </div>
      `,
    });

    return respuestaOk;
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
