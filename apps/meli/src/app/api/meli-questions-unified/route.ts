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
      console.log(`[meli-questions-unified] [${accountName}] Intento ${attempt}/${maxRetries} - URL: ${url.substring(0, 80)}...`);
      
      const res = await fetch(url, options);
      
      // Log de respuesta
      console.log(`[meli-questions-unified] [${accountName}] Respuesta: ${res.status} ${res.statusText}`);
      
      // Si es 401, el token está expirado - no reintentar
      if (res.status === 401) {
        console.error(`[meli-questions-unified] [${accountName}] ❌ Token expirado (401)`);
        return res;
      }
      
      // Si es 403, no tiene permisos - no reintentar
      if (res.status === 403) {
        console.error(`[meli-questions-unified] [${accountName}] ❌ Sin permisos (403)`);
        return res;
      }
      
      // Si es 404, el recurso no existe - no reintentar
      if (res.status === 404) {
        console.error(`[meli-questions-unified] [${accountName}] ❌ Recurso no encontrado (404)`);
        return res;
      }
      
      // Si es 429 (rate limit), esperar más tiempo
      if (res.status === 429) {
        const waitTime = attempt * 2000; // 2, 4, 6 segundos
        console.log(`[meli-questions-unified] [${accountName}] ⚠️ Rate limit (429), esperando ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      
      // Si es 502, 503, esperar y reintentar
      if (res.status === 502 || res.status === 503) {
        const waitTime = attempt * 1000;
        console.log(`[meli-questions-unified] [${accountName}] ⚠️ Error ${res.status}, esperando ${waitTime}ms...`);
        await sleep(waitTime);
        continue;
      }
      
      // Para cualquier otro error 4xx/5xx, retornar la respuesta
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[meli-questions-unified] [${accountName}] ❌ Error ${res.status}: ${errorText.substring(0, 200)}`);
        return res;
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
  const startTime = Date.now();
  
  try {
    // Verificar que Supabase esté configurado
    if (!supabase) {
      console.error("[meli-questions-unified] ❌ Supabase no configurado");
      return NextResponse.json(
        { error: "Supabase no configurado", questions: [], accounts: [] },
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
      console.error("[meli-questions-unified] ❌ No autorizado - sin userId");
      return NextResponse.json({ error: "No autorizado", questions: [], accounts: [] }, { status: 401 });
    }

    console.log(`[meli-questions-unified] 👤 Usuario: ${userId}`);

    // Obtener cuentas del usuario
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      console.error("[meli-questions-unified] ❌ Error obteniendo cuentas:", accountsError);
      return NextResponse.json({ error: "Error obteniendo cuentas", questions: [], accounts: [] }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      console.log("[meli-questions-unified] ⚠️ No hay cuentas activas para el usuario");
      return NextResponse.json({ questions: [], accounts: [], message: "No hay cuentas conectadas" });
    }

    console.log(`[meli-questions-unified] 📊 Cuentas encontradas: ${accounts.length}`);
    accounts.forEach(acc => console.log(`  - ${acc.meli_nickname} (${acc.meli_user_id})`));

    // Obtener preguntas de cada cuenta con delay entre requests para evitar rate limit
    const results = [];
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      // Delay entre requests (500ms entre cada cuenta)
      if (i > 0) {
        await sleep(500);
      }
      
      try {
        // Obtener token válido
        const token = await getValidToken(account as any);
        
        if (!token) {
          console.log(`[meli-questions] ❌ No hay token válido para ${account.meli_nickname}`);
          results.push({
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: [],
            total: 0,
            error: "token_expired",
          });
          continue;
        }

        console.log(`[meli-questions] 🔑 Token obtenido para ${account.meli_nickname}`);

        // Llamar a API de MeLi con retry
        const response = await fetchWithRetry(
          `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&api_version=4&limit=50`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            next: { revalidate: 0 },
          },
          3,
          account.meli_nickname
        );

        if (!response) {
          console.error(`[meli-questions] ❌ Todos los intentos fallaron para ${account.meli_nickname}`);
          results.push({
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: [],
            total: 0,
            error: "max_retries_exceeded",
          });
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[meli-questions] ❌ Error API ${response.status} para ${account.meli_nickname}:`, errorText.substring(0, 200));
          results.push({
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: [],
            total: 0,
            error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
          });
          continue;
        }

        const data = await response.json();
        
        console.log(`[meli-questions] ✅ ${account.meli_nickname}: ${data.questions?.length || 0} preguntas (total reportado: ${data.total || data.paging?.total || 0})`);

        // Si hay preguntas, enriquecer con info de items
        let enrichedQuestions = data.questions || [];
        
        if (enrichedQuestions.length > 0) {
          const itemIds = [...new Set(enrichedQuestions.map((q: any) => q.item_id))];
          const itemCache: Record<string, any> = {};
          
          // Obtener detalles de ítems en lotes de 20
          for (let j = 0; j < itemIds.length; j += 20) {
            const batch = itemIds.slice(j, j + 20);
            try {
              const itemsResponse = await fetch(
                `https://api.mercadolibre.com/items?ids=${batch.join(',')}`,
                {
                  headers: { 
                    Authorization: `Bearer ${token}`,
                    Accept: "application/json",
                  },
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
          
          // Enriquecer preguntas
          enrichedQuestions = enrichedQuestions.map((q: any) => ({
            ...q,
            item_info: itemCache[q.item_id] || null,
          }));
        }

        // Obtener tiempo de respuesta (opcional)
        let responseTime = null;
        try {
          const rtResponse = await fetch(
            `https://api.mercadolibre.com/users/${account.meli_user_id}/questions/response_time`,
            {
              headers: { 
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
              },
              next: { revalidate: 0 },
            }
          );
          if (rtResponse.ok) {
            responseTime = await rtResponse.json();
          }
        } catch (e) {
          console.warn(`[meli-questions] ⚠️ No se pudo obtener tiempo de respuesta para ${account.meli_nickname}`);
        }

        results.push({
          accountId: account.id,
          nickname: account.meli_nickname,
          sellerId: account.meli_user_id,
          questions: enrichedQuestions,
          total: data.total || data.paging?.total || enrichedQuestions.length,
          responseTime,
        });

      } catch (err: any) {
        console.error(`[meli-questions] ❌ Error procesando cuenta ${account.meli_nickname}:`, err.message);
        results.push({
          accountId: account.id,
          nickname: account.meli_nickname,
          sellerId: account.meli_user_id,
          questions: [],
          total: 0,
          error: err.message,
        });
      }
    }

    const totalQuestions = results.reduce((sum, r) => sum + (r.questions?.length || 0), 0);
    const duration = Date.now() - startTime;
    
    console.log(`[meli-questions-unified] ✅ Completado en ${duration}ms - Total preguntas: ${totalQuestions}`);

    return NextResponse.json({ 
      questions: results,
      accounts: accounts.map(a => ({ 
        id: a.id, 
        nickname: a.meli_nickname,
        sellerId: a.meli_user_id,
      })),
      totalQuestions,
      duration,
    });

  } catch (err: any) {
    console.error("[meli-questions-unified] ❌ Error general:", err);
    return NextResponse.json(
      { error: err.message || "Error interno", questions: [], accounts: [] },
      { status: 500 }
    );
  }
}
