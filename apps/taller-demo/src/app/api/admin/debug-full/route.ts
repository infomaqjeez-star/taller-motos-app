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

    // Listar TODOS los admins
    const { data: allAdmins, error: listError } = await supabase
      .from("admins_catalogo")
      .select("id, nombre, email, estado, totp_enabled, password_hash");

    if (listError) {
      return NextResponse.json({
        env_ok: true,
        connection_error: listError.message,
        all_admins: null,
      });
    }

    // Probar bcrypt con cada admin
    const testPassword = "Eze12ar43215g";
    const bcryptTests: any[] = [];
    for (const admin of allAdmins || []) {
      const valid = await bcrypt.compare(testPassword, (admin as any).password_hash || "");
      bcryptTests.push({ email: admin.email, estado: admin.estado, totp_enabled: admin.totp_enabled, bcrypt_valid: valid });
    }

    return NextResponse.json({
      env_ok: true,
      supabase_url: url,
      all_admins_count: allAdmins?.length || 0,
      all_admins: allAdmins?.map((a: any) => ({ id: a.id, nombre: a.nombre, email: a.email, estado: a.estado, totp_enabled: a.totp_enabled })),
      bcrypt_tests: bcryptTests,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: "Excepcion",
      message: err.message,
      stack: err.stack,
    });
  }
}
