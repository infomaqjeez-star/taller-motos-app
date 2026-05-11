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
    const { nombre, email, telefono, password, dni_cuit } = await req.json();
    if (!nombre || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña requeridos" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Validar DNI/CUIT si se proporciona
    if (dni_cuit) {
      const { data: dupDni } = await supabase
        .from("vendedores")
        .select("id")
        .eq("dni_cuit", dni_cuit.trim())
        .single();

      if (dupDni) {
        return NextResponse.json({ error: "El DNI/CUIT ya está registrado como vendedor" }, { status: 409 });
      }
    }

    // Verificar si email existe en vendedores
    const { data: existenteVendedor } = await supabase
      .from("vendedores")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (existenteVendedor) {
      return NextResponse.json({ error: "El email ya está registrado como vendedor" }, { status: 409 });
    }

    // Verificar si email existe en clientes (no puede ser vendedor si es cliente)
    const { data: existenteCliente } = await supabase
      .from("clientes_catalogo")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (existenteCliente) {
      return NextResponse.json({ error: "Este email ya está registrado como cliente. No podés ser vendedor con el mismo email." }, { status: 409 });
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
        dni_cuit: dni_cuit?.trim() || null,
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
