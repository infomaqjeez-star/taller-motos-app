import { NextResponse } from "next/server";

const SUPA_URL    = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  // 1. Intentar sincronizar (fire & forget — no bloquea si falla)
  fetch(`${SUPA_URL}/functions/v1/appjeez-meli-unify-questions`, {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  }).catch(() => {});

  // 2. Leer de la tabla caché
  try {
    const res = await fetch(
      `${SUPA_URL}/rest/v1/meli_unified_questions?select=*,meli_accounts(nickname)&status=eq.UNANSWERED&order=date_created.desc`,
      {
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          apikey:         SERVICE_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    if (!res.ok) {
      const body = await res.text();
      // Si la tabla no existe todavía devolvemos array vacío en vez de 500
      if (res.status === 404 || body.includes("does not exist") || body.includes("relation")) {
        return NextResponse.json([]);
      }
      return NextResponse.json({ error: `Supabase ${res.status}: ${body}` }, { status: 500 });
    }

    return NextResponse.json(await res.json());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
