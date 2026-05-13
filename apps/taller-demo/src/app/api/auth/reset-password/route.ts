import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token y nueva contraseña requeridos" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Buscar token válido
    const { data: resetToken } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!resetToken) {
      return NextResponse.json({ error: "El link es inválido o ya expiró. Solicitá uno nuevo." }, { status: 400 });
    }

    // Hashear nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 12);

    // Actualizar contraseña según rol
    const tablas: Record<string, string> = {
      cliente: "clientes_catalogo",
      vendedor: "vendedores",
      admin: "admins_catalogo",
    };
    const tabla = tablas[resetToken.rol];

    const { error } = await supabase
      .from(tabla)
      .update({ password_hash: newHash })
      .eq("email", resetToken.email);

    if (error) {
      return NextResponse.json({ error: "Error al actualizar la contraseña" }, { status: 500 });
    }

    // Marcar token como usado
    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("id", resetToken.id);

    // Invalidar todos los demás tokens del mismo email/rol
    await supabase
      .from("password_reset_tokens")
      .delete()
      .eq("email", resetToken.email)
      .eq("rol", resetToken.rol);

    return NextResponse.json({ success: true, rol: resetToken.rol });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// GET para validar que el token es válido antes de mostrar el formulario
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ valid: false, error: "Token requerido" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data } = await supabase
      .from("password_reset_tokens")
      .select("email, rol, expires_at")
      .eq("token", token)
      .eq("used", false)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ valid: false, error: "Token inválido o expirado" });
    }

    return NextResponse.json({ valid: true, email: data.email, rol: data.rol });
  } catch (err) {
    console.error("reset-password GET error:", err);
    return NextResponse.json({ valid: false, error: "Error interno" }, { status: 500 });
  }
}
