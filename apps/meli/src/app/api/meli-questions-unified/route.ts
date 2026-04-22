import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Crear cliente solo si las variables están definidas
const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Forzar renderizado dinámico
export const dynamic = 'force-dynamic';

// Función para esperar N ms
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función para hacer fetch con retry y backoff
async function fetchWithRetry(
  url: string, 
  options: RequestInit, 
  maxRetries = 3,
  accountName: string
): Promise<Response | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[meli-questions-unified] [${accountName}] Intento ${attempt}/${maxRetries}`);
      
      const res = await fetch(url, options);
      
      // Si es 502, 503, o 429, esperar y reintentar
      if (res.status === 502 || res.status === 503 || res.status === 429) {
        const waitTime = attempt * 1000;
        console.log(`[meli-questions-unified] [${accountName}] ⚠️ Error ${res.status}, esperando ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      
      return res;
    } catch (err: any) {
      console.error(`[meli-questions-unified] [${accountName}] ❌ Error en intento ${attempt}:`, err.message);
      
      if (attempt < maxRetries) {
        const waitTime = attempt * 1000;
        await sleep(waitTime);
      }
    }
  }
  
  console.error(`[meli-questions-unified] [${accountName}] ❌ Todos los intentos fallaron`);
  return null;
}

/**
 * GET /api/meli-questions-unified
 * 
 * Obtiene preguntas de todas las cuentas de Mercado Libre del usuario
 * Se ejecuta en el servidor para evitar problemas de CORS
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar que Supabase esté configurado
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado" },
        { status: 500 }
      );
    }

    // Obtener el usuario actual
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
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener cuentas del usuario
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError || !accounts || accounts.length === 0) {
      return NextResponse.json({ questions: [], accounts: [] });
    }

    // Obtener preguntas de cada cuenta
    const results = await Promise.allSettled(
      accounts.map(async (account) => {
        try {
          // Obtener token válido
          const token = await getValidToken(account as any);
          
          if (!token) {
            console.log(`[meli-questions] ❌ No hay token para ${account.meli_nickname}`);
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: account.meli_user_id,
              questions: [],
              total: 0,
              error: "token_expired",
            };
          }

          // Llamar a API de MeLi con retry
          const response = await fetchWithRetry(
            `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&api_version=4&limit=100`,
            {
              headers: { Authorization: `Bearer ${token}` },
              next: { revalidate: 0 },
            },
            3,
            account.meli_nickname
          );

          if (!response) {
            console.error(`[meli-questions] ❌ Todos los intentos fallaron para ${account.meli_nickname}`);
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: account.meli_user_id,
              questions: [],
              total: 0,
              error: "max_retries_exceeded",
            };
          }

          if (!response.ok) {
            console.error(`[meli-questions] ❌ Error API para ${account.meli_nickname}:`, response.status);
            return {
              accountId: account.id,
              nickname: account.meli_nickname,
              sellerId: account.meli_user_id,
              questions: [],
              total: 0,
              error: `HTTP ${response.status}`,
            };
          }

          const data = await response.json();
          
          console.log(`[meli-questions] ✅ ${account.meli_nickname}: ${data.questions?.length || 0} preguntas (total: ${data.total || 0})`);

          // Obtener información de los ítems (imágenes, títulos) para cada pregunta
          const itemIds = [...new Set((data.questions || []).map((q: any) => q.item_id))];
          const itemCache: Record<string, any> = {};
          
          // Obtener detalles de ítems en lotes de 20 (límite de la API de MeLi)
          for (let i = 0; i < itemIds.length; i += 20) {
            const batch = itemIds.slice(i, i + 20);
            try {
              const itemsResponse = await fetch(
                `https://api.mercadolibre.com/items?ids=${batch.join(',')}`,
                {
                  headers: { Authorization: `Bearer ${token}` },
                  next: { revalidate: 0 },
                }
              );
              
              if (itemsResponse.ok) {
                const itemsData = await itemsResponse.json();
                itemsData.forEach((item: any) => {
                  if (item.code === 200 && item.body) {
                    itemCache[item.body.id] = {
                      title: item.body.title,
                      thumbnail: item.body.thumbnail,
                      pictures: item.body.pictures?.[0]?.url || item.body.thumbnail,
                      permalink: item.body.permalink,
                    };
                  }
                });
              }
            } catch (e) {
              console.warn(`[meli-questions] ⚠️ Error obteniendo ítems para ${account.meli_nickname}:`, e);
            }
          }

          // Enriquecer preguntas con información del ítem
          const enrichedQuestions = (data.questions || []).map((q: any) => ({
            ...q,
            item_info: itemCache[q.item_id] || null,
          }));

          // Obtener tiempo de respuesta
          let responseTime = null;
          try {
            const rtResponse = await fetch(
              `https://api.mercadolibre.com/users/${account.meli_user_id}/questions/response_time`,
              {
                headers: { Authorization: `Bearer ${token}` },
                next: { revalidate: 0 },
              }
            );
            if (rtResponse.ok) {
              responseTime = await rtResponse.json();
            }
          } catch (e) {
            console.warn(`[meli-questions] ⚠️ No se pudo obtener tiempo de respuesta para ${account.meli_nickname}`);
          }

          return {
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: enrichedQuestions,
            total: data.total || data.paging?.total || 0,
            responseTime,
          };
        } catch (error) {
          console.error(`[meli-questions] ❌ Error para ${account.meli_nickname}:`, error);
          return {
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: [],
            total: 0,
            error: error instanceof Error ? error.message : "Error desconocido",
          };
        }
      })
    );

    const questions = results.map((result) =>
      result.status === "fulfilled" ? result.value : {
        accountId: "",
        nickname: "",
        sellerId: "",
        questions: [],
        total: 0,
        error: "Promise rejected",
      }
    );

    return NextResponse.json({ questions });
  } catch (error) {
    console.error("[meli-questions] Error inesperado:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
