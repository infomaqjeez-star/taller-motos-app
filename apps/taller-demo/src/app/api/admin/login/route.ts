import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: admin, error } = await supabase
      .from("admins_catalogo")
      .select("id, nombre, email, password_hash, estado")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !admin) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (admin.estado !== "activo") {
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    return NextResponse.json({
      admin: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
      },
    });
  } catch (err) {
    console.error("admin/login error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
