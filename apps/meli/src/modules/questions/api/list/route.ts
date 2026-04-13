// modules/questions/api/list/route.ts
// Endpoint para listar preguntas del buzón unificado

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Auth
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authHeader.slice(7));
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "UNANSWERED";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Obtener preguntas del usuario
    const { data: questions, error } = await supabase
      .from("unified_questions")
      .select(`
        *,
        meli_accounts:meli_user_id(meli_nickname)
      `)
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[questions/list] Error:", error);
      return NextResponse.json(
        { error: "Error obteniendo preguntas" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: questions || [],
      count: questions?.length || 0,
    });

  } catch (error) {
    console.error("[questions/list] Error fatal:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
