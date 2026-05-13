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
    const emailNorm = email.trim().toLowerCase();

    // Paralelizar las 3 validaciones en vez de hacerlas en serie
    const [dniCheck, vendedorCheck, clienteCheck] = await Promise.all([
      dni_cuit
        ? supabase.from("vendedores").select("id").eq("dni_cuit", dni_cuit.trim()).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase.from("vendedores").select("id").eq("email", emailNorm).maybeSingle(),
      supabase.from("clientes_catalogo").select("id").eq("email", emailNorm).maybeSingle(),
    ]);

    if (dniCheck.data) {
      return NextResponse.json({ error: "El DNI/CUIT ya está registrado como vendedor" }, { status: 409 });
    }
    if (vendedorCheck.data) {
      return NextResponse.json({ error: "El email ya está registrado como vendedor" }, { status: 409 });
    }
    if (clienteCheck.data) {
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

    const password_hash = await bcrypt.hash(password, 8);

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
