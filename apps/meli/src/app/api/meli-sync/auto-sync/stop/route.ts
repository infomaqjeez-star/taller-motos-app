import { NextResponse } from "next/server";

// Forzar renderizado dinámico - evita error de generación estática
export const dynamic = 'force-dynamic';

// Estado de sincronizaciÃ³n (compartido con el route principal)
let syncState = {
  isRunning: false,
  startedAt: null as string | null,
  lastSyncAt: null as string | null,
  progress: 0,
  message: "",
};

/**
 * POST /api/meli-sync/auto-sync/stop
 * 
 * Detiene la sincronizaciÃ³n automÃ¡tica.
 */
export async function POST() {
  syncState.isRunning = false;
  syncState.message = "SincronizaciÃ³n detenida por el usuario";
  
  return NextResponse.json({
    success: true,
    message: "SincronizaciÃ³n detenida",
    stoppedAt: new Date().toISOString(),
  });
}