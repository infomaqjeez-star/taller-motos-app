import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

let syncState = {
  isRunning: false,
  startedAt: null as string | null,
  lastSyncAt: null as string | null,
  progress: 0,
  message: "",
};

export async function GET() {
  return NextResponse.json({ ...syncState, resumed: true });
}