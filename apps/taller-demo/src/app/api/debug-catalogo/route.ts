import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("catalog_products")
      .select("sku, name, catalog_price, image_url, active")
      .eq("active", true)
      .limit(3);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return NextResponse.json({
      ok: !error,
      error: error?.message ?? null,
      supabaseUrl: url,
      hasServiceKey,
      hasAnonKey,
      sample: data,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
