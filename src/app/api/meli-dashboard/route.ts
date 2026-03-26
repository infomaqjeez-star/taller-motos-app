import { NextResponse } from "next/server";

export async function GET() {
  const SUPA_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON_KEY  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!SUPA_URL || !ANON_KEY) {
    return NextResponse.json({ error: "Missing Supabase config" }, { status: 500 });
  }

  const fnUrl = `${SUPA_URL}/functions/v1/appjeez-meli-data`;

  const res = await fetch(fnUrl, {
    headers: {
      "Authorization": `Bearer ${ANON_KEY}`,
      "Content-Type":  "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Edge Function error: ${res.status} - ${body}` }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}
