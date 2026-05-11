import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Listar todas las variables de entorno que contengan "SUPA" o "SERVICE"
  const relevantEnvKeys = Object.keys(process.env).filter(k =>
    k.includes("SUPA") || k.includes("SERVICE") || k.includes("supabase")
  );

  const result: Record<string, any> = {
    env: {
      has_url: !!url,
      has_anon: !!anonKey,
      has_service: !!serviceKey,
      url_preview: url?.slice(0, 50),
      anon_preview: anonKey ? anonKey.slice(0, 20) + "..." : null,
      service_preview: serviceKey ? serviceKey.slice(0, 20) + "..." : null,
      service_length: serviceKey?.length ?? 0,
      relevant_env_keys: relevantEnvKeys,
    },
  };

  // Test con service role (sin RLS)
  if (url && serviceKey) {
    const sb = createClient(url, serviceKey);

    // 1) Count total
    const { count, error: countErr } = await sb.from("vendedores").select("*", { count: "exact", head: true });
    result.service_count = count;
    result.service_count_error = countErr?.message ?? null;

    // 2) Select completo
    const { data, error: selErr } = await sb.from("vendedores").select("id, nombre, email, codigo_referido, comision_pct, nivel_vendedor, estado, created_at").limit(5);
    result.service_rows = data;
    result.service_select_error = selErr?.message ?? null;

    // 3) Probar con columnas opcionales
    const { data: dataExt, error: extErr } = await sb.from("vendedores").select("id, nombre, lider_id, es_gerente").limit(1);
    result.service_optional_cols = dataExt;
    result.service_optional_cols_error = extErr?.message ?? null;
  }

  // Test con anon key (con RLS — igual que hace el server component)
  if (url && anonKey) {
    const sb = createClient(url, anonKey);
    const { data, error } = await sb.from("vendedores").select("id, nombre, email").limit(5);
    result.anon_rows = data;
    result.anon_error = error?.message ?? null;
    result.anon_count = data?.length ?? 0;
  }

  return NextResponse.json(result);
}
