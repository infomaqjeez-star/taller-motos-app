import { NextResponse, NextRequest } from "next/server";
import { getSupabase, getValidToken, MeliAccount } from "@/lib/meli";
import { saveToKnowledgeBase } from "@/lib/knowledgeBase";

export const dynamic  = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      question_id:       number;
      answer_text:       string;
      meli_account_id?:  string;
      meli_user_id?:     string;
      pregunta_original?: string; // Opcional: para guardar en knowledge_base
    };

    const { question_id, answer_text, meli_account_id, meli_user_id } = body;

    if (!question_id || !answer_text?.trim()) {
      return NextResponse.json({ error: "question_id y answer_text son requeridos" }, { status: 400 });
    }

    const supabase = getSupabase();

    let query = supabase.from("meli_accounts")
      .select("id, meli_user_id, nickname, access_token_enc, refresh_token_enc, expires_at, status")
      .eq("status", "active");
    if (meli_account_id) {
      query = query.eq("id", meli_account_id);
    } else if (meli_user_id) {
      query = query.eq("meli_user_id", meli_user_id);
    } else {
      return NextResponse.json({ error: "Se requiere meli_account_id o meli_user_id" }, { status: 400 });
    }

    const { data: accounts, error } = await query.limit(1);
    if (error || !accounts?.length) {
      return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    }

    const acc   = accounts[0] as MeliAccount;
    const token = await getValidToken(acc);
    if (!token) {
      return NextResponse.json({ error: "Token expirado, reconecta la cuenta" }, { status: 401 });
    }

    const meliRes = await fetch(`https://api.mercadolibre.com/answers`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ question_id, text: answer_text.trim() }),
      signal:  AbortSignal.timeout(15000),
    });

    const meliData = await meliRes.json() as Record<string, unknown>;

    if (!meliRes.ok) {
      const errMsg = (meliData?.message as string | undefined) ?? (meliData?.error as string | undefined) ?? `HTTP ${meliRes.status}`;
      return NextResponse.json({ status: "error", error: errMsg }, { status: 400 });
    }

    // ✅ Guardar respuesta exitosa en knowledge_base (histórico inteligente)
    if (body.pregunta_original) {
      await saveToKnowledgeBase(
        body.pregunta_original,
        answer_text,
        []
      );
    }

    return NextResponse.json({ status: "ok", message: "Pregunta respondida exitosamente", data: meliData });

  } catch (e) {
    return NextResponse.json({ status: "error", error: (e as Error).message }, { status: 500 });
  }
}
