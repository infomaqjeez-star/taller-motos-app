import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken, type LinkedMeliAccount } from "@/lib/meli";

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

        const headers = { Authorization: `Bearer ${token}` };
        const meliId = String(account.meli_user_id);

        // Intentar multiples endpoints de claims
        const claimsPaths = [
          `/post-purchase/v2/claims/search?role=seller&status=opened&limit=50`,
          `/v1/claims/search?status=opened&limit=50`,
          `/post-sale/v2/claims/search?role=seller&status=opened&limit=50`,
        ];

        let claimsData: any = null;
        let usedPath = "";

        for (const path of claimsPaths) {
          try {
            console.log(`[meli-claims] [${account.meli_nickname}] Intentando ${path}`);
            const res = await fetch(`https://api.mercadolibre.com${path}`, {
              headers,
              signal: AbortSignal.timeout(10000),
            });
            if (res.ok) {
              claimsData = await res.json();
              usedPath = path;
              console.log(`[meli-claims] [${account.meli_nickname}] OK con ${path}: ${JSON.stringify(claimsData).substring(0, 200)}`);
              break;
            } else {
              const errText = await res.text().catch(() => "");
              console.log(`[meli-claims] [${account.meli_nickname}] ${res.status} en ${path}: ${errText.substring(0, 100)}`);
            }
          } catch (e) {
            console.log(`[meli-claims] [${account.meli_nickname}] Error en ${path}: ${(e as Error).message}`);
          }
        }

        if (!claimsData) {
          console.log(`[meli-claims] [${account.meli_nickname}] No se pudieron obtener reclamos`);
          continue;
        }

        const claims = claimsData.data || claimsData.results || claimsData.claims || [];
        console.log(`[meli-claims] [${account.meli_nickname}] ${claims.length} reclamos encontrados`);

        for (const claim of claims) {
          const claimId = claim.id || claim.claim_id;
          const isMediation = claim.stage === "mediation" || claim.type === "mediation";

          // Intentar obtener detalle con mensajes
          let messages: any[] = [];
          try {
            for (const detailPath of [
              `/post-purchase/v2/claims/${claimId}`,
              `/v1/claims/${claimId}`,
            ]) {
              const detRes = await fetch(`https://api.mercadolibre.com${detailPath}`, {
                headers,
                signal: AbortSignal.timeout(8000),
              });
              if (detRes.ok) {
                const detail = await detRes.json();
                messages = detail.messages || [];
                break;
              }
            }
          } catch { /* skip detail */ }

          allClaims.push({
            id: claimId,
            claim_id: claimId,
            meli_account_id: account.id,
            meli_user_id: meliId,
            account_nickname: account.meli_nickname,
            type: isMediation ? "mediation" : "claim",
            status: claim.status || "opened",
            stage: claim.stage || "claim",
            reason_id: claim.reason_id || "",
            reason: claim.reason || claim.reason_id || "Reclamo abierto",
            resource_id: claim.resource_id || claim.order_id || "",
            date_created: claim.date_created || new Date().toISOString(),
            last_updated: claim.last_updated || claim.date_created,
            buyer: {
              id: claim.players?.complainant?.user_id || claim.complainant?.id || 0,
              nickname: claim.players?.complainant?.nickname || claim.complainant?.nickname || "Comprador",
            },
            messages: messages.map((msg: any) => ({
              id: msg.id || String(Math.random()),
              sender_role: msg.role || msg.sender_role || "unknown",
              text: msg.message || msg.text || "",
              date_created: msg.date_created || "",
              attachments: msg.attachments || [],
            })),
            resolution: claim.resolution || null,
            meli_accounts: { nickname: account.meli_nickname },
          });
        }
      } catch (err) {
        console.error(`[meli-claims] Error cuenta ${account.meli_nickname}:`, err);
      }
    }

    allClaims.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
    console.log(`[meli-claims] Total reclamos: ${allClaims.length}`);
    return NextResponse.json(allClaims);
  } catch (error) {
    console.error("[meli-claims] Error:", error);
    return NextResponse.json([]);
  }
}
