import { NextResponse } from "next/server";

// Forzar renderizado din·mico - evita error de generaciÛn est·tica
export const dynamic = 'force-dynamic';

// Estado de sincronizaci√≥n (compartido con el route principal)
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
 * Reanuda la sincronizaci√≥n autom√°tica.
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