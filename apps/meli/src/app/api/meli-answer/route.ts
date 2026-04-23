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
 * POST /api/meli-answer
 * 
 * Responde una pregunta de Mercado Libre
 * Mejorado con manejo UTF-8 y validación de cuenta
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: "Supabase no configurado" }, { status: 500 });
    }

    // Obtener datos de la solicitud
    const { questionId, text, accountId } = await request.json();

    if (!questionId || !text || !accountId) {
      return NextResponse.json({ 
        error: "Faltan datos requeridos (questionId, text, accountId)" 
      }, { status: 400 });
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

    // Obtener cuenta con todos los campos necesarios
    const { data: account, error: accountError } = await supabase
      .from("linked_meli_accounts")
      .select("id, user_id, meli_user_id, meli_nickname, access_token_enc, refresh_token_enc, token_expiry_date, is_active")
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
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 401 });
    }

    // Preparar texto con UTF-8 correcto
    const encodedText = Buffer.from(text, 'utf-8').toString();

    // Enviar respuesta a MeLi
    const response = await fetch("https://api.mercadolibre.com/answers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        question_id: parseInt(questionId, 10),
        text: encodedText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[meli-answer] Error de MeLi:", errorData);
      return NextResponse.json(
        { error: `Error MeLi: ${response.status}`, details: errorData },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      answer: data,
      message: "Respuesta enviada correctamente",
    });

  } catch (err: any) {
    console.error("[meli-answer] Error:", err);
    return NextResponse.json(
      { error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
