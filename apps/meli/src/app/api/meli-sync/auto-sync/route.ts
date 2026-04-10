import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Forzar renderizado din醡ico - evita error de generaci髇 est醫ica
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

// Estado de sincronizaci贸n en memoria (en producci贸n usar Redis)
let syncState = {
  isRunning: false,
  startedAt: null as string | null,
  lastSyncAt: null as string | null,
  progress: 0,
  message: "",
};

/**
 * GET /api/meli-sync/auto-sync
 * 
 * Obtiene el estado de la sincronizaci贸n autom谩tica.
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    isRunning: syncState.isRunning,
    startedAt: syncState.startedAt,
    lastSyncAt: syncState.lastSyncAt,
    progress: syncState.progress,
    message: syncState.message,
  });
}

/**
 * POST /api/meli-sync/auto-sync
 * 
 * Inicia la sincronizaci贸n autom谩tica.
 */
export async function POST(request: NextRequest) {
  try {
    if (syncState.isRunning) {
      return NextResponse.json(
        { error: "La sincronizaci贸n ya est谩 en curso" },
        { status: 409 }
      );
    }

    syncState.isRunning = true;
    syncState.startedAt = new Date().toISOString();
    syncState.progress = 0;
    syncState.message = "Iniciando sincronizaci贸n...";

    // Obtener el usuario actual
    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      syncState.isRunning = false;
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Simular progreso de sincronizaci贸n
    setTimeout(() => {
      syncState.progress = 25;
      syncState.message = "Sincronizando publicaciones...";
    }, 1000);

    setTimeout(() => {
      syncState.progress = 50;
      syncState.message = "Sincronizando 贸rdenes...";
    }, 2000);

    setTimeout(() => {
      syncState.progress = 75;
      syncState.message = "Sincronizando preguntas...";
    }, 3000);

    setTimeout(() => {
      syncState.progress = 100;
      syncState.message = "Sincronizaci贸n completada";
      syncState.isRunning = false;
      syncState.lastSyncAt = new Date().toISOString();
    }, 4000);

    return NextResponse.json({
      success: true,
      message: "Sincronizaci贸n iniciada",
      startedAt: syncState.startedAt,
    });
  } catch (error) {
    syncState.isRunning = false;
    console.error("[meli-sync/auto-sync] Error:", error);
    return NextResponse.json(
      { error: "Error al iniciar sincronizaci贸n" },
      { status: 500 }
    );
  }
}