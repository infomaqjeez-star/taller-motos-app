import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado dinÃ¡mico - evita error de generaciÃ³n estÃ¡tica
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Cliente Supabase Admin
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

/**
 * GET /api/meli-accounts
 * 
 * Obtiene todas las cuentas de Mercado Libre vinculadas al usuario autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    // Obtener el usuario actual de la sesiÃ³n
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Si no hay usuario autenticado, devolver array vacÃ­o
    if (!userId) {
      return NextResponse.json([]);
    }

    // Obtener las cuentas de Mercado Libre del usuario
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, is_active, created_at, updated_at")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (accountsError) {
      console.error("[meli-accounts] Error al obtener cuentas:", accountsError);
      return NextResponse.json(
        { error: "Error al obtener cuentas" },
        { status: 500 }
      );
    }

    // Formatear la respuesta
    const formattedAccounts = (accounts || []).map((account) => ({
      id: account.id,
      meli_user_id: String(account.meli_user_id),
      nickname: account.meli_nickname,
      is_active: account.is_active,
      created_at: account.created_at,
      updated_at: account.updated_at,
    }));

    return NextResponse.json(formattedAccounts);
  } catch (error) {
    console.error("[meli-accounts] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/meli-accounts
 * 
 * Actualiza el nickname de una cuenta de Mercado Libre.
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, nickname } = body;

    if (!id || !nickname) {
      return NextResponse.json(
        { error: "ID y nickname son requeridos" },
        { status: 400 }
      );
    }

    // Obtener el usuario actual de la sesiÃ³n
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Actualizar el nickname de la cuenta
    const { data, error } = await supabase
      .from("linked_meli_accounts")
      .update({ meli_nickname: nickname, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("[meli-accounts] Error al actualizar cuenta:", error);
      return NextResponse.json(
        { error: "Error al actualizar cuenta" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: data.id,
      meli_user_id: String(data.meli_user_id),
      nickname: data.meli_nickname,
      is_active: data.is_active,
    });
  } catch (error) {
    console.error("[meli-accounts] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/meli-accounts
 * 
 * Desactiva (elimina lÃ³gicamente) una cuenta de Mercado Libre.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID es requerido" },
        { status: 400 }
      );
    }

    // Obtener el usuario actual de la sesiÃ³n
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Desactivar la cuenta
    const { error } = await supabase
      .from("linked_meli_accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("[meli-accounts] Error al desactivar cuenta:", error);
      return NextResponse.json(
        { error: "Error al desactivar cuenta" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[meli-accounts] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
