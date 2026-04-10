import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

let syncState = {
  isRunning: false,
  startedAt: null as string | null,
  lastSyncAt: null as string | null,
  progress: 0,
  message: "",
};

export async function POST() {
  syncState.isRunning = false;
  syncState.message = "Sincronizacion detenida por el usuario";
  return NextResponse.json({ success: true, message: "Sincronizacion detenida", stoppedAt: new Date().toISOString() });
}