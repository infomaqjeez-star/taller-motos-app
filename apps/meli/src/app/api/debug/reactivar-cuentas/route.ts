import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Reactivar todas las cuentas que fueron desactivadas por error
    const { data, error } = await supabase
      .from("linked_meli_accounts")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("is_active", false)
      .select("id, meli_nickname");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "Cuentas reactivadas", 
      count: data?.length || 0,
      accounts: data 
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
