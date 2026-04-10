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
 * POST /api/meli-sync/auto-sync/stop
 * 
 * Detiene la sincronización automática.
 */
export async function POST() {
  syncState.isRunning = false;
  syncState.message = "Sincronización detenida por el usuario";
  
  return NextResponse.json({
    success: true,
    message: "Sincronización detenida",
    stoppedAt: new Date().toISOString(),
  });
}
