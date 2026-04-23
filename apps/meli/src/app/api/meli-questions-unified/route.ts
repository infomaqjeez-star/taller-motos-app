import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getValidToken } from "@/lib/meli";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Delay helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función para obtener preguntas de una cuenta con retry
async function fetchQuestionsWithRetry(
  account: any,
  maxRetries = 3
): Promise<{ questions: any[]; total: number; error?: string }> {
  const nickname = account.meli_nickname;
  const sellerId = account.meli_user_id;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[QuestionsAPI] [${nickname}] Intento ${attempt}/${maxRetries}`);
      
      // Obtener token válido (con refresh automático si es necesario)
      const token = await getValidToken(account);
      
      if (!token) {
        console.error(`[QuestionsAPI] [${nickname}] ❌ No se pudo obtener token válido`);
        return { questions: [], total: 0, error: "Token inválido o expirado" };
      }
      
      console.log(`[QuestionsAPI] [${nickname}] ✅ Token obtenido`);
      
      // Llamar a API de MeLi
      const response = await fetch(
        `https://api.mercadolibre.com/questions/search?seller_id=${sellerId}&api_version=4&limit=50`,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );
      
      // Manejar errores específicos
      if (response.status === 401) {
        console.error(`[QuestionsAPI] [${nickname}] ❌ Token expirado (401)`);
        if (attempt < maxRetries) {
          await sleep(1000 * attempt);
          continue;
        }
        return { questions: [], total: 0, error: "Token expirado" };
      }
      
      if (response.status === 403) {
        console.error(`[QuestionsAPI] [${nickname}] ❌ Sin permisos (403)`);
        return { questions: [], total: 0, error: "Sin permisos para acceder a preguntas" };
      }
      
      if (response.status === 429) {
        console.warn(`[QuestionsAPI] [${nickname}] ⚠️ Rate limit (429)`);
        if (attempt < maxRetries) {
          await sleep(2000 * attempt);
          continue;
        }
        return { questions: [], total: 0, error: "Rate limit excedido" };
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[QuestionsAPI] [${nickname}] ❌ Error ${response.status}:`, errorText.substring(0, 200));
        if (attempt < maxRetries) {
          await sleep(1000 * attempt);
          continue;
        }
        return { questions: [], total: 0, error: `HTTP ${response.status}` };
      }
      
      const data = await response.json();
      
      console.log(`[QuestionsAPI] [${nickname}] ✅ ${data.questions?.length || 0} preguntas obtenidas`);
      
      return {
        questions: data.questions || [],
        total: data.total || data.paging?.total || data.questions?.length || 0,
      };
      
    } catch (err: any) {
      console.error(`[QuestionsAPI] [${nickname}] ❌ Error intento ${attempt}:`, err.message);
      if (attempt < maxRetries) {
        await sleep(1000 * attempt);
      } else {
        return { questions: [], total: 0, error: err.message };
      }
    }
  }
  
  return { questions: [], total: 0, error: "Máximo de reintentos alcanzado" };
}

// Función para obtener response time de una cuenta
async function fetchResponseTime(account: any): Promise<any | null> {
  try {
    const token = await getValidToken(account);
    if (!token) return null;
    
    const res = await fetch(
      `https://api.mercadolibre.com/users/${account.meli_user_id}/questions/response_time`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    if (!res.ok) {
      console.log(`[QuestionsAPI] [${account.meli_nickname}] Response time: HTTP ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    console.log(`[QuestionsAPI] [${account.meli_nickname}] Response time: ${data?.total?.response_time ?? 'N/A'} min`);
    return data;
  } catch (err) {
    console.warn(`[QuestionsAPI] [${account.meli_nickname}] Error response time:`, err);
    return null;
  }
}

/**
 * GET /api/meli-questions-unified
 * 
 * Obtiene preguntas de todas las cuentas de Mercado Libre del usuario
 * con manejo robusto de errores y reintentos
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  console.log("[QuestionsAPI] 🚀 Iniciando solicitud de preguntas unificadas");
  
  try {
    // Verificar Supabase
    if (!supabase) {
      console.error("[QuestionsAPI] ❌ Supabase no configurado");
      return NextResponse.json(
        { error: "Supabase no configurado", questions: [], accounts: [] },
        { status: 500 }
      );
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
      console.error("[QuestionsAPI] ❌ Usuario no autorizado");
      return NextResponse.json(
        { error: "No autorizado", questions: [], accounts: [] },
        { status: 401 }
      );
    }

    console.log(`[QuestionsAPI] 👤 Usuario: ${userId}`);

    // Obtener cuentas activas
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      console.error("[QuestionsAPI] ❌ Error obteniendo cuentas:", accountsError);
      return NextResponse.json(
        { error: "Error obteniendo cuentas", questions: [], accounts: [] },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      console.log("[QuestionsAPI] ⚠️ No hay cuentas activas");
      return NextResponse.json({
        questions: [],
        accounts: [],
        message: "No hay cuentas conectadas",
      });
    }

    console.log(`[QuestionsAPI] 📊 ${accounts.length} cuentas encontradas:`);
    accounts.forEach(acc => console.log(`  - ${acc.meli_nickname} (${acc.meli_user_id})`));

    // Obtener preguntas de cada cuenta con timeout por cuenta
    const results: any[] = [];
    let totalQuestions = 0;
    
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      // Rate limiting entre cuentas (300ms para ser más rápido)
      if (i > 0) {
        await sleep(300);
      }
      
      // Timeout por cuenta (10 segundos)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      try {
        const result = await Promise.race([
          fetchQuestionsWithRetry(account),
          timeoutPromise
        ]) as any;
        
        results.push({
          accountId: account.id,
          nickname: account.meli_nickname,
          sellerId: account.meli_user_id,
          questions: result.questions,
          total: result.total,
          error: result.error,
          responseTime: null, // Se obtiene después de forma asíncrona
        });
        
        totalQuestions += result.questions.length;
      } catch (err: any) {
        console.error(`[QuestionsAPI] [${account.meli_nickname}] Timeout o error:`, err.message);
        results.push({
          accountId: account.id,
          nickname: account.meli_nickname,
          sellerId: account.meli_user_id,
          questions: [],
          total: 0,
          error: err.message || "Timeout",
          responseTime: null,
        });
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`[QuestionsAPI] ✅ Preguntas completadas en ${duration}ms - Total: ${totalQuestions}`);

    // Obtener response times en paralelo (no bloquea si falla)
    console.log(`[QuestionsAPI] 📊 Obteniendo tiempos de respuesta...`);
    const responseTimePromises = accounts.map(account => fetchResponseTime(account));
    const responseTimes = await Promise.all(responseTimePromises);
    
    // Asignar response times a los resultados
    for (let i = 0; i < results.length; i++) {
      const accountIndex = accounts.findIndex(a => a.id === results[i].accountId);
      if (accountIndex >= 0 && responseTimes[accountIndex]) {
        results[i].responseTime = responseTimes[accountIndex];
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[QuestionsAPI] ✅ Todo completado en ${totalDuration}ms`);

    return NextResponse.json({
      questions: results,
      accounts: accounts.map(a => ({
        id: a.id,
        nickname: a.meli_nickname,
        sellerId: a.meli_user_id,
      })),
      totalQuestions,
      duration,
      timestamp: new Date().toISOString(),
    });

  } catch (err: any) {
    console.error("[QuestionsAPI] ❌ Error general:", err);
    return NextResponse.json(
      { error: err.message || "Error interno del servidor", questions: [], accounts: [] },
      { status: 500 }
    );
  }
}
