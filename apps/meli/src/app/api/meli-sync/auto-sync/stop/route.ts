import { NextResponse } from "next/server";

// Forzar renderizado din醡ico - evita error de generaci髇 est醫ica
export const dynamic = 'force-dynamic';

// Estado de sincronizaci贸n (compartido con el route principal)
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
 * Detiene la sincronizaci贸n autom谩tica.
 */
export async function POST() {
  syncState.isRunning = false;
  syncState.message = "Sincronizaci贸n detenida por el usuario";
  
  return NextResponse.json({
    success: true,
    message: "Sincronizaci贸n detenida",
    stoppedAt: new Date().toISOString(),
  });
}