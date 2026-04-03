import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

// Cliente Supabase con service_role
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createClient(url, key);
};

// ── GET: Listar cuentas vinculadas de un usuario ──────────────
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user_id parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Consultar usando la vista segura (no devuelve tokens)
    const { data, error } = await supabase
      .from("user_meli_accounts_summary")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[LINKED-ACCOUNTS GET] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ accounts: data || [] });
  } catch (err) {
    console.error("[LINKED-ACCOUNTS GET] Error crítico:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// ── PATCH: Desactivar una cuenta vinculada ────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_id, user_id } = body;

    if (!account_id || !user_id) {
      return NextResponse.json(
        { error: "Missing account_id or user_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Usar la función RPC para desactivar (con verificación de propiedad)
    const { data: success, error } = await supabase.rpc(
      "deactivate_linked_account",
      {
        p_account_id: account_id,
        p_user_id: user_id,
      }
    );

    if (error) {
      console.error("[LINKED-ACCOUNTS PATCH] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Account not found or not owned by user" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: "Account deactivated" });
  } catch (err) {
    console.error("[LINKED-ACCOUNTS PATCH] Error crítico:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// ── DELETE: Eliminar una cuenta vinculada ─────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { account_id, user_id } = body;

    if (!account_id || !user_id) {
      return NextResponse.json(
        { error: "Missing account_id or user_id" },
        { status: 400 }
      );
    }

    const supabase = getSupabase();

    // Eliminar solo si pertenece al usuario (RLS + verificación extra)
    const { error } = await supabase
      .from("linked_meli_accounts")
      .delete()
      .eq("id", account_id)
      .eq("user_id", user_id);

    if (error) {
      console.error("[LINKED-ACCOUNTS DELETE] Error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Account deleted" });
  } catch (err) {
    console.error("[LINKED-ACCOUNTS DELETE] Error crítico:", err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
