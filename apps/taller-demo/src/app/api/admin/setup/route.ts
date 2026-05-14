import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== "Bearer maqjeez-setup-admin-2026") {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = getSupabaseServer();

    // Verificar si la tabla existe
    const { error: testError } = await supabase
      .from("admins_catalogo")
      .select("id", { head: true })
      .limit(1);

    if (testError && testError.message?.includes("does not exist")) {
      return NextResponse.json({
        error: "La tabla admins_catalogo no existe. Creala primero en Supabase SQL Editor.",
        sql: `
CREATE TABLE IF NOT EXISTS admins_catalogo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  estado TEXT DEFAULT 'activo',
  totp_enabled BOOLEAN DEFAULT false,
  totp_secret TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE admins_catalogo ENABLE ROW LEVEL SECURITY;
CREATE POLICY admins_all ON admins_catalogo FOR ALL USING (auth.role() = 'authenticated');
        `,
      }, { status: 400 });
    }

    // Verificar si ya existe el admin
    const { data: existing } = await supabase
      .from("admins_catalogo")
      .select("id")
      .eq("email", "vianferreteria@gmail.com")
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "El admin ya existe",
        email: "vianferreteria@gmail.com",
      });
    }

    // Crear admin con contraseña por defecto
    const passwordHash = await bcrypt.hash("admin123", 10);
    const { data, error } = await supabase
      .from("admins_catalogo")
      .insert({
        nombre: "Admin",
        email: "vianferreteria@gmail.com",
        password_hash: passwordHash,
        estado: "activo",
        totp_enabled: false,
      })
      .select("id, nombre, email")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Admin creado correctamente",
      admin: data,
      defaultPassword: "admin123",
    });
  } catch (err: any) {
    console.error("admin/setup error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
