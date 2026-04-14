import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, meliPost, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * POST /api/meli-claims/respond
 * Responder a un reclamo o resolverlo.
 * Body: { claim_id, message_text?, meli_account_id, action: "message" | "resolve" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claim_id, message_text, meli_account_id, action } = body;

    if (!claim_id || !meli_account_id || !action) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const { data: account } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("id", meli_account_id)
      .eq("user_id", userId)
      .single();

    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });

    const token = await getValidToken(account as LinkedMeliAccount);
    if (!token) return NextResponse.json({ error: "Token invalido" }, { status: 401 });

    if (action === "message") {
      if (!message_text?.trim()) {
        return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
      }

      // Intentar ambos paths
      let result = await meliPost(
        `/post-purchase/v2/claims/${claim_id}/messages`,
        token,
        { message: message_text.trim(), role: "respondent" }
      );

      if (!result.ok) {
        result = await meliPost(
          `/post-sale/v2/claims/${claim_id}/messages`,
          token,
          { message: message_text.trim(), role: "respondent" }
        );
      }

      if (result.ok) {
        return NextResponse.json({ status: "ok", data: result.data });
      }
      return NextResponse.json({ error: result.error || "Error al enviar mensaje" }, { status: 500 });
    }

    if (action === "resolve") {
      let result = await meliPost(
        `/post-purchase/v2/claims/${claim_id}/resolve`,
        token,
        {}
      );

      if (!result.ok) {
        result = await meliPost(
          `/post-sale/v2/claims/${claim_id}/resolve`,
          token,
          {}
        );
      }

      if (result.ok) {
        return NextResponse.json({ status: "ok", data: result.data });
      }
      return NextResponse.json({ error: result.error || "Error al resolver" }, { status: 500 });
    }

    return NextResponse.json({ error: "Accion no valida" }, { status: 400 });
  } catch (error) {
    console.error("[meli-claims/respond] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
