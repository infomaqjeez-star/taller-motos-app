import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// GET - Listar todas las cuentas vinculadas (para debug)
export async function GET() {
  try {
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
