import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export const dynamic = 'force-dynamic';

// Delay helper
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase no configurado", questions: [], accounts: [] },
        { status: 500 }
      );
    }

    // Obtener usuario
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No autorizado", questions: [], accounts: [] }, { status: 401 });
    }

    // Obtener cuentas
    const { data: accounts, error: accountsError } = await supabase
      .from("linked_meli_accounts")
      .select("id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (accountsError) {
      return NextResponse.json({ error: "Error obteniendo cuentas", questions: [], accounts: [] }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ questions: [], accounts: [], message: "No hay cuentas conectadas" });
    }

    // Obtener preguntas de cada cuenta
    const results = [];
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      if (i > 0) await sleep(500); // Rate limiting
      
      try {
        // Decrypt token (simplified)
        const token = account.access_token_enc; // Asume que ya está desencriptado o usar función decrypt
        
        if (!token) {
          results.push({
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: [],
            total: 0,
            error: "No hay token válido",
          });
          continue;
        }

        // Llamar API MeLi
        const response = await fetch(
          `https://api.mercadolibre.com/questions/search?seller_id=${account.meli_user_id}&api_version=4&limit=50`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          results.push({
            accountId: account.id,
            nickname: account.meli_nickname,
            sellerId: account.meli_user_id,
            questions: [],
            total: 0,
            error: `HTTP ${response.status}`,
          });
          continue;
        }

        const data = await response.json();
        
        results.push({
          accountId: account.id,
          nickname: account.meli_nickname,
          sellerId: account.meli_user_id,
          questions: data.questions || [],
          total: data.total || data.paging?.total || data.questions?.length || 0,
        });

      } catch (err: any) {
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

    return NextResponse.json({ 
      questions: results,
      accounts: accounts.map(a => ({ 
        id: a.id, 
        nickname: a.meli_nickname,
        sellerId: a.meli_user_id,
      })),
      totalQuestions: results.reduce((sum, r) => sum + (r.questions?.length || 0), 0),
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Error interno", questions: [], accounts: [] },
      { status: 500 }
    );
  }
}
