import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseServiceKey || "placeholder-key"
);

const MELI_APP_ID = process.env.APPJEEZ_MELI_APP_ID || "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";

/**
 * GET /api/auth/meli-connect
 * Genera la URL de OAuth de MeLi para que el usuario autorice la app.
 */
export async function GET(request: NextRequest) {
  try {
    if (!MELI_APP_ID) {
      return NextResponse.json(
        { error: "APPJEEZ_MELI_APP_ID no configurado" },
        { status: 500 }
      );
    }

    // Verificar usuario autenticado
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Construir la URL de callback
    const baseUrl = APP_URL || `https://${request.headers.get("host")}`;
    const callbackUrl = `${baseUrl}/api/auth/callback`;

    // Construir la URL de OAuth de MeLi
    // El state incluye el user_id para asociar la cuenta al completar el flujo
    const state = Buffer.from(JSON.stringify({ userId: user.id })).toString("base64url");

    const meliAuthUrl = new URL("https://auth.mercadolibre.com.ar/authorization");
    meliAuthUrl.searchParams.set("response_type", "code");
    meliAuthUrl.searchParams.set("client_id", MELI_APP_ID);
    meliAuthUrl.searchParams.set("redirect_uri", callbackUrl);
    meliAuthUrl.searchParams.set("state", state);
    // NOTA: Los scopes específicos (questions:read, etc.) deben configurarse en la app de MeLi
    // y no todos están disponibles. Por ahora no especificamos scopes para usar los default.

    return NextResponse.json({ url: meliAuthUrl.toString() });
  } catch (err) {
    console.error("[meli-connect] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
