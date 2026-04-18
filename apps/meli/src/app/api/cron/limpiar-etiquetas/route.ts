import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Este endpoint se ejecuta automáticamente cada día a las 00:00
// Configurar en Railway: Settings → Cron Jobs
export async function GET() {
  try {
    const { error, count } = await supabase
      .from("etiquetas_historial")
      .delete()
      .lt("fecha_creacion", new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString())
      .select("count");

    if (error) {
      console.error("Error limpiando etiquetas antiguas:", error);
      return NextResponse.json(
        { error: "Error limpiando registros antiguos" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: `Se eliminaron ${count || 0} registros antiguos`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("Error en cronjob de limpieza:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
