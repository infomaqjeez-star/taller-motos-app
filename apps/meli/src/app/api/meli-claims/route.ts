import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, meliGet, type LinkedMeliAccount } from "@/lib/meli";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

/**
 * GET /api/meli-claims
 * Obtiene reclamos y mediaciones abiertos de todas las cuentas MeLi.
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) return NextResponse.json([]);

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) return NextResponse.json([]);

    const allClaims: any[] = [];

    for (const account of accounts) {
      try {
        const token = await getValidToken(account as LinkedMeliAccount);
        if (!token) continue;

        // Intentar ambos paths de la API
        let claimsData: any = null;
        
        // Path 1: post-purchase
        claimsData = await meliGet(
          `/post-purchase/v2/claims/search?role=seller&status=opened&limit=50`,
          token, 15000
        );

        // Fallback path 2: post-sale
        if (!claimsData) {
          claimsData = await meliGet(
            `/post-sale/v2/claims/search?role=seller&status=opened&limit=50`,
            token, 15000
          );
        }

        if (!claimsData) continue;
        const claims = claimsData.data || claimsData.results || [];

        for (const claim of claims) {
          // Obtener detalle del claim con mensajes
          let detail: any = null;
          detail = await meliGet(`/post-purchase/v2/claims/${claim.id}`, token, 10000);
          if (!detail) {
            detail = await meliGet(`/post-sale/v2/claims/${claim.id}`, token, 10000);
          }

          const messages = detail?.messages || [];
          const isMediation = detail?.stage === "mediation" || claim.stage === "mediation";

          allClaims.push({
            id: claim.id,
            claim_id: claim.id,
            meli_account_id: account.id,
            meli_user_id: String(account.meli_user_id),
            account_nickname: account.meli_nickname,
            type: isMediation ? "mediation" : "claim",
            status: detail?.status || claim.status || "opened",
            stage: detail?.stage || claim.stage || "claim",
            reason_id: detail?.reason_id || claim.reason_id,
            reason: detail?.reason || claim.reason || "Sin razon especificada",
            resource_id: detail?.resource_id || claim.resource_id,
            date_created: detail?.date_created || claim.date_created,
            last_updated: detail?.last_updated || claim.last_updated,
            buyer: {
              id: detail?.players?.complainant?.user_id || claim.players?.complainant?.user_id,
              nickname: detail?.players?.complainant?.nickname || "Comprador",
            },
            messages: messages.map((msg: any) => ({
              id: msg.id,
              sender_role: msg.role || msg.sender_role || "unknown",
              text: msg.message || msg.text || "",
              date_created: msg.date_created,
              attachments: msg.attachments || [],
            })),
            resolution: detail?.resolution || null,
            meli_accounts: { nickname: account.meli_nickname },
          });
        }
      } catch (err) {
        console.error(`[meli-claims] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    allClaims.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    return NextResponse.json(allClaims);
  } catch (error) {
    console.error("[meli-claims] Error:", error);
    return NextResponse.json([]);
  }
}
