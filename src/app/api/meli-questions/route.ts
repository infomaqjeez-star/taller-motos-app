import { NextResponse } from "next/server";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  try {
    // Llamar a la Edge Function y esperar la respuesta — devuelve las preguntas directamente
    const res = await fetch(`${SUPA_URL}/functions/v1/appjeez-meli-unify-questions`, {
      headers: { Authorization: `Bearer ${ANON_KEY}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json({ error: `Edge Function error ${res.status}: ${body}` }, { status: 500 });
    }

    const syncResult = await res.json() as { status: string; questions?: unknown[]; error?: string };

    // Si la EF devuelve las preguntas directamente, reenviarlas
    if (Array.isArray(syncResult)) return NextResponse.json(syncResult);
    if (syncResult.questions) return NextResponse.json(syncResult.questions);

    // Si solo devuelve el resumen de sync, leer de Supabase
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const dbRes = await fetch(
      `${SUPA_URL}/rest/v1/meli_unified_questions?select=*,meli_accounts(nickname)&status=eq.UNANSWERED&order=date_created.desc`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey:         SERVICE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) return NextResponse.json([]);
    return NextResponse.json(await dbRes.json());

  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
