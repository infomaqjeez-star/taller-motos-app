import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    version: "2fa-plain-password-fix-v1",
    timestamp: new Date().toISOString(),
  });
}
