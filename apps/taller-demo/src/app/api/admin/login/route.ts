import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { getSupabaseServer } from "@/lib/supabase-server";

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "fallback-secret"
);

async function createTempToken(adminId: string) {
  return new SignJWT({ admin_id: adminId, step: "2fa" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(SECRET);
}

async function createAdminToken(adminId: string, email: string) {
  return new SignJWT({ admin_id: adminId, email, type: "admin_session" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(SECRET);
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    const { data: admin, error } = await supabase
      .from("admins_catalogo")
      .select("id, nombre, email, password_hash, estado, totp_enabled, totp_secret")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (error || !admin) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (admin.estado !== "activo") {
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 401 });
    }

    let valid = await bcrypt.compare(password, admin.password_hash);
    // Fallback: si bcrypt falla y el hash NO tiene formato bcrypt, comparar como texto plano (modo debug)
    if (!valid && !admin.password_hash.startsWith("$2")) {
      valid = password === admin.password_hash;
    }
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Si 2FA está activo, devolver tempToken para verificacion en paso 2
    if (admin.totp_enabled && admin.totp_secret) {
      const tempToken = await createTempToken(admin.id);
      return NextResponse.json({
        requires2FA: true,
        tempToken,
      });
    }

    const adminToken = await createAdminToken(admin.id, admin.email);
    return NextResponse.json({
      admin: {
        id: admin.id,
        nombre: admin.nombre,
        email: admin.email,
      },
      adminToken,
    });
  } catch (err) {
    console.error("admin/login error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
