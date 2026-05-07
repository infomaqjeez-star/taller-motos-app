import { NextResponse } from "next/server";

// Estado de sincronización (compartido con el route principal)
let syncState = {
  isRunning: false,
  startedAt: null as string | null,
  lastSyncAt: null as string | null,
  progress: 0,
  message: "",
};

/**
 * GET /api/meli-sync/auto-sync/resume
 * 
 * Reanuda la sincronización automática.
 */
export async function GET() {
  return NextResponse.json({
    isRunning: syncState.isRunning,
    startedAt: syncState.startedAt,
    lastSyncAt: syncState.lastSyncAt,
    progress: syncState.progress,
    message: syncState.message,
    resumed: true,
  });
}
