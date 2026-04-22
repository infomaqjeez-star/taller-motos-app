import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// GET - Listar todas las cuentas vinculadas (para debug)
export async function GET() {
  try {
    // Validar variables de entorno en tiempo de ejecución
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: "Missing Supabase environment variables" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("linked_meli_accounts")
      .select("meli_nickname, meli_user_id, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: "Error obteniendo cuentas", details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      cuentas: data,
      count: data?.length || 0
    });
    
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
