import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || "maqjeez-cliente-secret-key-2026"
);

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, telefono, password, vendedor_referente_id } = await req.json();
    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña requeridos" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: existente } = await supabase
      .from("clientes_catalogo")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (existente) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const codigo = "CLI" + Math.floor(1000 + Math.random() * 9000);

    const insertData: any = {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono?.trim() || null,
      password_hash,
      codigo_referido: codigo,
      descuento_cliente_pct: 3,
      estado: "activo",
    };

    if (vendedor_referente_id) {
      insertData.vendedor_referente_id = vendedor_referente_id;
    }

    const { data: cliente, error } = await supabase
      .from("clientes_catalogo")
      .insert(insertData)
      .select("id, nombre, email, codigo_referido, descuento_cliente_pct, vendedor_referente_id")
      .single();

    if (error || !cliente) {
      return NextResponse.json({ error: error?.message || "Error al registrar" }, { status: 500 });
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
      },
    });
  } catch (err) {
    console.error("cliente/register error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
