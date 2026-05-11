import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getAdminFromRequest } from "@/lib/admin-auth";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Contraseña actual y nueva requeridas" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const admin = await getAdminFromRequest(req);
    if (!admin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    const { data: dbAdmin } = await supabase
      .from("admins_catalogo")
      .select("id, password_hash")
      .eq("id", admin.id)
      .single();

    if (!dbAdmin) {
      return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 });
    }

    // Validar contraseña actual
    let valid = await bcrypt.compare(currentPassword, dbAdmin.password_hash);
    if (!valid && !dbAdmin.password_hash.startsWith("$2")) {
      valid = currentPassword === dbAdmin.password_hash;
    }
    if (!valid) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 401 });
    }

    // Hashear nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 12);

    const { error } = await supabase
      .from("admins_catalogo")
      .update({ password_hash: newHash })
      .eq("id", admin.id);

    if (error) {
      return NextResponse.json({ error: "Error al actualizar contraseña" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("admin/change-password error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
