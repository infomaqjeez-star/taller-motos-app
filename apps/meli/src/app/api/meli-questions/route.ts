import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Función para refrescar token
async function refreshToken(account: any): Promise<string | null> {
  try {
    console.log(`[meli-questions] Refrescando token para ${account.meli_nickname}...`);
    
    const response = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: process.env.APPJEEZ_MELI_APP_ID || "",
        client_secret: process.env.APPJEEZ_MELI_SECRET_KEY || "",
        refresh_token: account.refresh_token_enc,
      }),
    });

    if (!response.ok) {
      console.error(`[meli-questions] Error refrescando token: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    // Actualizar en base de datos
    await supabase
      .from("linked_meli_accounts")
      .update({
        access_token_enc: data.access_token,
        refresh_token_enc: data.refresh_token,
        token_expiry_date: new Date(Date.now() + data.expires_in * 1000).toISOString(),
      })
      .eq("id", account.id);

    console.log(`[meli-questions] Token refrescado para ${account.meli_nickname}`);
    return data.access_token;
  } catch (error) {
    console.error(`[meli-questions] Error refrescando token:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    
    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const { data: accounts } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([]);
    }

    const allQuestions: any[] = [];

    for (const account of accounts) {
      try {
        let token = account.access_token_enc;
        
        // Verificar si el token está vencido
        const isExpired = account.token_expiry_date && 
          new Date(account.token_expiry_date).getTime() < Date.now() + 5 * 60 * 1000;
        
        if (isExpired || !token?.startsWith('APP_USR')) {
          // Intentar refrescar el token
          const newToken = await refreshToken(account);
          if (newToken) {
            token = newToken;
          } else {
            console.log(`[meli-questions] No se pudo refrescar token para ${account.meli_nickname}`);
            continue;
          }
        }

        const headers = { Authorization: `Bearer ${token}` };
        const url = `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&status=UNANSWERED&limit=50`;
        
        const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
        
        // Si da 401, intentar refrescar y reintentar
        if (res.status === 401) {
          const newToken = await refreshToken(account);
          if (newToken) {
            const retryRes = await fetch(url, { 
              headers: { Authorization: `Bearer ${newToken}` }, 
              signal: AbortSignal.timeout(15000) 
            });
            if (retryRes.ok) {
              const data = await retryRes.json();
              const questions = data.questions || [];
              
              for (const q of questions) {
                allQuestions.push({
                  meli_question_id: q.id,
                  meli_account_id: account.id,
                  item_id: q.item_id,
                  item_title: q.item_id,
                  item_thumbnail: "",
                  buyer_id: q.from?.id,
                  buyer_nickname: q.from?.nickname || "Comprador",
                  question_text: q.text,
                  status: q.status,
                  date_created: q.date_created,
                  answer_text: null,
                  answer_date: null,
                  meli_accounts: { nickname: account.meli_nickname },
                });
              }
            }
          }
        } else if (res.ok) {
          const data = await res.json();
          const questions = data.questions || [];
          
          for (const q of questions) {
            allQuestions.push({
              meli_question_id: q.id,
              meli_account_id: account.id,
              item_id: q.item_id,
              item_title: q.item_id,
              item_thumbnail: "",
              buyer_id: q.from?.id,
              buyer_nickname: q.from?.nickname || "Comprador",
              question_text: q.text,
              status: q.status,
              date_created: q.date_created,
              answer_text: null,
              answer_date: null,
              meli_accounts: { nickname: account.meli_nickname },
            });
          }
        }
      } catch (e) {
        console.error(`[meli-questions] Error cuenta ${account.meli_nickname}:`, e);
      }
    }

    allQuestions.sort((a, b) => 
      new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
    );
    
    return NextResponse.json(allQuestions);
  } catch (error) {
    console.error("[meli-questions] Error fatal:", error);
    return NextResponse.json([]);
  }
}
