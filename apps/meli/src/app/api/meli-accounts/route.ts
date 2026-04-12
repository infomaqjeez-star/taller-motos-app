import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado dinámico - evita error de generación estática
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
    // Obtener el usuario actual de la sesión
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Si no hay usuario autenticado, devolver array vacío
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
 * Acepta tanto 'id' (UUID) como 'meli_user_id' (número de MeLi)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, meli_user_id, nickname } = body;

    if ((!id && !meli_user_id) || !nickname) {
      return NextResponse.json(
        { error: "ID (o meli_user_id) y nickname son requeridos" },
        { status: 400 }
      );
    }

    // Obtener el usuario actual de la sesión
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

    // Construir la query de actualización
    let query = supabase
      .from("linked_meli_accounts")
      .update({ meli_nickname: nickname, updated_at: new Date().toISOString() })
      .eq("user_id", userId);
    
    // Usar id o meli_user_id según lo que se proporcione
    if (id) {
      query = query.eq("id", id);
    } else if (meli_user_id) {
      query = query.eq("meli_user_id", meli_user_id);
    }

    const { data, error } = await query.select().single();

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
 * Desactiva (elimina lógicamente) una cuenta de Mercado Libre.
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

    // Obtener el usuario actual de la sesión
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
      console.error("[meli-accounts DELETE] No autorizado - sin userId");
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    console.log(`[meli-accounts DELETE] Desactivando cuenta ${id} para usuario ${userId}`);

    // Desactivar la cuenta
    const { data, error } = await supabase
      .from("linked_meli_accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId)
      .select();

    if (error) {
      console.error("[meli-accounts DELETE] Error al desactivar cuenta:", error);
      return NextResponse.json(
        { error: "Error al desactivar cuenta" },
        { status: 500 }
      );
    }

    console.log(`[meli-accounts DELETE] Cuenta desactivada exitosamente:`, data);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[meli-accounts DELETE] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
