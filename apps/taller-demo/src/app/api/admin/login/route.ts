import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    // Dynamic imports para no crashear el modulo si falta alguna lib
    const [{ default: bcrypt }, { SignJWT }] = await Promise.all([
      import("bcryptjs"),
      import("jose"),
    ]);

    const SECRET = new TextEncoder().encode(
      process.env.ADMIN_JWT_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "fallback-secret"
    );

    const createTempToken = async (adminId: string) => {
      return new SignJWT({ admin_id: adminId, step: "2fa" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("5m")
        .sign(SECRET);
    };

    const createAdminToken = async (adminId: string, email: string) => {
      return new SignJWT({ admin_id: adminId, email, type: "admin_session" })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("365d")
        .sign(SECRET);
    };

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
      console.error("[admin/login] supabase error:", error);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    if (admin.estado !== "activo") {
      return NextResponse.json({ error: "Cuenta inactiva" }, { status: 401 });
    }

    let valid = false;
    try {
      valid = await bcrypt.compare(password, admin.password_hash);
    } catch {
      valid = false;
    }
    if (!valid && !admin.password_hash.startsWith("$2")) {
      valid = password === admin.password_hash;
    }
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

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
  } catch (err: any) {
    console.error("[admin/login] fatal error:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
