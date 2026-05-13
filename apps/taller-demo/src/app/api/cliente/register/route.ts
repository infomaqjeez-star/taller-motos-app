import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.CLIENTE_JWT_SECRET || "maqjeez-cliente-secret-key-2026"
);

export async function POST(req: NextRequest) {
  try {
    const { nombre, email, telefono, dni, password, vendedor_referente_id } = await req.json();
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

    const password_hash = await bcrypt.hash(password, 8);
    const codigo = "CLI" + Math.floor(1000 + Math.random() * 9000);

    const insertData: any = {
      nombre: nombre.trim(),
      email: email.trim().toLowerCase(),
      telefono: telefono?.trim() || null,
      dni: dni?.trim() || null,
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
      .select("id, nombre, email, codigo_referido, descuento_cliente_pct, vendedor_referente_id, telefono, dni")
      .single();

    if (error || !cliente) {
      return NextResponse.json({ error: error?.message || "Error al registrar" }, { status: 500 });
    }

    // Buscar pedidos anteriores por DNI, email o telefono y asociarlos
    const dniClean = dni?.trim();
    const emailClean = email.trim().toLowerCase();
    const telClean = telefono?.trim();
    const pedidosAsociados: string[] = [];

    if (dniClean || emailClean || telClean) {
      const conditions: string[] = [];
      if (dniClean) conditions.push(`datos_cliente->>'dni' = '${dniClean}'`);
      if (emailClean) conditions.push(`datos_cliente->>'email' = '${emailClean}'`);
      if (telClean) conditions.push(`datos_cliente->>'telefono' = '${telClean}'`);

      const { data: pedidosAnteriores } = await supabase
        .from("pedidos_catalogo")
        .select("id, datos_cliente, vendedor_id")
        .or(conditions.join(", "))
        .order("created_at", { ascending: false });

      if (pedidosAnteriores && pedidosAnteriores.length > 0) {
        // Asociar cliente a los pedidos
        for (const p of pedidosAnteriores) {
          const updateData: any = { datos_cliente: { ...p.datos_cliente, cliente_id: cliente.id, numeroCliente: cliente.codigo_referido } };
          // Si el cliente eligio vendedor y el pedido no tenia, asignarlo
          if (vendedor_referente_id && !p.vendedor_id) {
            updateData.vendedor_id = vendedor_referente_id;
          }
          await supabase.from("pedidos_catalogo").update(updateData).eq("id", p.id);
          pedidosAsociados.push(p.id);
        }
      }
    }

    // Notificar al vendedor si se le asigno un cliente
    if (vendedor_referente_id) {
      const { data: vendedor } = await supabase.from("vendedores").select("nombre").eq("id", vendedor_referente_id).single();
      // Notificar al vendedor
      await supabase.from("notificaciones").insert({
        tipo: "nuevo_cliente",
        titulo: "Nuevo cliente registrado",
        mensaje: `${cliente.nombre} se registró y te eligió como vendedor. Pedidos asociados: ${pedidosAsociados.length}`,
        destinatario_rol: "vendedor",
        destinatario_id: vendedor_referente_id,
        metadata: { cliente_id: cliente.id, pedidos_asociados: pedidosAsociados },
      });
      // Notificar al admin
      await supabase.from("notificaciones").insert({
        tipo: "nuevo_cliente",
        titulo: "Nuevo cliente con vendedor",
        mensaje: `${cliente.nombre} se registró con vendedor ${vendedor?.nombre || vendedor_referente_id}.`,
        destinatario_rol: "admin",
        metadata: { cliente_id: cliente.id, vendedor_id: vendedor_referente_id },
      });
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
        vendedor_referente_id: cliente.vendedor_referente_id,
      },
      pedidos_asociados: pedidosAsociados.length,
    });
  } catch (err) {
    console.error("cliente/register error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
