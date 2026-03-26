import { NextResponse } from "next/server";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function GET() {
  // Primero sincroniza, luego devuelve las preguntas
  await fetch(`${SUPA_URL}/functions/v1/appjeez-meli-unify-questions`, {
    headers: { Authorization: `Bearer ${ANON_KEY}` },
  }).catch(() => {});

  const res = await fetch(
    `${SUPA_URL}/rest/v1/meli_unified_questions?select=*,meli_accounts(nickname)&status=eq.UNANSWERED&order=date_created.desc`,
    {
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        apikey:         process.env.SUPABASE_SERVICE_ROLE_KEY!,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) return NextResponse.json({ error: `Supabase ${res.status}` }, { status: 500 });
  return NextResponse.json(await res.json());
}
