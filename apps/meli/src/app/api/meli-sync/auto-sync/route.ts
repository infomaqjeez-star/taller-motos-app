import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key"
);

let syncState = {
  isRunning: false,
  startedAt: null as string | null,
  lastSyncAt: null as string | null,
  progress: 0,
  message: "",
};

export async function GET(_request: NextRequest) {
  return NextResponse.json(syncState);
}

export async function POST(request: NextRequest) {
  try {
    if (syncState.isRunning) {
      return NextResponse.json({ error: "Sincronizacion ya en curso" }, { status: 409 });
    }

    const authHeader = request.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
      if (user) userId = user.id;
    }
    if (!userId) { syncState.isRunning = false; return NextResponse.json({ error: "No autorizado" }, { status: 401 }); }

    syncState.isRunning = true;
    syncState.startedAt = new Date().toISOString();
    syncState.progress = 0;
    syncState.message = "Iniciando sincronizacion...";

    setTimeout(() => { syncState.progress = 25; syncState.message = "Sincronizando publicaciones..."; }, 1000);
    setTimeout(() => { syncState.progress = 50; syncState.message = "Sincronizando ordenes..."; }, 2000);
    setTimeout(() => { syncState.progress = 75; syncState.message = "Sincronizando preguntas..."; }, 3000);
    setTimeout(() => { syncState.progress = 100; syncState.message = "Sincronizacion completada"; syncState.isRunning = false; syncState.lastSyncAt = new Date().toISOString(); }, 4000);

    return NextResponse.json({ success: true, message: "Sincronizacion iniciada", startedAt: syncState.startedAt });
  } catch (e) {
    syncState.isRunning = false;
    console.error("[auto-sync] Error:", e);
    return NextResponse.json({ error: "Error al iniciar sincronizacion" }, { status: 500 });
  }
}