import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      return NextResponse.json({
        env_ok: false,
        has_url: !!url,
        has_key: !!key,
        url_preview: url ? url.substring(0, 30) + "..." : null,
      });
    }

    const supabase = createClient(url, key);

    // Probar conexion basica
    const { data: allAdmins, error: listError } = await supabase
      .from("admins_catalogo")
      .select("id, nombre, email, estado, totp_enabled");

    if (listError) {
      return NextResponse.json({
        env_ok: true,
        connection_error: listError.message,
      });
    }

    // Buscar admin especifico
    const { data: admin, error: findError } = await supabase
      .from("admins_catalogo")
      .select("id, nombre, email, password_hash, estado, totp_enabled, totp_secret")
      .eq("email", "vianferreterias@gmail.com")
      .maybeSingle();

    if (findError) {
      return NextResponse.json({
        env_ok: true,
        all_admins_count: allAdmins?.length,
        find_error: findError.message,
      });
    }

    // Verificar hash
    let hashValid = false;
    if (admin?.password_hash) {
      hashValid = await bcrypt.compare("Eze12ar43215g", admin.password_hash);
    }

    return NextResponse.json({
      env_ok: true,
      all_admins_count: allAdmins?.length,
      all_admins_emails: allAdmins?.map((a: any) => a.email),
      admin_found: !!admin,
      admin_email: admin?.email,
      admin_estado: admin?.estado,
      admin_totp_enabled: admin?.totp_enabled,
      has_password_hash: !!admin?.password_hash,
      hash_length: admin?.password_hash?.length,
      hash_valid: hashValid,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: "Excepcion",
      message: err.message,
      stack: err.stack,
    });
  }
}
