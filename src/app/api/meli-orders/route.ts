import { NextResponse } from "next/server";
export async function GET() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/appjeez-meli-orders`, {
    headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}` },
  });
  if (!res.ok) return NextResponse.json({ error: `EF ${res.status}` }, { status: 500 });
  return NextResponse.json(await res.json());
}
