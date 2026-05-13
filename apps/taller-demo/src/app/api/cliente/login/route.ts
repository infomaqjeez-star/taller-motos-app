import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || "maqjeez-cliente-secret-key-2026"
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: cliente, error } = await supabase
      .from("clientes_catalogo")
      .select("id, nombre, email, password_hash, codigo_referido, descuento_cliente_pct, estado, vendedor_referente_id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !cliente) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (cliente.estado !== "activo") {
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, cliente.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = await new SignJWT({
      sub: cliente.id,
      email: cliente.email,
      role: "cliente",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    return NextResponse.json({
      token,
      cliente: {
        id: cliente.id,
        nombre: cliente.nombre,
        email: cliente.email,
        codigo_referido: cliente.codigo_referido,
        descuento_cliente_pct: cliente.descuento_cliente_pct,
        vendedor_referente_id: cliente.vendedor_referente_id || null,
      },
    });
  } catch (err) {
    console.error("cliente/login error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
