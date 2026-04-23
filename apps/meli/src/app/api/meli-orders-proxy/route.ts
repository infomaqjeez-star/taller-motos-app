import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const dynamic = 'force-dynamic';

/**
 * POST /api/meli-orders-proxy
 * 
 * Proxy para obtener órdenes de MeLi desde el servidor
 * Evita problemas de CORS haciendo las llamadas desde el backend
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    // Obtener usuario del token
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener parámetros de la solicitud
    const { accountId, dateFrom, dateTo, status } = await request.json();

    // Obtener cuenta
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("id", accountId)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (accountError || !account) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    // Obtener token válido
    const token = await getValidToken(account);
    
    if (!token) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    // Construir URL de MeLi
    const params = new URLSearchParams({
      seller: account.meli_user_id,
      limit: "200",
    });

    if (dateFrom) params.append("order.date_created.from", dateFrom);
    if (dateTo) params.append("order.date_created.to", dateTo);
    if (status && status !== "all") params.append("order.status", status);

    // Llamar a API de MeLi
    const response = await fetch(
      `https://api.mercadolibre.com/orders/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Error MeLi: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      orders: data.results || [],
      total: data.paging?.total || 0,
      account: {
        id: account.id,
        nickname: account.meli_nickname,
        sellerId: account.meli_user_id,
      },
    });

  } catch (err: any) {
    console.error("[meli-orders-proxy] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
