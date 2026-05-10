import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase-server";

function generarCodigo(): string {
  const prefix = "MAQ";
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}${num}`;
}

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, telefono, password } = await req.json();
    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña requeridos" }, { status: 400 });
    }

    // Verificar si email existe
    const supabase = getSupabaseServer();
    const { data: existente } = await supabase
      .from("vendedores")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (existente) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
    }

    // Generar código único
    let codigo = generarCodigo();
    let intentos = 0;
    while (intentos < 10) {
      const { data: dup } = await supabase
        .from("vendedores")
        .select("id")
        .eq("codigo_referido", codigo)
        .single();
      if (!dup) break;
      codigo = generarCodigo();
      intentos++;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: vendedor, error } = await supabase
      .from("vendedores")
      .insert({
        codigo_referido: codigo,
        nombre: nombre.trim(),
        email: email.trim().toLowerCase(),
        telefono: telefono?.trim() || null,
        password_hash,
        comision_pct: 10,
        estado: "activo",
      })
      .select("id, nombre, email, codigo_referido, comision_pct")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ vendedor });
  } catch (err) {
    console.error("vendedor/register error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
