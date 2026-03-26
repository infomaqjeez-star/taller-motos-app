import { NextResponse, NextRequest } from "next/server";

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  const body = await req.json();

  const res = await fetch(`${SUPA_URL}/functions/v1/appjeez-meli-answer-question`, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.ok ? 200 : res.status });
}
