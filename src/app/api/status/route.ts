import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.json({
      ok: false,
      error: "Variables de entorno faltantes",
      url:  url  ? "OK" : "FALTA NEXT_PUBLIC_SUPABASE_URL",
      key:  key  ? "OK" : "FALTA NEXT_PUBLIC_SUPABASE_ANON_KEY",
    });
  }

  try {
    const supabase = createClient(url, key);
    const { data, error, count } = await supabase
      .from("reparaciones")
      .select("id, client_name, entry_date", { count: "exact" })
      .limit(5);

    if (error) {
      return NextResponse.json({
        ok: false,
        error: error.message,
        code: error.code,
        hint: error.hint,
        url:  url.slice(0, 40),
        key:  key.slice(0, 25) + "...",
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Conexión exitosa",
      totalRows: count,
      sample: data,
      url: url.slice(0, 40),
      key: key.slice(0, 25) + "...",
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: String(e),
    });
  }
}
