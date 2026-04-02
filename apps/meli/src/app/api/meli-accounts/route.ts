import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[meli-accounts] ❌ Falta SUPABASE_URL o SERVICE_ROLE_KEY");
      return NextResponse.json([], { status: 200 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data, error } = await supabase
      .from("meli_accounts")
      .select("id, meli_user_id, nickname, expires_at, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[meli-accounts] ❌ Error consultando BD:", error.message);
      // Devolver array vacío en vez de error 500
      return NextResponse.json([], { status: 200 });
    }

    console.log("[meli-accounts] ✅ Encontradas", data?.length ?? 0, "cuentas");
    return NextResponse.json(data || []);
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error("[meli-accounts] ❌ Error crítico:", errMsg);
    // Devolver array vacío en vez de error 500
    return NextResponse.json([], { status: 200 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, status, nickname } = body as { id?: string; status?: string; nickname?: string };
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[meli-accounts PATCH] ❌ Falta SUPABASE_URL o SERVICE_ROLE_KEY");
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (status)   update.status   = status;
    if (nickname) update.nickname = nickname;

    const { error } = await supabase
      .from("meli_accounts")
      .update(update)
      .eq(/^\d+$/.test(id) ? "meli_user_id" : "id", id);

    if (error) {
      console.error("[meli-accounts PATCH] ❌ Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log("[meli-accounts PATCH] ✅ Cuenta actualizada:", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meli-accounts PATCH] ❌ Error crítico:", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[meli-accounts DELETE] ❌ Falta SUPABASE_URL o SERVICE_ROLE_KEY");
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error } = await supabase
      .from("meli_accounts")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[meli-accounts DELETE] ❌ Error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.log("[meli-accounts DELETE] ✅ Cuenta eliminada:", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[meli-accounts DELETE] ❌ Error crítico:", (err as Error).message);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
