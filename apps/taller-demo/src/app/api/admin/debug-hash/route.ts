import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: Request) {
  try {
    const supabase = getSupabaseServer();
    const { data: admin } = await supabase
      .from("admins_catalogo")
      .select("id, email, password_hash, estado, totp_enabled")
      .eq("email", "vianferreterias@gmail.com")
      .single();

    if (!admin) {
      return NextResponse.json({ error: "Admin no encontrado" }, { status: 404 });
    }

    const testPasswords = ["Eze12ar43215g", "Eze12ar432156"];
    const results = await Promise.all(
      testPasswords.map(async (pwd) => ({
        password: pwd,
        valid: await bcrypt.compare(pwd, admin.password_hash),
      }))
    );

    return NextResponse.json({
      email: admin.email,
      estado: admin.estado,
      totp_enabled: admin.totp_enabled,
      hashLength: admin.password_hash?.length,
      hashPrefix: admin.password_hash?.substring(0, 20) + "...",
      bcryptTests: results,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
