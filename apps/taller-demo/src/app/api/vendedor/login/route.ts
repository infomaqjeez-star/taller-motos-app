import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.VENDEDOR_JWT_SECRET || "maqjeez-vendedor-secret-key-2026"
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const { data: vendedor, error } = await supabase
      .from("vendedores")
      .select("id, nombre, email, codigo_referido, password_hash, comision_pct, nivel_vendedor, estado")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !vendedor) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (vendedor.estado !== "activo") {
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, vendedor.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = await new SignJWT({
      sub: vendedor.id,
      email: vendedor.email,
      codigo: vendedor.codigo_referido,
      role: "vendedor",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(JWT_SECRET);

    return NextResponse.json({
      token,
      vendedor: {
        id: vendedor.id,
        nombre: vendedor.nombre,
        email: vendedor.email,
        codigo_referido: vendedor.codigo_referido,
        comision_pct: vendedor.comision_pct,
        nivel_vendedor: vendedor.nivel_vendedor,
      },
    });
  } catch (err) {
    console.error("vendedor/login error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
